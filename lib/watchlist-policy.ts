export const WATCHLIST_MAX_ITEMS = 20;
export const WATCHLIST_PAGE_SIZE = 10;

export function hasWatchlistCapacity(itemCount: number) {
	return itemCount < WATCHLIST_MAX_ITEMS;
}

function parseRequestedPage(value: string | string[] | undefined) {
	const rawValue = Array.isArray(value) ? value[0] : value;
	if (!rawValue || !/^\d+$/.test(rawValue)) return 1;

	const parsed = Number(rawValue);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function paginateWatchlist<T>(
	items: readonly T[],
	requestedPage?: string | string[],
) {
	const totalItems = items.length;
	const totalPages = Math.max(
		1,
		Math.ceil(totalItems / WATCHLIST_PAGE_SIZE),
	);
	const currentPage = Math.min(parseRequestedPage(requestedPage), totalPages);
	const startIndex = (currentPage - 1) * WATCHLIST_PAGE_SIZE;

	return {
		items: items.slice(startIndex, startIndex + WATCHLIST_PAGE_SIZE),
		currentPage,
		pageSize: WATCHLIST_PAGE_SIZE,
		totalItems,
		totalPages,
	};
}
