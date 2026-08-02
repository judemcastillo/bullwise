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
import { BellPlus } from "lucide-react";
import { CreateAlertDialog } from "@/components/alerts/AlertDialogs";
import type { AlertInstrumentOption } from "@/types/alerts";

export function WatchlistTable({ watchlist }: WatchlistTableProps) {
	const router = useRouter();
	const [items, setItems] = useState(watchlist);
	const [selectedInstrument, setSelectedInstrument] =
		useState<AlertInstrumentOption | null>(null);

	const handleWatchlistChange = (symbol: string, isAdded: boolean) => {
		if (!isAdded) {
			setItems((currentItems) =>
				currentItems.filter((item) => item.symbol !== symbol),
			);
			router.refresh();
		}
	};

	const openAlertDialog = (
		event: MouseEvent<HTMLButtonElement>,
		item: StockWithData,
	) => {
		event.stopPropagation();
		event.preventDefault();
		setSelectedInstrument({
			assetClass: "equity",
			provider: "finnhub",
			providerSymbol: item.symbol,
			displaySymbol: item.symbol,
			name: item.company,
			currency: item.currency,
			currentPrice: item.currentPrice,
		});
	};

	return (
		<>
			<div className="watchlist-table-shell">
				<Table className="scrollbar-hide-default watchlist-table">
				<TableHeader>
					<TableRow className="table-header-row">
						{WATCHLIST_TABLE_HEADER.map((label, index) => (
							<TableHead
								className={cn("table-header", index === 0 && "w-12")}
								key={label || "watchlist-status"}
							>
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
							<TableCell className="table-cell watchlist-status-cell">
								<WatchlistButton
									symbol={item.symbol}
									company={item.company}
									isInWatchlist={true}
									type="icon"
									onWatchlistChange={handleWatchlistChange}
								/>
							</TableCell>
							<TableCell className="table-cell company-cell">
								<span title={item.company}>{item.company}</span>
							</TableCell>
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
									onClick={(event) => openAlertDialog(event, item)}
								>
									<BellPlus aria-hidden="true" />
									Add Alert
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
				</Table>
			</div>
			<CreateAlertDialog
				open={Boolean(selectedInstrument)}
				onOpenChange={(open) => {
					if (!open) setSelectedInstrument(null);
				}}
				instruments={selectedInstrument ? [selectedInstrument] : []}
				initialInstrument={selectedInstrument}
			/>
		</>
	);
}
