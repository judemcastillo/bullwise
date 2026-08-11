import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = "v1";
const TOKEN_PURPOSE = "unsubscribe";
const TOKEN_STREAM = "market_news";
const TOKEN_LIFETIME_MONTHS = 24;
const TOKEN_SEPARATOR = ".";
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;
const MAX_KEY_ID_LENGTH = 64;
const MAX_TOKEN_LENGTH = 2_048;
const MAX_USER_ID_BYTES = 256;
const MIN_SIGNING_SECRET_BYTES = 32;
const FALLBACK_KEY_ID = "default";
const KEY_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

type UnsubscribeTokenPayload = {
	sub: string;
	purpose: typeof TOKEN_PURPOSE;
	stream: typeof TOKEN_STREAM;
	iat: number;
	exp: number;
};

type SigningKeyring = {
	activeKeyId: string;
	keys: Map<string, string>;
};

type TokenTimeOptions = {
	now?: Date;
};

const isValidKeyId = (keyId: string) =>
	keyId.length > 0 &&
	keyId.length <= MAX_KEY_ID_LENGTH &&
	KEY_ID_PATTERN.test(keyId);

const assertSigningSecret = (secret: string, keyId: string) => {
	if (Buffer.byteLength(secret, "utf8") < MIN_SIGNING_SECRET_BYTES) {
		throw new Error(
			`Unsubscribe signing key ${keyId} must contain at least ${MIN_SIGNING_SECRET_BYTES} bytes`,
		);
	}
};

const getSigningKeyring = (): SigningKeyring => {
	const activeKeyId = process.env.EMAIL_UNSUBSCRIBE_ACTIVE_KEY_ID?.trim();
	const serializedKeys = process.env.EMAIL_UNSUBSCRIBE_KEYS?.trim();

	if (activeKeyId || serializedKeys) {
		if (!activeKeyId || !serializedKeys) {
			throw new Error(
				"EMAIL_UNSUBSCRIBE_ACTIVE_KEY_ID and EMAIL_UNSUBSCRIBE_KEYS must be configured together",
			);
		}
		if (!isValidKeyId(activeKeyId)) {
			throw new Error("EMAIL_UNSUBSCRIBE_ACTIVE_KEY_ID is invalid");
		}

		let parsedKeys: unknown;
		try {
			parsedKeys = JSON.parse(serializedKeys);
		} catch {
			throw new Error("EMAIL_UNSUBSCRIBE_KEYS must be a JSON object");
		}

		if (
			typeof parsedKeys !== "object" ||
			parsedKeys === null ||
			Array.isArray(parsedKeys)
		) {
			throw new Error("EMAIL_UNSUBSCRIBE_KEYS must be a JSON object");
		}

		const keys = new Map<string, string>();
		for (const [keyId, secretValue] of Object.entries(parsedKeys)) {
			if (!isValidKeyId(keyId) || typeof secretValue !== "string") {
				throw new Error("EMAIL_UNSUBSCRIBE_KEYS contains an invalid signing key");
			}

			const secret = secretValue.trim();
			assertSigningSecret(secret, keyId);
			keys.set(keyId, secret);
		}

		if (!keys.has(activeKeyId)) {
			throw new Error(
				"EMAIL_UNSUBSCRIBE_ACTIVE_KEY_ID is not present in EMAIL_UNSUBSCRIBE_KEYS",
			);
		}

		return { activeKeyId, keys };
	}

	const fallbackSecret =
		process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim() ??
		process.env.BETTER_AUTH_SECRET?.trim();
	if (!fallbackSecret) {
		throw new Error(
			"Configure the unsubscribe signing keyring, EMAIL_UNSUBSCRIBE_SECRET, or BETTER_AUTH_SECRET",
		);
	}

	assertSigningSecret(fallbackSecret, FALLBACK_KEY_ID);
	return {
		activeKeyId: FALLBACK_KEY_ID,
		keys: new Map([[FALLBACK_KEY_ID, fallbackSecret]]),
	};
};

const addUtcMonths = (date: Date, months: number) => {
	const result = new Date(
		Date.UTC(
			date.getUTCFullYear(),
			date.getUTCMonth() + months,
			1,
			date.getUTCHours(),
			date.getUTCMinutes(),
			date.getUTCSeconds(),
		),
	);
	const lastDayOfTargetMonth = new Date(
		Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
	).getUTCDate();
	result.setUTCDate(Math.min(date.getUTCDate(), lastDayOfTargetMonth));
	return result;
};

const getUnixTime = (date: Date) => {
	const timestamp = date.getTime();
	if (!Number.isFinite(timestamp)) throw new Error("Token time must be valid");
	return Math.floor(timestamp / 1_000);
};

const encodePayload = (payload: UnsubscribeTokenPayload) =>
	Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

const signToken = ({
	version,
	keyId,
	payload,
	secret,
}: {
	version: string;
	keyId: string;
	payload: string;
	secret: string;
}) =>
	createHmac("sha256", secret)
		.update(`${version}${TOKEN_SEPARATOR}${keyId}${TOKEN_SEPARATOR}${payload}`)
		.digest("base64url");

const isTokenPayload = (value: unknown): value is UnsubscribeTokenPayload => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}

	const payload = value as Partial<UnsubscribeTokenPayload>;
	return (
		typeof payload.sub === "string" &&
		payload.purpose === TOKEN_PURPOSE &&
		payload.stream === TOKEN_STREAM &&
		Number.isSafeInteger(payload.iat) &&
		Number.isSafeInteger(payload.exp)
	);
};

const isValidUserId = (userId: string) => {
	const byteLength = Buffer.byteLength(userId, "utf8");
	return userId === userId.trim() && byteLength > 0 && byteLength <= MAX_USER_ID_BYTES;
};

export const createDailyNewsUnsubscribeToken = (
	userId: string,
	{ now = new Date() }: TokenTimeOptions = {},
) => {
	const normalizedUserId = userId.trim();
	if (!isValidUserId(normalizedUserId)) {
		throw new Error("Cannot create an unsubscribe token for this user ID");
	}

	const issuedAt = getUnixTime(now);
	const expiresAt = getUnixTime(
		addUtcMonths(new Date(issuedAt * 1_000), TOKEN_LIFETIME_MONTHS),
	);
	const payload = encodePayload({
		sub: normalizedUserId,
		purpose: TOKEN_PURPOSE,
		stream: TOKEN_STREAM,
		iat: issuedAt,
		exp: expiresAt,
	});
	const { activeKeyId, keys } = getSigningKeyring();
	const secret = keys.get(activeKeyId);
	if (!secret) throw new Error("The active unsubscribe signing key is unavailable");

	const signature = signToken({
		version: TOKEN_VERSION,
		keyId: activeKeyId,
		payload,
		secret,
	});
	return [TOKEN_VERSION, activeKeyId, payload, signature].join(TOKEN_SEPARATOR);
};

export const verifyDailyNewsUnsubscribeToken = (
	token: string,
	{ now = new Date() }: TokenTimeOptions = {},
): string | null => {
	if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;

	const [version, keyId, encodedPayload, providedSignature, ...extraParts] =
		token.split(TOKEN_SEPARATOR);
	if (
		extraParts.length > 0 ||
		version !== TOKEN_VERSION ||
		!keyId ||
		!isValidKeyId(keyId) ||
		!encodedPayload ||
		!providedSignature
	) {
		return null;
	}

	const secret = getSigningKeyring().keys.get(keyId);
	if (!secret) return null;

	const expectedSignature = signToken({
		version,
		keyId,
		payload: encodedPayload,
		secret,
	});
	const providedBuffer = Buffer.from(providedSignature, "utf8");
	const expectedBuffer = Buffer.from(expectedSignature, "utf8");
	if (
		providedBuffer.length !== expectedBuffer.length ||
		!timingSafeEqual(providedBuffer, expectedBuffer)
	) {
		return null;
	}

	try {
		const payloadBuffer = Buffer.from(encodedPayload, "base64url");
		if (payloadBuffer.toString("base64url") !== encodedPayload) return null;

		const payload: unknown = JSON.parse(payloadBuffer.toString("utf8"));
		if (!isTokenPayload(payload) || !isValidUserId(payload.sub)) return null;

		const nowSeconds = getUnixTime(now);
		const expectedExpiration = getUnixTime(
			addUtcMonths(new Date(payload.iat * 1_000), TOKEN_LIFETIME_MONTHS),
		);
		if (
			payload.iat > nowSeconds + MAX_CLOCK_SKEW_SECONDS ||
			payload.exp !== expectedExpiration ||
			nowSeconds >= payload.exp
		) {
			return null;
		}

		return payload.sub;
	} catch {
		return null;
	}
};

const getApplicationBaseUrl = () => {
	const baseUrl =
		process.env.NEXT_PUBLIC_BASE_URL ?? process.env.BETTER_AUTH_URL;
	if (!baseUrl) throw new Error("The Bull Wise application URL is not configured");

	return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
};

export const createDailyNewsUnsubscribeUrls = (
	userId: string,
	options: TokenTimeOptions = {},
) => {
	const token = createDailyNewsUnsubscribeToken(userId, options);
	const applicationBaseUrl = getApplicationBaseUrl();
	const confirmationUrl = new URL("unsubscribe", applicationBaseUrl);
	confirmationUrl.searchParams.set("token", token);
	const oneClickUrl = new URL("api/email/unsubscribe", applicationBaseUrl);
	oneClickUrl.searchParams.set("token", token);

	return {
		confirmationUrl: confirmationUrl.toString(),
		oneClickUrl: oneClickUrl.toString(),
		dashboardUrl: new URL(applicationBaseUrl).toString(),
	};
};
