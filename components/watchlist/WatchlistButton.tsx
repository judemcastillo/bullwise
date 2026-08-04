"use client";

import {
	addToWatchlist,
	removeFromWatchlist,
} from "@/lib/actions/watchlist.actions";
import { Star, Trash2 } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { toast } from "sonner";

export default function WatchlistButton({
	symbol,
	company,
	isInWatchlist,
	showTrashIcon = false,
	type = "button",
	onWatchlistChange,
}: WatchlistButtonProps) {
	const [isAdded, setIsAdded] = useState<boolean>(!!isInWatchlist);
	const [isPending, setIsPending] = useState(false);

	const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		event.preventDefault();
		if (isPending) return;

		const wasAdded = isAdded;
		const nextIsAdded = !wasAdded;
		setIsAdded(nextIsAdded);
		setIsPending(true);

		try {
			const result = wasAdded
				? await removeFromWatchlist(symbol)
				: await addToWatchlist(symbol, company);

			if (!result.success) {
				throw new Error(
					"error" in result ? result.error : "Unable to update watchlist",
				);
			}

			toast.success(
				wasAdded ? "Removed from Watchlist" : "Added to Watchlist",
				{
					description: `${company} ${wasAdded ? "removed from" : "added to"} your watchlist`,
				},
			);
			onWatchlistChange?.(symbol, nextIsAdded);
		} catch (error) {
			setIsAdded(wasAdded);
			toast.error(
				error instanceof Error
					? error.message
					: "Unable to update your watchlist",
			);
		} finally {
			setIsPending(false);
		}
	};

	const label = isAdded ? "Remove from Watchlist" : "Add to Watchlist";

	if (type === "icon") {
		return (
			<button
				type="button"
				title={`${label}: ${symbol}`}
				aria-label={`${label}: ${company}`}
				aria-pressed={isAdded}
				className={`watchlist-icon-btn ${isAdded ? "watchlist-icon-added" : ""}`}
				disabled={isPending}
				onClick={handleClick}
			>
				{showTrashIcon && isAdded ? (
					<Trash2 className="trash-icon" />
				) : (
					<Star className="star-icon" fill={isAdded ? "currentColor" : "none"} />
				)}
			</button>
		);
	}

	return (
		<button
			type="button"
			aria-label={`${label}: ${company}`}
			aria-pressed={isAdded}
			className={`watchlist-btn ${isAdded ? "watchlist-remove" : ""}`}
			disabled={isPending}
			onClick={handleClick}
		>
			{showTrashIcon && isAdded ? <Trash2 /> : null}
			<span>{label}</span>
		</button>
	);
}
