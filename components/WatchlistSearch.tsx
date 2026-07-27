"use client";

import { useState } from "react";
import SearchCommand from "@/components/SearchCommand";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function WatchlistSearch({
	initialStocks,
	stockMembershipKey,
}: {
	initialStocks: StockWithWatchlistStatus[];
	stockMembershipKey: string;
}) {
	const [open, setOpen] = useState(false);
	const router = useRouter();

	return (
		<>
			<Button type="button" className="search-btn" onClick={() => setOpen(true)}>
				Add stock
			</Button>
			<SearchCommand
				key={stockMembershipKey}
				open={open}
				setOpen={setOpen}
				initialStocks={initialStocks}
				onWatchlistChange={() => router.refresh()}
			/>
		</>
	);
}
