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
import { Button } from "@/components/ui/button";

import { useRouter } from "next/navigation";
import { cn, getChangeColorClass } from "@/lib/utils";
import WatchlistButton from "./WatchlistButton";
import { useState, type MouseEvent } from "react";
import { BellPlus } from "lucide-react";
import { CreateAlertDialog } from "@/components/alerts/AlertDialogs";
import type { AlertInstrumentOption } from "@/types/alerts";
import {
	equitySecurityTypeLabel,
	usesCompanyStockDashboard,
} from "@/lib/instruments/equity-security-type";

function formatInstrumentType(instrumentType: StockWithData["instrumentType"]) {
	return instrumentType.replaceAll("_", " ");
}

function WatchlistInstrumentDetails({ item }: { item: StockWithData }) {
	if (item.assetClass === "equity") {
		if (!usesCompanyStockDashboard(item.securityType)) {
			return (
				<div className="space-y-0.5 text-xs">
					<div>{equitySecurityTypeLabel(item.securityType)}</div>
					<div className="text-gray-500">Exchange-listed security</div>
				</div>
			);
		}
		return (
			<div className="space-y-0.5 text-xs">
				<div>{item.marketCap || "Market cap —"}</div>
				<div className="text-gray-500">P/E {item.peRatio || "—"}</div>
			</div>
		);
	}

	if (
		item.assetClass === "forex" ||
		item.assetClass === "crypto" ||
		item.assetClass === "commodity"
	) {
		const marketSession =
			item.calendarId === "crypto-24x7"
				? " · 24×7"
				: item.calendarId === "forex-24x5" ||
						item.calendarId === "commodity-spot-24x5"
					? " · 24×5"
					: "";
		return (
			<div className="space-y-0.5 text-xs">
				<div>
					{item.baseCurrency ?? "—"} / {item.quoteCurrency}
				</div>
				<div className="capitalize text-gray-500">
					{formatInstrumentType(item.instrumentType)}
					{marketSession}
				</div>
			</div>
		);
	}

	return (
		<span className="text-xs capitalize text-gray-400">
			{formatInstrumentType(item.instrumentType)}
		</span>
	);
}

export function WatchlistTable({ watchlist }: WatchlistTableProps) {
	const router = useRouter();
	const [items, setItems] = useState(watchlist);
	const [selectedInstrument, setSelectedInstrument] =
		useState<AlertInstrumentOption | null>(null);

	const handleWatchlistChange = (instrumentId: string, isAdded: boolean) => {
		if (!isAdded) {
			setItems((currentItems) =>
				currentItems.filter((item) => item.instrumentId !== instrumentId),
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
		if (!item.supportsAlerts || !item.provider || !item.providerSymbol) return;
		setSelectedInstrument({
			assetClass: item.assetClass,
			provider: item.provider,
			providerSymbol: item.providerSymbol,
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
							key={item.instrumentId}
							className="table-row"
							onClick={() =>
								router.push(
									`/instruments/${encodeURIComponent(item.canonicalKey)}`,
								)
							}
						>
							<TableCell className="table-cell watchlist-status-cell">
								<WatchlistButton
									instrumentId={item.instrumentId}
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
							<TableCell className="table-cell">
								<div>{item.symbol}</div>
								<div className="text-[10px] uppercase text-gray-500">
									{item.assetClass === "equity"
										? equitySecurityTypeLabel(item.securityType)
										: item.assetClass}
								</div>
							</TableCell>
							<TableCell className="table-cell">
								{item.priceFormatted ||
									(item.assetClass !== "equity" ? (
										<span className="text-xs text-gray-500">Chart only</span>
									) : (
										"—"
									))}
							</TableCell>
							<TableCell
								className={cn(
									"table-cell",
									getChangeColorClass(item.changePercent),
								)}
							>
								{item.changeFormatted || "—"}
							</TableCell>
							<TableCell className="table-cell">{item.venue || "—"}</TableCell>
							<TableCell className="table-cell">
								<WatchlistInstrumentDetails item={item} />
							</TableCell>
							<TableCell>
								{item.supportsAlerts ? (
									<Button
										type="button"
										className="add-alert"
										onClick={(event) => openAlertDialog(event, item)}
									>
										<BellPlus aria-hidden="true" />
										Add Alert
									</Button>
								) : (
									<span className="text-xs text-gray-500">Not available</span>
								)}
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
