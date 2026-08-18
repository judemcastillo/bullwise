"use client";

import { useState } from "react";
import { BellPlus } from "lucide-react";
import type { AlertInstrumentOption } from "@/types/alerts";
import { CreateAlertDialog } from "./AlertDialogs";

export default function StockAlertButton({
	instrument,
	label = "Create alert",
	disabledReason,
}: {
	instrument: AlertInstrumentOption | null;
	label?: string;
	disabledReason?: string;
}) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				type="button"
				className="stock-alert-btn disabled:cursor-not-allowed disabled:opacity-50 hover:bg-yellow-300"
				disabled={!instrument}
				title={!instrument ? disabledReason : undefined}
				onClick={() => setOpen(true)}
			>
				<BellPlus aria-hidden="true" />
				{label}
			</button>
			<CreateAlertDialog
				open={open}
				onOpenChange={setOpen}
				instruments={instrument ? [instrument] : []}
				initialInstrument={instrument}
			/>
		</>
	);
}
