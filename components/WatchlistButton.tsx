"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Star, Trash2 } from "lucide-react";
import { useState } from "react";

const WatchlistButton = ({
	symbol,
	company,
	isInWatchlist,
	showTrashIcon = false,
	type = "button",
	onWatchlistChange,
}: WatchlistButtonProps) => {
	const [isAdded, setIsAdded] = useState(isInWatchlist);

	const toggleWatchlist = () => {
		const nextIsAdded = !isAdded;
		setIsAdded(nextIsAdded);
		onWatchlistChange?.(symbol, nextIsAdded);
	};

	const label = isAdded ? "Remove from Watchlist" : "Add to Watchlist";

	if (type === "icon") {
		return (
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className={cn("watchlist-icon-btn", isAdded && "watchlist-icon-added")}
				aria-label={`${label}: ${company}`}
				aria-pressed={isAdded}
				onClick={toggleWatchlist}
			>
				{showTrashIcon && isAdded ? (
					<Trash2 className="trash-icon" />
				) : (
					<Star className="star-icon" fill={isAdded ? "currentColor" : "none"} />
				)}
			</Button>
		);
	}

	return (
		<Button
			type="button"
			className={cn("watchlist-btn", isAdded && "watchlist-remove")}
			aria-label={`${label}: ${company}`}
			aria-pressed={isAdded}
			onClick={toggleWatchlist}
		>
			{label}
		</Button>
	);
};

export default WatchlistButton;
