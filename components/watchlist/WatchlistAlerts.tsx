"use client";

import {
	AlertDetailsDialog,
	CreateAlertDialog,
} from "@/components/alerts/AlertDialogs";
import { Button } from "@/components/ui/button";
import type { AlertDto, AlertInstrumentOption } from "@/types/alerts";
import { BellRing, Mail, Radio } from "lucide-react";
import { useState } from "react";

export default function WatchlistAlerts({
	alerts,
	instruments,
}: {
	alerts: AlertDto[];
	instruments: AlertInstrumentOption[];
}) {
	const [createOpen, setCreateOpen] = useState(false);
	const [selectedAlert, setSelectedAlert] = useState<AlertDto | null>(null);

	return (
		<>
			<aside className="watchlist-alerts" aria-labelledby="alerts-heading">
				<div className="watchlist-section-heading">
					<div>
						<p className="watchlist-eyebrow">Price monitoring</p>
						<h2 id="alerts-heading" className="watchlist-title">
							Alerts
						</h2>
					</div>
					<Button
						type="button"
						className="watchlist-primary-action"
						disabled={instruments.length === 0}
						title={
							instruments.length === 0
								? "Add an instrument to your watchlist first"
								: "Create a price alert"
						}
						onClick={() => setCreateOpen(true)}
					>
						Create alert
					</Button>
				</div>

				<div className="alert-list">
					{alerts.length === 0 ? (
						<div className="alert-empty">
							<span className="alert-empty-icon" aria-hidden="true">
								<BellRing />
							</span>
							<h3>No price alerts yet</h3>
							<p>
								Create an alert from a watchlist row to save your first
								target.
							</p>
							<div className="alert-status-note">
								<Radio aria-hidden="true" />
								<span>Active alerts are checked every minute.</span>
							</div>
						</div>
					) : (
						alerts.map((alert) => (
							<button
								type="button"
								className="alert-item w-full cursor-pointer text-left transition-colors hover:border-yellow-500/40"
								key={alert.id}
								onClick={() => setSelectedAlert(alert)}
							>
								<div className="mb-3 flex items-start justify-between gap-3">
									<div className="min-w-0">
										<h3 className="alert-name truncate">{alert.name}</h3>
										<p className="alert-company truncate">
											{alert.instrument.name}
										</p>
									</div>
									<span
										className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
											alert.status === "active"
												? "bg-yellow-500/10 text-yellow-500"
												: "bg-gray-600 text-gray-300"
										}`}
									>
										{alert.status === "active" ? "Configured" : alert.status}
									</span>
								</div>
								<div className="alert-details">
									<span className=" text-xs text-gray-400">
										{alert.instrument.displaySymbol}
									</span>
									<span className="alert-price">
										{alert.operator === "crosses_above" ? ">" : "<"}{" "}
										{alert.threshold} {alert.instrument.quoteCurrency}
									</span>
								</div>
								<div className="flex items-center gap-2 text-xs text-gray-500">
									<Mail aria-hidden="true" className="size-3.5" />
									{alert.emailEnabled ? "Email selected" : "Email disabled"}
								</div>
							</button>
						))
					)}
				</div>
			</aside>

			<CreateAlertDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				instruments={instruments}
			/>
			<AlertDetailsDialog
				alert={selectedAlert}
				open={Boolean(selectedAlert)}
				onOpenChange={(open) => {
					if (!open) setSelectedAlert(null);
				}}
			/>
		</>
	);
}
