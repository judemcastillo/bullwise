import { MARKET_NEWS_CATEGORIES } from "@/lib/email/communication-policy";
import type {
	InAppNewsPreference,
	NotificationArticle,
} from "@/types/notifications";

export const DEFAULT_IN_APP_NEWS: InAppNewsPreference = {
	frequency: "daily",
	categories: ["general_market", "watchlist_news"],
};
export class NotificationInputError extends Error {}
export function objectId(value: unknown): string {
	if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value))
		throw new NotificationInputError("Invalid notification ID.");
	return value;
}
export function parsePreference(value: unknown): InAppNewsPreference {
	const input = value as Partial<InAppNewsPreference> | null;
	if (
		!input ||
		!["off", "daily", "weekly"].includes(input.frequency ?? "") ||
		!Array.isArray(input.categories) ||
		input.categories.length > 4 ||
		input.categories.some((c) => !MARKET_NEWS_CATEGORIES.includes(c)) ||
		new Set(input.categories).size !== input.categories.length ||
		(input.frequency !== "off" && !input.categories.length)
	) {
		throw new NotificationInputError(
			"Choose a frequency and at least one news category.",
		);
	}
	return { frequency: input.frequency!, categories: [...input.categories] };
}
export function internalDestination(value: unknown): string | null {
	if (value == null || value === "") return null;
	if (
		typeof value !== "string" ||
		value.length > 1000 ||
		!value.startsWith("/") ||
		value.startsWith("//") ||
		/[\\\s\x00-\x1f]/.test(value)
	) {
		throw new NotificationInputError("Use a local path for the destination.");
	}
	return value;
}
export function encodeCursor(item: {
	createdAt: Date;
	_id: { toString(): string };
}) {
	return Buffer.from(`${item.createdAt.toISOString()}|${item._id}`).toString(
		"base64url",
	);
}
export function decodeCursor(value?: string | null) {
	if (!value) return null;
	if (value.length > 200 || !/^[\w-]+$/.test(value))
		throw new NotificationInputError("Invalid page cursor.");
	const [date, id, extra] = Buffer.from(value, "base64url")
		.toString()
		.split("|");
	if (extra !== undefined || !date || !Number.isFinite(Date.parse(date)))
		throw new NotificationInputError("Invalid page cursor.");
	return { createdAt: new Date(date), id: objectId(id) };
}
export function safeArticles(
	articles: NotificationArticle[],
): NotificationArticle[] {
	const seen = new Set<string>();
	return articles
		.filter((article) => {
			try {
				const url = new URL(article.url);
				if (
					!["https:", "http:"].includes(url.protocol) ||
					!article.headline.trim() ||
					seen.has(url.href)
				)
					return false;
				seen.add(url.href);
				return true;
			} catch {
				return false;
			}
		})
		.slice(0, 6)
		.map((a) => ({
			headline: a.headline.slice(0, 500),
			url: a.url,
			source: a.source.slice(0, 200),
		}));
}
export function parseAnnouncement(value: unknown) {
	const input = value as Record<string, unknown>;
	if (
		!input ||
		typeof input.key !== "string" ||
		!/^[\w.-]{1,100}$/.test(input.key) ||
		typeof input.title !== "string" ||
		!input.title.trim() ||
		input.title.length > 160 ||
		typeof input.body !== "string" ||
		!input.body.trim() ||
		input.body.length > 10000
	) {
		throw new NotificationInputError(
			"Provide a stable key, title (1–160 characters), and body (1–10000 characters).",
		);
	}
	return {
		key: input.key,
		title: input.title.trim(),
		body: input.body.trim(),
		destination: internalDestination(input.destination),
	};
}
