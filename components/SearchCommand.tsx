"use client";

import { useCallback, useEffect, useState } from "react";
import {
	CommandDialog,
	CommandEmpty,
	CommandInput,
	CommandList,
} from "@/components/ui/command";
import { Loader2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { searchStocks } from "@/lib/actions/finnhub.actions";
import { useDebounce } from "@/hooks/useDebounce";

export default function SearchCommand({
	open,
	setOpen,
	initialStocks,
}: SearchCommandProps) {
	const [searchTerm, setSearchTerm] = useState("");
	const [loading, setLoading] = useState(false);
	const [stocks, setStocks] =
		useState<StockWithWatchlistStatus[]>(initialStocks);

	const isSearchMode = !!searchTerm.trim();
	const displayStocks = isSearchMode ? stocks : stocks?.slice(0, 10);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setOpen((v) => !v);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [setOpen]);

	const handleSearch = useCallback(async () => {
		if (!isSearchMode) return setStocks(initialStocks);

		try {
			const results = await searchStocks(searchTerm.trim());
			setStocks(results);
		} catch (e) {
			console.error(e);
			setStocks([]);
		} finally {
			setLoading(false);
		}
	}, [initialStocks, isSearchMode, searchTerm]);

	const debouncedSearch = useDebounce(handleSearch, 300);

	useEffect(() => {
		debouncedSearch();
	}, [debouncedSearch]);

	const handleSelectStock = () => {
		setOpen(false);
		setSearchTerm("");
		setStocks(initialStocks);
	};

	return (
		<CommandDialog
			open={open}
			onOpenChange={setOpen}
			className="search-dialog"
		>
			<div className="search-field bg-gray-800! pb-1 flex flex-row justify-between items-center gap-0!">
				<div className="p-1  grow-3!">
					<CommandInput
						value={searchTerm}
						onValueChange={setSearchTerm}
						placeholder="Search stocks..."
						className="search-input border-0!  bg-gray-800! "
					/>
				</div>
				<div>{loading && <Loader2 className="search-loader" />}</div>
			</div>
			<CommandList className="search-list">
				{loading ? (
					<CommandEmpty className="search-list-empty">
						Loading stocks...
					</CommandEmpty>
				) : displayStocks?.length === 0 ? (
					<div className="search-list-indicator">
						{isSearchMode ? "No results found" : "No stocks available"}
					</div>
				) : (
					<ul>
						<div className="search-count">
							{isSearchMode ? "Search results" : "Popular stocks"}
							{` `}({displayStocks?.length || 0})
						</div>
						{displayStocks?.map((stock) => (
							<li key={stock.symbol} className="search-item">
								<Link
									href={`/stocks/${stock.symbol}`}
									onClick={handleSelectStock}
									className="search-item-link"
								>
									<TrendingUp className="h-4 w-4 text-gray-500" />
									<div className="flex-1">
										<div className="search-item-name">{stock.name}</div>
										<div className="text-sm text-gray-500">
											{stock.symbol} | {stock.exchange} | {stock.type}
										</div>
									</div>
									{/*<Star />*/}
								</Link>
							</li>
						))}
					</ul>
				)}
			</CommandList>
		</CommandDialog>
	);
}
