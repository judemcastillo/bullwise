import type { AssetClass } from "@/types/instruments";

export type { AssetClass } from "@/types/instruments";

export type AlertOperator = "crosses_above" | "crosses_below";
export type AlertStatus = "active" | "paused" | "triggered";

export type AlertInstrumentInput = {
	assetClass: AssetClass;
	provider: string;
	providerSymbol: string;
};

export type AlertInstrumentOption = AlertInstrumentInput & {
	displaySymbol: string;
	name: string;
	venue?: string;
	currency?: string | null;
	currentPrice?: number;
};

export type CreateAlertInput = {
	instrument: AlertInstrumentInput;
	name: string;
	operator: AlertOperator;
	threshold: string;
	emailEnabled: boolean;
};

export type UpdateAlertInput = Omit<CreateAlertInput, "instrument">;

export type AlertDto = {
	id: string;
	name: string;
	metric: "price";
	operator: AlertOperator;
	threshold: string;
	status: AlertStatus;
	emailEnabled: boolean;
	instrument: {
		id: string;
		canonicalKey: string;
		assetClass: AssetClass;
		displaySymbol: string;
		name: string;
		venue?: string;
		baseCurrency?: string;
		quoteCurrency: string;
		pricePrecision: number;
	};
	createdAt: string;
	updatedAt: string;
};

export type AlertActionResult =
	| { success: true; alert?: AlertDto }
	| { success: false; error: string };

export type TestAlertEmailActionResult =
	| { success: true }
	| { success: false; error: string };
