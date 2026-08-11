type WatchlistRecordForClient = {
	symbol: string;
	company: string;
};

export function toWatchlistClientItem(
	item: WatchlistRecordForClient,
): Pick<StockWithData, "symbol" | "company"> {
	return {
		symbol: item.symbol,
		company: item.company,
	};
}
