"use client";

import SearchCommand from "@/components/SearchCommand";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WatchlistSearch({
	instrumentMembershipKey,
}: {
	instrumentMembershipKey: string;
}) {
	const [open, setOpen] = useState(false);
	const router = useRouter();

	return (
		<>
			<Button type="button" className="search-btn" onClick={() => setOpen(true)}>
				Add stock
			</Button>
			<SearchCommand
				key={instrumentMembershipKey}
				open={open}
				setOpen={setOpen}
				onWatchlistChange={() => router.refresh()}
			/>
		</>
	);
}
