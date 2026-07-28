import { BellRing, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WatchlistAlerts() {
	return (
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
					disabled
					title="Alert creation will be connected to the price-monitoring service next"
				>
					Create alert
				</Button>
			</div>

			<div className="alert-list">
				<div className="alert-empty">
					<span className="alert-empty-icon" aria-hidden="true">
						<BellRing />
					</span>
					<h3>No price alerts yet</h3>
					<p>
						Create an alert from a watchlist row to get notified when a
						stock reaches your target.
					</p>
					<div className="alert-status-note">
						<Radio aria-hidden="true" />
						<span>Live price monitoring is the next integration step.</span>
					</div>
				</div>
			</div>
		</aside>
	);
}
