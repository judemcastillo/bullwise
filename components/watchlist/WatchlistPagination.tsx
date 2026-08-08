import Link from "next/link";

const pageLinkClass =
	"inline-flex size-8 items-center justify-center rounded-md border border-gray-600 bg-gray-800 text-sm font-semibold text-gray-300 transition-colors hover:border-yellow-500/50 hover:text-yellow-500";

export default function WatchlistPagination({
	currentPage,
	pageSize,
	totalItems,
	totalPages,
}: {
	currentPage: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}) {
	if (totalItems === 0) return null;

	const firstItem = (currentPage - 1) * pageSize + 1;
	const lastItem = Math.min(currentPage * pageSize, totalItems);

	return (
		<nav
			className="flex flex-wrap items-center justify-between gap-3"
			aria-label="Watchlist pagination"
		>
			<p className="text-xs font-medium text-gray-500">
				Showing {firstItem}–{lastItem} of {totalItems}
			</p>
			{totalPages > 1 ? (
				<div className="flex items-center gap-2">
					{Array.from({ length: totalPages }, (_, index) => index + 1).map(
						(page) => (
							<Link
								key={page}
								href={page === 1 ? "/watchlist" : `/watchlist?page=${page}`}
								prefetch={false}
								aria-current={page === currentPage ? "page" : undefined}
								aria-label={`Go to watchlist page ${page}`}
								className={`${pageLinkClass} ${
									page === currentPage
										? "border-yellow-500 bg-yellow-500 text-gray-900 hover:text-gray-900"
										: ""
								}`}
							>
								{page}
							</Link>
						),
					)}
				</div>
			) : null}
		</nav>
	);
}
