"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

type StockLogoProps = {
	company: string;
	logo?: string | null;
	symbol: string;
	className?: string;
};

export default function StockLogo({
	company,
	logo,
	symbol,
	className,
}: StockLogoProps) {
	const [hasImageError, setHasImageError] = useState(false);
	const showLogo = Boolean(logo) && !hasImageError;

	return (
		<span
			className={cn(
				"flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-600 bg-gray-700 text-lg font-bold text-yellow-500",
				className,
			)}
		>
			{showLogo ? (
				// Finnhub returns externally hosted company logo URLs.
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={logo ?? ""}
					alt={`${company} logo`}
					className="size-full object-contain"
					onError={() => setHasImageError(true)}
				/>
			) : (
				<span aria-hidden="true">{symbol.slice(0, 1).toUpperCase()}</span>
			)}
		</span>
	);
}
