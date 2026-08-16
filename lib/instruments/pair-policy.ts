export function usesUsd(
	pair: Readonly<{ baseCurrency: string; quoteCurrency: string }>,
) {
	return (
		pair.baseCurrency.trim().toUpperCase() === "USD" ||
		pair.quoteCurrency.trim().toUpperCase() === "USD"
	);
}
