import { loadEnvConfig } from "@next/env";
import {
	normalizeFinnhubOandaCommodityEntry,
	normalizeMassiveCommodityEntry,
	reconcileCommoditySpotCatalogs,
} from "@/lib/instruments/commodity-catalog";
import {
	normalizeFinnhubCoinbaseCatalogEntry,
	normalizeMassiveCryptoCatalogEntry,
	reconcileCoinbaseCryptoCatalogs,
} from "@/lib/instruments/crypto-catalog";
import {
	normalizeFinnhubEquityCatalogEntry,
	normalizeMassiveEquityCatalogEntry,
	reconcileEquityCatalogs,
} from "@/lib/instruments/equity-catalog";
import { normalizeFinnhubOandaCatalogEntry } from "@/lib/instruments/finnhub-forex";
import { reconcileForexCatalogs } from "@/lib/instruments/forex-catalog";
import { normalizeMassiveForexCatalogEntry } from "@/lib/instruments/massive-forex";
import {
	listFinnhubCryptoSymbols,
	listFinnhubOandaSymbols,
	listFinnhubUsEquitySymbols,
} from "@/lib/market-data/providers/finnhub-forex-client";
import {
	listMassiveCryptoTickers,
	listMassiveForexTickers,
	listMassiveStockTickers,
} from "@/lib/market-data/providers/massive-client";
import { listResolvableTradingViewEquities } from "@/lib/market-data/providers/tradingview-client";
import type { AssetClass, InstrumentDefinition } from "@/types/instruments";
import type { Types } from "mongoose";

loadEnvConfig(process.cwd());

const applyChanges = process.argv.includes("--apply");
const deactivateOnly = process.argv.includes("--deactivate-only");
const BULK_WRITE_SIZE = 500;

type SupportedCatalog = Extract<
	AssetClass,
	"equity" | "forex" | "crypto" | "commodity"
>;

type ExistingInstrument = {
	_id: Types.ObjectId;
	canonicalKey: string;
	status: "active" | "inactive" | "expired";
	providerBindings: Array<{ provider: string; symbol: string }>;
};

type PreparedCatalog = {
	assetClass: SupportedCatalog;
	definitions: InstrumentDefinition[];
	providerCounts: Record<string, number>;
	rejectedCounts: Record<string, number>;
};

function readAssetClassArgument(): SupportedCatalog {
	const inline = process.argv.find((argument) =>
		argument.startsWith("--asset-class="),
	);
	const value = inline
		? inline.slice("--asset-class=".length)
		: process.argv[process.argv.indexOf("--asset-class") + 1];
	if (
		value !== "equity" &&
		value !== "forex" &&
		value !== "crypto" &&
		value !== "commodity"
	) {
		throw new Error(
			"Choose --asset-class=equity, --asset-class=forex, --asset-class=crypto, or --asset-class=commodity",
		);
	}
	return value;
}

function normalizeCatalog<T, R>(
	items: readonly T[],
	normalize: (item: T) => R,
) {
	const normalized: R[] = [];
	let rejected = 0;
	for (const item of items) {
		try {
			normalized.push(normalize(item));
		} catch {
			rejected += 1;
		}
	}
	return { normalized, rejected };
}

function bindingKey(provider: string, symbol: string) {
	return `${provider.trim().toLowerCase()}:${symbol.trim()}`;
}

function matchingExistingInstruments(
	definition: InstrumentDefinition,
	existing: readonly ExistingInstrument[],
) {
	const desiredBindings = new Set(
		definition.providerBindings.map((binding) =>
			bindingKey(binding.provider, binding.symbol),
		),
	);
	return existing.filter(
		(instrument) =>
			instrument.canonicalKey === definition.canonicalKey ||
			instrument.providerBindings.some((binding) =>
				desiredBindings.has(bindingKey(binding.provider, binding.symbol)),
			),
	);
}

function requireKeys() {
	const finnhubApiKey = process.env.FINNHUB_API_KEY?.trim();
	const massiveApiKey = process.env.MASSIVE_API_KEY?.trim();
	if (!finnhubApiKey) throw new Error("FINNHUB_API_KEY is not configured");
	if (!massiveApiKey) throw new Error("MASSIVE_API_KEY is not configured");
	return { finnhubApiKey, massiveApiKey };
}

async function prepareForexCatalog(): Promise<PreparedCatalog> {
	const { finnhubApiKey, massiveApiKey } = requireKeys();
	const [finnhubRaw, massiveRaw] = await Promise.all([
		listFinnhubOandaSymbols({ apiKey: finnhubApiKey }),
		listMassiveForexTickers({ apiKey: massiveApiKey }),
	]);
	const finnhub = normalizeCatalog(
		finnhubRaw,
		normalizeFinnhubOandaCatalogEntry,
	);
	const massive = normalizeCatalog(
		massiveRaw,
		normalizeMassiveForexCatalogEntry,
	);
	return {
		assetClass: "forex",
		definitions: reconcileForexCatalogs(finnhub.normalized, massive.normalized),
		providerCounts: { finnhub: finnhubRaw.length, massive: massiveRaw.length },
		rejectedCounts: { finnhub: finnhub.rejected, massive: massive.rejected },
	};
}

async function prepareEquityCatalog(): Promise<PreparedCatalog> {
	const { finnhubApiKey, massiveApiKey } = requireKeys();
	const [finnhubRaw, massiveRaw] = await Promise.all([
		listFinnhubUsEquitySymbols({ apiKey: finnhubApiKey }),
		listMassiveStockTickers({ apiKey: massiveApiKey }),
	]);
	const finnhub = normalizeCatalog(
		finnhubRaw,
		normalizeFinnhubEquityCatalogEntry,
	);
	const massive = normalizeCatalog(
		massiveRaw,
		normalizeMassiveEquityCatalogEntry,
	);
	const providerDefinitions = reconcileEquityCatalogs(
		finnhub.normalized,
		massive.normalized,
	);
	const tradingViewSymbols = providerDefinitions.map((definition) => {
		const binding = definition.providerBindings.find(
			(candidate) =>
				candidate.provider === "tradingview" &&
				candidate.enabled &&
				candidate.capabilities.includes("chart"),
		);
		if (!binding) {
			throw new Error(
				`${definition.canonicalKey} has no enabled TradingView chart binding`,
			);
		}
		return binding.symbol;
	});
	const resolvedTradingViewSymbols = await listResolvableTradingViewEquities({
		symbols: tradingViewSymbols,
	});
	const definitions = providerDefinitions.filter((definition) => {
		const binding = definition.providerBindings.find(
			(candidate) => candidate.provider === "tradingview",
		);
		return Boolean(
			binding && resolvedTradingViewSymbols.has(binding.symbol.toUpperCase()),
		);
	});
	return {
		assetClass: "equity",
		definitions,
		providerCounts: {
			finnhub: finnhubRaw.length,
			massive: massiveRaw.length,
			tradingview: resolvedTradingViewSymbols.size,
		},
		rejectedCounts: {
			finnhub: finnhub.rejected,
			massive: massive.rejected,
			tradingview: providerDefinitions.length - definitions.length,
		},
	};
}

async function prepareCryptoCatalog(): Promise<PreparedCatalog> {
	const { finnhubApiKey, massiveApiKey } = requireKeys();
	const [finnhubRaw, massiveRaw] = await Promise.all([
		listFinnhubCryptoSymbols({ exchange: "COINBASE", apiKey: finnhubApiKey }),
		listMassiveCryptoTickers({ apiKey: massiveApiKey }),
	]);
	const finnhub = normalizeCatalog(
		finnhubRaw,
		normalizeFinnhubCoinbaseCatalogEntry,
	);
	const massive = normalizeCatalog(
		massiveRaw,
		normalizeMassiveCryptoCatalogEntry,
	);
	return {
		assetClass: "crypto",
		definitions: reconcileCoinbaseCryptoCatalogs(
			finnhub.normalized,
			massive.normalized,
		),
		providerCounts: { finnhub: finnhubRaw.length, massive: massiveRaw.length },
		rejectedCounts: { finnhub: finnhub.rejected, massive: massive.rejected },
	};
}

async function prepareCommodityCatalog(): Promise<PreparedCatalog> {
	const { finnhubApiKey, massiveApiKey } = requireKeys();
	const [finnhubRaw, massiveRaw] = await Promise.all([
		listFinnhubOandaSymbols({ apiKey: finnhubApiKey }),
		listMassiveForexTickers({ apiKey: massiveApiKey }),
	]);
	const finnhub = normalizeCatalog(
		finnhubRaw,
		normalizeFinnhubOandaCommodityEntry,
	);
	const massive = normalizeCatalog(
		massiveRaw,
		normalizeMassiveCommodityEntry,
	);
	return {
		assetClass: "commodity",
		definitions: reconcileCommoditySpotCatalogs(
			finnhub.normalized,
			massive.normalized,
		),
		providerCounts: { finnhub: finnhubRaw.length, massive: massiveRaw.length },
		rejectedCounts: { finnhub: finnhub.rejected, massive: massive.rejected },
	};
}

async function validateDefinitions(definitions: readonly InstrumentDefinition[]) {
	for (let offset = 0; offset < definitions.length; offset += BULK_WRITE_SIZE) {
		await Promise.all(
			definitions
				.slice(offset, offset + BULK_WRITE_SIZE)
				.map(async (definition) => {
					const { default: Instrument } = await import(
						"@/database/models/instrument.model"
					);
					await new Instrument(definition).validate();
				}),
		);
	}
}

async function persistCatalog(catalog: PreparedCatalog) {
	if (catalog.definitions.length === 0) {
		throw new Error(
			`Providers returned no shared ${catalog.assetClass} instruments; refusing to modify the catalog`,
		);
	}

	const [{ connectToDatabase }, { default: Instrument }] = await Promise.all([
		import("@/database/mongoose"),
		import("@/database/models/instrument.model"),
	]);
	const mongoose = await connectToDatabase();

	try {
		const existing = await Instrument.find({ assetClass: catalog.assetClass })
			.select({ canonicalKey: 1, status: 1, providerBindings: 1 })
			.lean<ExistingInstrument[]>();
		const matchedIds = new Set<string>();
		const plans = catalog.definitions.map((definition) => {
			const matches = matchingExistingInstruments(definition, existing);
			if (matches.length > 1) {
				throw new Error(
					`Multiple existing instruments match ${definition.canonicalKey}; resolve the duplicate before syncing`,
				);
			}
			const match = matches[0];
			if (match) matchedIds.add(match._id.toString());
			return { definition, existing: match };
		});
		const toDeactivate = existing.filter(
			(instrument) =>
				instrument.status === "active" &&
				!matchedIds.has(instrument._id.toString()),
		);

		await validateDefinitions(catalog.definitions);

		const summary = {
			mode: applyChanges ? "apply" : "dry-run",
			deactivateOnly,
			assetClass: catalog.assetClass,
			providerSymbols: catalog.providerCounts,
			providerRejected: catalog.rejectedCounts,
			sharedInstruments: catalog.definitions.length,
			plannedInserts: deactivateOnly
				? 0
				: plans.filter((plan) => !plan.existing).length,
			skippedInserts: deactivateOnly
				? plans.filter((plan) => !plan.existing).length
				: 0,
			plannedUpdates: plans.filter((plan) => plan.existing).length,
			plannedCanonicalKeyMigrations: plans.filter(
				(plan) =>
					plan.existing &&
					plan.existing.canonicalKey !== plan.definition.canonicalKey,
			).length,
			plannedDeactivations: toDeactivate.length,
		};

		if (!applyChanges) {
			console.log(JSON.stringify(summary, null, 2));
			console.log(
				"Dry run only. Re-run with --apply after reviewing this summary.",
			);
			return;
		}

		const now = new Date();
		const writePlans = deactivateOnly
			? plans.filter((plan) => plan.existing)
			: plans;
		for (let offset = 0; offset < writePlans.length; offset += BULK_WRITE_SIZE) {
			const chunk = writePlans.slice(offset, offset + BULK_WRITE_SIZE);
			await Instrument.collection.bulkWrite(
				chunk.map((plan) => ({
					updateOne: {
						filter: plan.existing
							? { _id: plan.existing._id }
							: { canonicalKey: plan.definition.canonicalKey },
						update: {
							$set: { ...plan.definition, updatedAt: now },
							$setOnInsert: { createdAt: now },
						},
						upsert: true,
					},
				})),
				{ ordered: true },
			);
		}

		if (toDeactivate.length > 0) {
			await Instrument.updateMany(
				{ _id: { $in: toDeactivate.map(({ _id }) => _id) } },
				{ $set: { status: "inactive", updatedAt: now } },
			);
		}

		console.log(JSON.stringify(summary, null, 2));
	} finally {
		await mongoose.disconnect();
	}
}

async function run() {
	const assetClass = readAssetClassArgument();
	const catalog =
		assetClass === "forex"
			? await prepareForexCatalog()
			: assetClass === "equity"
				? await prepareEquityCatalog()
				: assetClass === "crypto"
					? await prepareCryptoCatalog()
					: await prepareCommodityCatalog();
	await persistCatalog(catalog);
}

run().catch((error) => {
	console.error(
		"Instrument catalog sync failed:",
		error instanceof Error ? error.message : String(error),
	);
	process.exitCode = 1;
});
