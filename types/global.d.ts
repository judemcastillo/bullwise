import type {
	AssetClass,
	EquitySecurityType,
	InstrumentType,
} from "@/types/instruments";

declare global {
	type SignInFormData = {
		email: string;
		password: string;
	};

	type SignUpFormData = {
		fullName: string;
		email: string;
		password: string;
	};

	type OnboardingFormData = {
		country: string;
		investmentExperience: string;
		investmentGoals: string;
		riskTolerance: string;
		preferredMarkets: string[];
		preferredIndustries: string[];
	};

	type CountrySelectProps = {
		name: string;
		label: string;
		control: Control;
		error?: FieldError;
		required?: boolean;
	};

	type FormInputProps = {
		name: string;
		label: string;
		placeholder: string;
		type?: string;
		register: UseFormRegister;
		error?: FieldError;
		validation?: RegisterOptions;
		disabled?: boolean;
		value?: string;
	};

	type Option = {
		value: string;
		label: string;
	};

	type SelectFieldProps = {
		name: string;
		label: string;
		placeholder: string;
		options: readonly Option[];
		control: Control;
		error?: FieldError;
		required?: boolean;
	};

	type FooterLinkProps = {
		text: string;
		linkText: string;
		href: string;
	};

	type SearchCommandProps = {
		open: boolean;
		setOpen: React.Dispatch<React.SetStateAction<boolean>>;
		onWatchlistChange?: (instrumentId: string, isAdded: boolean) => void;
	};

	type WelcomeEmailData = {
		email: string;
		name: string;
		intro: string;
	};

	type User = {
		id: string;
		name: string;
		email: string;
		image?: string | null;
	};

	type Stock = {
		symbol: string;
		name: string;
		type: string;
	};

	type StockWithWatchlistStatus = Stock & {
		isInWatchlist: boolean;
	};

	type FinnhubSearchResult = {
		symbol: string;
		description: string;
		displaySymbol?: string;
		type: string;
	};

	type FinnhubSearchResponse = {
		count: number;
		result: FinnhubSearchResult[];
	};

	type WatchlistButtonProps = {
		instrumentId: string;
		symbol: string;
		company: string;
		isInWatchlist: boolean;
		showTrashIcon?: boolean;
		type?: "button" | "icon";
		onWatchlistChange?: (instrumentId: string, isAdded: boolean) => void;
	};

	type QuoteData = {
		c?: number;
		dp?: number;
	};

	type ProfileData = {
		name?: string;
		marketCapitalization?: number;
	};

	type FinancialsData = {
		metric?: { [key: string]: number };
	};

	type SelectedStock = {
		symbol: string;
		company: string;
		currentPrice?: number;
	};

	type WatchlistTableProps = {
		watchlist: StockWithData[];
	};

	type StockWithData = {
		instrumentId: string;
		canonicalKey: string;
		assetClass: AssetClass;
		instrumentType: InstrumentType;
		securityType?: EquitySecurityType;
		symbol: string;
		company: string;
		venue?: string;
		baseCurrency?: string;
		quoteCurrency: string;
		calendarId?: string;
		provider?: string;
		providerSymbol?: string;
		quoteProvider?: string;
		quoteProviderSymbol?: string;
		newsProvider?: string;
		newsProviderSymbol?: string;
		supportsAlerts: boolean;
		currentPrice?: number;
		currency?: string | null;
		logo?: string | null;
		changePercent?: number;
		priceFormatted?: string;
		changeFormatted?: string;
		marketCap?: string;
		peRatio?: string;
	};

	type AlertsListProps = {
		alertData: Alert[] | undefined;
	};

	type MarketNewsArticle = {
		id: number;
		headline: string;
		summary: string;
		source: string;
		url: string;
		datetime: number;
		category: string;
		related: string;
		image?: string;
	};

	type WatchlistNewsProps = {
		news?: MarketNewsArticle[];
	};

	type AlertData = {
		symbol: string;
		company: string;
		alertName: string;
		alertType: "upper" | "lower";
		threshold: string;
	};

	type AlertModalProps = {
		alertId?: string;
		alertData?: AlertData;
		action?: string;
		open: boolean;
		setOpen: (open: boolean) => void;
	};

	type RawNewsArticle = {
		id: number;
		headline?: string;
		summary?: string;
		source?: string;
		url?: string;
		datetime?: number;
		image?: string;
		category?: string;
		related?: string;
	};

	type Alert = {
		id: string;
		symbol: string;
		company: string;
		alertName: string;
		currentPrice: number;
		alertType: "upper" | "lower";
		threshold: number;
		changePercent?: number;
	};
}

export {};
