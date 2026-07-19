declare module "react-select-country-list" {
	type CountryOption = {
		label: string;
		value: string;
	};

	type CountryMap = Record<string, string>;

	interface CountryList {
		getValue(label: string): string | undefined;
		getLabel(value: string): string | undefined;
		getLabels(): string[];
		getValues(): string[];
		getLabelList(): CountryMap;
		getValueList(): CountryMap;
		getData(): CountryOption[];
		setLabel(value: string, label: string): CountryList;
		setEmpty(label: string): CountryList;
		native(): CountryList;
	}

	function countryList(): CountryList;

	export = countryList;
}
