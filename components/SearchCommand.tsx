"use client";

import { useEffect, useRef, useState } from "react";
import {
	CommandDialog,
	CommandEmpty,
	CommandInput,
	CommandList,
} from "@/components/ui/command";
import { Loader2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { searchInstruments } from "@/lib/actions/finnhub.actions";
import WatchlistButton from "@/components/watchlist/WatchlistButton";
import { ScrollArea } from "./ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { equitySecurityTypeLabel } from "@/lib/instruments/equity-security-type";
import {
	EQUITY_SECURITY_TYPES,
	type AssetClass,
	type EquitySecurityType,
	type InstrumentSearchResult,
} from "@/types/instruments";

const ASSET_FILTERS: Array<{ value: AssetClass | "all"; label: string }> = [
	{ value: "all", label: "All instruments" },
	{ value: "equity", label: "Equities" },
	{ value: "forex", label: "Currencies" },
	{ value: "crypto", label: "Crypto" },
	{ value: "commodity", label: "Commodities" },
	{ value: "index", label: "Indexes" },
];

const SECURITY_TYPE_FILTERS: Array<{
	value: EquitySecurityType | "all";
	label: string;
}> = [
	{ value: "all", label: "All security types" },
	...EQUITY_SECURITY_TYPES.map((value) => ({
		value,
		label: equitySecurityTypeLabel(value),
	})),
];

export default function SearchCommand({
	open,
	setOpen,
	onWatchlistChange,
}: SearchCommandProps) {
	const [searchTerm, setSearchTerm] = useState("");
	const [assetClass, setAssetClass] = useState<AssetClass | "all">("all");
	const [securityType, setSecurityType] = useState<
		EquitySecurityType | "all"
	>("all");
	const [settledRequest, setSettledRequest] = useState<{
		key: string;
		error?: string;
	} | null>(null);
	const [popularInstruments, setPopularInstruments] = useState<
		InstrumentSearchResult[]
	>([]);
	const [instruments, setInstruments] = useState<InstrumentSearchResult[]>([]);
	const requestId = useRef(0);

	const normalizedSearchTerm = searchTerm.trim();
	const isSearchMode = normalizedSearchTerm.length > 0;
	const selectedSecurityType =
		assetClass === "equity" && securityType !== "all"
			? securityType
			: undefined;
	const currentRequestKey = JSON.stringify([
		assetClass,
		selectedSecurityType,
		normalizedSearchTerm,
	]);
	const isCurrentRequestSettled = settledRequest?.key === currentRequestKey;
	const loading = open && !isCurrentRequestSettled;
	const searchError = isCurrentRequestSettled
		? settledRequest.error
		: undefined;
	const displayInstruments = isCurrentRequestSettled
		? isSearchMode
			? instruments
			: popularInstruments.slice(0, 10)
		: [];

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

	useEffect(() => {
		if (!open) return;

		const currentRequestId = ++requestId.current;
		const requestKey = JSON.stringify([
			assetClass,
			selectedSecurityType,
			normalizedSearchTerm,
		]);
		const timeoutId = window.setTimeout(
			async () => {
				try {
					const response = await searchInstruments(
						isSearchMode ? normalizedSearchTerm : undefined,
						assetClass === "all" ? undefined : assetClass,
						selectedSecurityType,
					);
					if (requestId.current !== currentRequestId) return;

					if (isSearchMode) {
						setInstruments(response.results);
					} else {
						setPopularInstruments(response.results);
					}
					setSettledRequest({ key: requestKey, error: response.error });
				} catch (error) {
					if (requestId.current !== currentRequestId) return;
					console.error("Unable to search instruments:", error);
					if (isSearchMode) setInstruments([]);
					else setPopularInstruments([]);
					setSettledRequest({
						key: requestKey,
						error: "Instrument search is temporarily unavailable.",
					});
				}
			},
			isSearchMode ? 900 : 0,
		);

		return () => {
			window.clearTimeout(timeoutId);
			requestId.current += 1;
		};
	}, [
		assetClass,
		isSearchMode,
		normalizedSearchTerm,
		open,
		selectedSecurityType,
	]);

	const handleSelectStock = () => {
		setOpen(false);
		setSearchTerm("");
	};

	const handleWatchlistChange = (instrumentId: string, isAdded: boolean) => {
		setInstruments((currentInstruments) =>
			currentInstruments.map((instrument) =>
				instrument.instrumentId === instrumentId
					? { ...instrument, isInWatchlist: isAdded }
					: instrument,
			),
		);
		setPopularInstruments((currentInstruments) =>
			currentInstruments.map((instrument) =>
				instrument.instrumentId === instrumentId
					? { ...instrument, isInWatchlist: isAdded }
					: instrument,
			),
		);
		onWatchlistChange?.(instrumentId, isAdded);
	};

	return (
		<CommandDialog open={open} onOpenChange={setOpen} className="search-dialog">
			<div className="search-field bg-gray-800! flex flex-row justify-between items-center gap-2! py-2">
				<div className="p-1  grow-3!">
					<CommandInput
						value={searchTerm}
						onValueChange={setSearchTerm}
						placeholder="Search instruments..."
						className="search-input border-0!  bg-gray-800! "
					/>
				</div>
				<div>{loading && <Loader2 className="search-loader mr-2" />}</div>
				<Select
					value={assetClass}
					onValueChange={(value) => {
						const nextAssetClass = value as AssetClass | "all";
						setAssetClass(nextAssetClass);
						if (nextAssetClass !== "equity") setSecurityType("all");
					}}
				>
					<SelectTrigger
						aria-label="Filter by asset class"
						size="sm"
						className="mr-2 w-36 border-gray-600 bg-gray-700 text-xs text-gray-200"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent className="z-60 border-gray-600 bg-gray-800 text-white">
						{ASSET_FILTERS.map((filter) => (
							<SelectItem key={filter.value} value={filter.value}>
								{filter.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{assetClass === "equity" ? (
					<Select
						value={securityType}
						onValueChange={(value) =>
							setSecurityType(value as EquitySecurityType | "all")
						}
					>
						<SelectTrigger
							aria-label="Filter by security type"
							size="sm"
							className="mr-2 w-44 border-gray-600 bg-gray-700 text-xs text-gray-200"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent className="z-60 border-gray-600 bg-gray-800 text-white">
							{SECURITY_TYPE_FILTERS.map((filter) => (
								<SelectItem key={filter.value} value={filter.value}>
									{filter.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : null}
			</div>
			<CommandList className="search-list max-h-[400px] overflow-hidden">
				{loading ? (
					<CommandEmpty className="search-list-empty">
						Loading instruments...
					</CommandEmpty>
				) : searchError && displayInstruments.length === 0 ? (
					<div className="search-list-indicator px-6 text-center text-amber-400">
						{searchError}
					</div>
				) : displayInstruments.length === 0 ? (
					<div className="search-list-indicator">
						{isSearchMode ? "No results found" : "No instruments available"}
					</div>
				) : (
					<>
						<div className="search-count">
							{isSearchMode
								? "Search results"
								: selectedSecurityType
									? "Available instruments"
									: "Popular instruments"}
							{` `}({displayInstruments.length})
						</div>
						<ScrollArea className="h-90 w-full" type="always">
							<ul>
								{displayInstruments.map((instrument) => (
									<li
										key={instrument.instrumentId}
										className="search-item flex items-center px-3 hover:bg-accent pr-6"
									>
										<Link
											href={instrument.href}
											onClick={handleSelectStock}
											className="search-item-link grow px-0"
										>
											<TrendingUp className="h-4 w-4 text-gray-500" />
											<div className="flex-1">
												<div className="search-item-name hover:underline">
													{instrument.name}
												</div>
												<div className="text-sm text-gray-500">
											{instrument.displaySymbol} |{" "}
											{instrument.assetClass === "equity"
												? equitySecurityTypeLabel(instrument.securityType)
												: instrument.assetClass}
													{instrument.venue ? ` | ${instrument.venue}` : ""}
												</div>
											</div>
										</Link>
										<WatchlistButton
											instrumentId={instrument.instrumentId}
											symbol={instrument.displaySymbol}
											company={instrument.name}
											isInWatchlist={instrument.isInWatchlist}
											onWatchlistChange={handleWatchlistChange}
											type="icon"
										/>
									</li>
								))}
							</ul>
						</ScrollArea>
					</>
				)}
			</CommandList>
		</CommandDialog>
	);
}
