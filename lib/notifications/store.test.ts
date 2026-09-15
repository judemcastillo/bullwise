import assert from "node:assert/strict";
import { before, after, beforeEach, describe, it, mock } from "node:test";
import mongoose, { Types } from "mongoose";
import Notification, {
	type NotificationRecord,
} from "@/database/models/notification.model";

// Exercise the production data-access functions against an isolated model adapter.
// No market providers or application database are contacted.
type Row = NotificationRecord & { _id: Types.ObjectId };
type Filter = Record<string, unknown>;
let store: typeof import("./store");
let rows: Row[] = [];
const timestamp = new Date("2026-09-15T12:00:00Z");
function row(userId: string, index: number, createdAt = timestamp): Row {
	return {
		_id: new Types.ObjectId(index.toString(16).padStart(24, "0")),
		userId,
		sourceKey: `test:${index}`,
		type: "announcement",
		title: `Item ${index}`,
		body: "",
		articles: [],
		destination: null,
		createdAt,
		readAt: null,
	};
}
function compare(a: unknown, b: unknown) {
	return a instanceof Date && b instanceof Date
		? a.getTime() - b.getTime()
		: String(a).localeCompare(String(b));
}
function matches(row: Row, filter: Filter): boolean {
	return Object.entries(filter).every(([key, expected]) => {
		if (key === "$or")
			return (expected as Filter[]).some((f) => matches(row, f));
		const actual = row[key as keyof Row];
		if (
			expected &&
			typeof expected === "object" &&
			!(expected instanceof Date) &&
			!(expected instanceof Types.ObjectId)
		)
			return Object.entries(expected).every(([op, value]) =>
				op === "$lt"
					? compare(actual, value) < 0
					: op === "$lte"
						? compare(actual, value) <= 0
						: false,
			);
		return expected === null ? actual == null : compare(actual, expected) === 0;
	});
}
const previousUri = process.env.MONGODB_URI;
const previousCache = global.mongooseCache;
before(async () => {
	process.env.MONGODB_URI = "mongodb://unused.invalid/notification-tests";
	global.mongooseCache = { conn: mongoose, promise: null };
	store = await import("./store");
	mock.method(Notification, "find", (filter: Filter) => {
		let selected = rows.filter((r) => matches(r, filter));
		const query = {
			sort() {
				selected.sort(
					(a, b) => compare(b.createdAt, a.createdAt) || compare(b._id, a._id),
				);
				return query;
			},
			limit(n: number) {
				selected = selected.slice(0, n);
				return query;
			},
			async lean() {
				return selected;
			},
		};
		return query;
	});
	mock.method(Notification, "findOne", (filter: Filter) => ({
		lean: async () => rows.find((r) => matches(r, filter)) ?? null,
	}));
	mock.method(
		Notification,
		"countDocuments",
		async (filter: Filter) => rows.filter((r) => matches(r, filter)).length,
	);
	mock.method(
		Notification,
		"updateOne",
		async (
			filter: Filter,
			update: { $set?: Partial<Row>; $setOnInsert?: Row },
			options?: { upsert?: boolean },
		) => {
			const existing = rows.find((r) => matches(r, filter));
			if (existing && update.$set) Object.assign(existing, update.$set);
			else if (!existing && options?.upsert)
				rows.push({ ...update.$setOnInsert!, _id: new Types.ObjectId() });
		},
	);
	mock.method(
		Notification,
		"updateMany",
		async (filter: Filter, update: { $set: Partial<Row> }) => {
			rows
				.filter((r) => matches(r, filter))
				.forEach((r) => Object.assign(r, update.$set));
		},
	);
});
after(() => {
	mock.restoreAll();
	global.mongooseCache = previousCache;
	if (previousUri === undefined) delete process.env.MONGODB_URI;
	else process.env.MONGODB_URI = previousUri;
});
beforeEach(() => {
	rows = [];
});
describe("notification persistence behavior", () => {
	it("isolates list, detail, unread count and read mutations by recipient", async () => {
		rows = [row("alice", 1), row("bob", 2)];
		assert.equal((await store.listNotifications("alice")).items.length, 1);
		assert.equal(
			await store.notificationDetail("alice", rows[1]._id.toString()),
			null,
		);
		assert.equal(
			await store.markNotificationRead("alice", rows[1]._id.toString()),
			null,
		);
		await store.markAllNotificationsRead("alice", timestamp);
		assert.equal(await store.unreadCount("alice"), 0);
		assert.equal(await store.unreadCount("bob"), 1);
	});
	it("paginates equal timestamps without duplicate or missing items", async () => {
		rows = Array.from({ length: 45 }, (_, i) => row("alice", i + 1));
		const first = await store.listNotifications("alice");
		assert.equal(first.items.length, 20);
		assert.ok(first.nextCursor);
		rows.push(row("alice", 46, new Date(timestamp.getTime() + 1)));
		const second = await store.listNotifications("alice", first.nextCursor);
		const third = await store.listNotifications("alice", second.nextCursor);
		const ids = [...first.items, ...second.items, ...third.items].map(
			(i) => i.id,
		);
		assert.equal(new Set(ids).size, 45);
		assert.equal(third.nextCursor, null);
	});
	it("preserves notifications arriving after mark-all request cutoff", async () => {
		rows = [
			row("alice", 1),
			row("alice", 2, new Date(timestamp.getTime() + 1)),
		];
		await store.markAllNotificationsRead("alice", timestamp);
		assert.ok(rows[0].readAt);
		assert.equal(rows[1].readAt, null);
	});
	it("deduplicates source retries and retains the original read state", async () => {
		const input = row("alice", 1);
		await store.createNotification(input);
		await store.markNotificationRead(
			"alice",
			rows[0]._id.toString(),
			timestamp,
		);
		await store.createNotification({ ...input, title: "Retry content" });
		assert.equal(rows.length, 1);
		assert.equal(rows[0].title, "Item 1");
		assert.deepEqual(rows[0].readAt, timestamp);
	});
	it("serializes dates and IDs for client consumers", async () => {
		rows = [row("alice", 1)];
		const item = await store.notificationDetail(
			"alice",
			rows[0]._id.toString(),
		);
		assert.equal(item?.createdAt, timestamp.toISOString());
		assert.equal(typeof item?.id, "string");
		assert.equal(item?.readAt, null);
	});
});

describe("recipient candidate pagination", () => {
	it("fills pages across empty batches and resumes without omissions", async () => {
		const { default: UserProfile } = await import("@/database/models/user-profile.model");
		const { eligibleRecipientPage, filledEligibleRecipientPage } = await import("./recipients");
		const candidates = Array.from({ length: 351 }, (_, i) => ({
			userId: (i + 1).toString(16).padStart(24, "0"),
			identity: i >= 200 && i % 2 === 0 ? [{ _id: new Types.ObjectId() }] : [],
		}));
		const originalDb = mongoose.connection.db;
		Object.assign(mongoose.connection, { db: {} });
		const session = {} as mongoose.ClientSession;
		const aggregate = mock.method(UserProfile, "aggregate", (pipeline: mongoose.PipelineStage[]) => {
			const match = pipeline[0] as mongoose.PipelineStage.Match;
			assert.deepEqual(match.$match.onboardingCompletedAt, { $type: "date", $lte: timestamp });
			const limit = (pipeline[2] as mongoose.PipelineStage.Limit).$limit;
			assert.ok(limit > 0 && limit <= 100);
			const lookup = pipeline.find((stage) => "$lookup" in stage) as mongoose.PipelineStage.Lookup;
			assert.equal(lookup.$lookup.localField, "identityId");
			assert.equal(lookup.$lookup.foreignField, "_id");
			assert.ok(pipeline.indexOf(lookup) > 2);
			return { session: (actual: mongoose.ClientSession) => {
				assert.equal(actual, session);
				return Promise.resolve(candidates.filter((r) => r.userId > match.$match.userId.$gt).slice(0, limit));
			} };
		});
		try {
			const empty = await eligibleRecipientPage(timestamp, "", session);
			assert.deepEqual(empty.recipients, []);
			assert.equal(empty.nextCursor, candidates[99].userId);
			// Add enough verified candidates to force a full page and a partial final page.
			candidates.push(...Array.from({ length: 100 }, (_, i) => ({
				userId: (352 + i).toString(16).padStart(24, "0"),
				identity: [{ _id: new Types.ObjectId() }],
			})));
			const first = await filledEligibleRecipientPage(timestamp, "", session);
			assert.equal(first.recipients.length, 100);
			assert.ok(first.nextCursor);
			const second = await filledEligibleRecipientPage(timestamp, first.nextCursor!, session);
			assert.equal(second.nextCursor, null);
			assert.deepEqual([...first.recipients, ...second.recipients], candidates.filter((r) => r.identity.length).map(({ userId }) => ({ userId })));
		} finally {
			Object.assign(mongoose.connection, { db: originalDb });
			aggregate.mock.restore();
		}
	});
	it("checks a single recipient by indexed ObjectId and rejects invalid IDs", async () => {
		const { default: UserProfile } = await import("@/database/models/user-profile.model");
		const { isEligibleRecipient } = await import("./recipients");
		const id = new Types.ObjectId();
		const originalDb = mongoose.connection.db;
		let verified = true;
		let onboarded = true;
		let lookups = 0;
		Object.assign(mongoose.connection, { db: { collection: (name: string) => {
			assert.equal(name, "user");
			return { findOne: async (filter: unknown) => {
				lookups++;
				assert.deepEqual(filter, { _id: id, emailVerified: true });
				return verified ? { _id: id } : null;
			} };
		} } });
		const exists = mock.method(UserProfile, "exists", async () => onboarded ? { _id: id } : null);
		try {
			assert.equal(await isEligibleRecipient(id.toHexString()), true);
			verified = false;
			assert.equal(await isEligibleRecipient(id.toHexString()), false);
			onboarded = false;
			assert.equal(await isEligibleRecipient(id.toHexString()), false);
			assert.equal(await isEligibleRecipient("invalid"), false);
			assert.equal(lookups, 2);
		} finally {
			Object.assign(mongoose.connection, { db: originalDb });
			exists.mock.restore();
		}
	});
});

describe("background sources", () => {
	it("blocks preference writes before indexes are initialized", async () => {
		const { default: Preference } =
			await import("@/database/models/in-app-preference.model");
		const originalDb = mongoose.connection.db;
		let enabled = false;
		Object.assign(mongoose.connection, {
			db: {
				collection: () => ({
					findOne: async () => (enabled ? { enabledAt: timestamp } : null),
				}),
			},
		});
		const update = mock.method(Preference, "updateOne", async () => ({}));
		try {
			const preference = {
				frequency: "weekly",
				categories: ["general_market"],
			};
			await assert.rejects(
				store.saveInAppPreference("alice", preference),
				/not available yet/,
			);
			assert.equal(update.mock.callCount(), 0);
			enabled = true;
			assert.deepEqual(
				await store.saveInAppPreference("alice", preference),
				preference,
			);
			assert.equal(update.mock.callCount(), 1);
		} finally {
			Object.assign(mongoose.connection, { db: originalDb });
			update.mock.restore();
		}
	});
	it("publishes announcements only on explicit publish and resumes the frozen audience", async () => {
		const { default: UserProfile } =
			await import("@/database/models/user-profile.model");
		const { publishAnnouncement } = await import("./announcements");
		const publications: Record<string, unknown>[] = [];
		const recipients: Record<string, unknown>[] = [];
		let audience = ["alice", "bob"];
		let recipientFailure = true;
		const db = {
			collection(name: string) {
				if (name === "notification_runtime")
					return { findOne: async () => ({ enabledAt: timestamp }) };
				const records =
					name === "notification_announcements" ? publications : recipients;
				const match = (
					record: Record<string, unknown>,
					filter: Record<string, unknown>,
				) =>
					Object.entries(filter).every(
						([k, v]) => String(record[k]) === String(v),
					);
				return {
					findOne: async (filter: Record<string, unknown>) =>
						records.find((r) => match(r, filter)) ?? null,
					insertOne: async (record: Record<string, unknown>) => {
						records.push({ ...record, _id: new Types.ObjectId() });
					},
					insertMany: async (input: Record<string, unknown>[]) => {
						records.push(
							...input.map((r) => ({ ...r, _id: new Types.ObjectId() })),
						);
					},
					find: (filter: Record<string, unknown>) => ({
						sort: () => ({
							limit: () => ({
								toArray: async () => records.filter((r) => match(r, filter)),
							}),
						}),
					}),
					updateOne: async (
						filter: Record<string, unknown>,
						update: { $set: Record<string, unknown> },
					) => {
						if (
							name === "notification_announcement_recipients" &&
							recipientFailure
						) {
							recipientFailure = false;
							throw new Error("Interrupted after notification insert");
						}
						const record = records.find((r) => match(r, filter));
						if (record) Object.assign(record, update.$set);
					},
				};
			},
		};
		const originalDb = mongoose.connection.db;
		Object.assign(mongoose.connection, { db });
		const aggregate = mock.method(UserProfile, "aggregate", () => ({
			session: () => Promise.resolve(audience.map((userId) => ({ userId, identity: [{ _id: new Types.ObjectId() }] }))),
		}));
		const session = mock.method(mongoose, "startSession", async () => ({
			withTransaction: async (fn: () => Promise<unknown>) => fn(),
			endSession: async () => {},
		}));
		try {
			const input = {
				key: "release-1",
				title: "Release",
				body: "New features",
			};
			const preview = await publishAnnouncement(input);
			assert.equal(preview.mode, "preview");
			assert.equal(rows.length, 0);
			assert.equal(publications.length, 0);
			assert.equal(recipients.length, 0);
			await assert.rejects(publishAnnouncement(input, true), /Interrupted/);
			assert.equal(rows.length, 1);
			audience = ["carol"];
			await publishAnnouncement(input, true);
			assert.deepEqual(rows.map((r) => r.userId).sort(), ["alice", "bob"]);
			await publishAnnouncement(input, true);
			assert.equal(rows.length, 2);
			await assert.rejects(
				publishAnnouncement({ ...input, title: "Changed" }, true),
				/different content/,
			);
		} finally {
			Object.assign(mongoose.connection, { db: originalDb });
			aggregate.mock.restore();
			session.mock.restore();
		}
	});
	it("retries alert inbox delivery independently of the email channel", async () => {
		const { default: AlertEvent } =
			await import("@/database/models/alert-event.model");
		const { default: Instrument } =
			await import("@/database/models/instrument.model");
		const { deliverAlertNotifications } = await import("./alert-delivery");
		const originalDb = mongoose.connection.db;
		Object.assign(mongoose.connection, {
			db: {
				collection: () => ({ findOne: async () => ({ enabledAt: timestamp }) }),
			},
		});
		const event = {
			_id: new Types.ObjectId(),
			userId: "alice",
			instrumentId: new Types.ObjectId(),
			instrumentSnapshot: { displaySymbol: "TEST", quoteCurrency: "USD" },
			operator: "crosses_above",
			threshold: Types.Decimal128.fromString("100"),
			observedValue: Types.Decimal128.fromString("101"),
			triggeredAt: timestamp,
			delivery: {
				email: { status: "not_requested" },
				inApp: { status: "pending" },
			},
		};
		const find = mock.method(
			AlertEvent,
			"find",
			(filter: Record<string, unknown>) => {
				assert.equal(filter.source, "market");
				assert.deepEqual(filter.createdAt, { $gte: timestamp });
				assert.equal(filter["delivery.inApp.status"], "pending");
				return {
					sort: () => ({ limit: () => ({ lean: async () => [event] }) }),
				};
			},
		);
		let tries = 0;
		const update = mock.method(AlertEvent, "updateOne", async () => {
			if (++tries === 1) throw new Error("Temporary acknowledgement failure");
		});
		const instrument = mock.method(Instrument, "findById", () => ({
			select: () => ({ lean: async () => ({ canonicalKey: "equity:TEST" }) }),
		}));
		const log = mock.method(console, "error", () => {});
		try {
			await assert.rejects(deliverAlertNotifications(), /require retry/);
			assert.equal(rows.length, 1);
			await deliverAlertNotifications();
			assert.equal(rows.length, 1);
			assert.equal(rows[0].type, "price_alert");
			assert.equal(rows[0].destination, "/instruments/equity%3ATEST");
		} finally {
			Object.assign(mongoose.connection, { db: originalDb });
			find.mock.restore();
			update.mock.restore();
			instrument.mock.restore();
			log.mock.restore();
		}
	});
});
