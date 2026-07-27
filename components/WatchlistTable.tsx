"use client";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { WATCHLIST_TABLE_HEADER } from "@/lib/constants";
import { Button } from "./ui/button";

import { useRouter } from "next/navigation";
import { cn, getChangeColorClass } from "@/lib/utils";
import WatchlistButton from "./WatchlistButton";
import { useState, type MouseEvent } from "react";

export function WatchlistTable({ watchlist }: WatchlistTableProps) {
	const router = useRouter();
	const [items, setItems] = useState(watchlist);

	const handleWatchlistChange = (symbol: string, isAdded: boolean) => {
		if (!isAdded) {
			setItems((currentItems) =>
				currentItems.filter((item) => item.symbol !== symbol),
			);
			router.refresh();
		}
	};

	const preventRowNavigation = (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
	};

	return (
		<>
			<Table className="scrollbar-hide-default watchlist-table">
				<TableHeader>
					<TableRow className="table-header-row">
						{WATCHLIST_TABLE_HEADER.map((label) => (
							<TableHead className="table-header" key={label}>
								{label}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{items.map((item) => (
						<TableRow
							key={item.symbol}
							className="table-row"
							onClick={() =>
								router.push(`/stocks/${encodeURIComponent(item.symbol)}`)
							}
						>
							<TableCell className="pl-4 table-cell">{item.company}</TableCell>
							<TableCell className="table-cell">{item.symbol}</TableCell>
							<TableCell className="table-cell">
								{item.priceFormatted || "—"}
							</TableCell>
							<TableCell
								className={cn(
									"table-cell",
									getChangeColorClass(item.changePercent),
								)}
							>
								{item.changeFormatted || "—"}
							</TableCell>
							<TableCell className="table-cell">
								{item.marketCap || "—"}
							</TableCell>
							<TableCell className="table-cell">
								{item.peRatio || "—"}
							</TableCell>
							<TableCell>
								<Button
									type="button"
									className="add-alert"
									onClick={preventRowNavigation}
								>
									Add Alert
								</Button>
							</TableCell>
							<TableCell>
								<WatchlistButton
									symbol={item.symbol}
									company={item.company}
									isInWatchlist={true}
									showTrashIcon={true}
									type="icon"
									onWatchlistChange={handleWatchlistChange}
								/>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</>
	);
}
