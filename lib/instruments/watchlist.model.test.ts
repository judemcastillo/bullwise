import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Types } from "mongoose";
import Watchlist from "@/database/models/watchlist.model";

describe("Watchlist model", () => {
	it("stores an instrument reference instead of copied symbol metadata", async () => {
		const item = new Watchlist({
			userId: "user-1",
			instrumentId: new Types.ObjectId(),
		});

		await assert.doesNotReject(item.validate());
		assert.equal(Watchlist.schema.path("symbol"), undefined);
		assert.equal(Watchlist.schema.path("company"), undefined);
		assert.equal(Watchlist.schema.path("instrumentId").options.ref, "Instrument");
	});

	it("enforces one instrument per user with a migration-safe index", () => {
		const indexes = Watchlist.schema.indexes() as Array<
			[Record<string, number>, { unique?: boolean; partialFilterExpression?: unknown }]
		>;
		const index = indexes.find(
			([fields]) => fields.userId === 1 && fields.instrumentId === 1,
		);

		assert.equal(index?.[1].unique, true);
		assert.deepEqual(index?.[1].partialFilterExpression, {
			instrumentId: { $type: "objectId" },
		});
	});
});
