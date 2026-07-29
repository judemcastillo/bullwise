import { formatNumberValue, formatWebsiteLabel } from "@/lib/utils";
import { Building2, Globe2 } from "lucide-react";
import StockDataRow from "./StockDataRow";
import type { StockDashboardData } from "./types";

export default function StockCompanyInfoCard({
	stock,
}: {
	stock: StockDashboardData | null;
}) {
	return (
		<section className="stock-card" aria-labelledby="company-info-heading">
			<div className="stock-card-heading">
				<h2 id="company-info-heading">Company info</h2>
				<Building2 aria-hidden="true" />
			</div>
			<div className="space-y-3 pt-4">
				<StockDataRow label="Industry" value={stock?.industry ?? "—"} />
				<StockDataRow label="Exchange" value={stock?.exchange ?? "—"} />
				<StockDataRow label="IPO" value={stock?.ipo ?? "—"} />
				<StockDataRow label="Country" value={stock?.country ?? "—"} />
				<StockDataRow
					label="Shares outstanding"
					value={formatNumberValue(stock?.shareOutstanding, "M")}
				/>
				{stock?.webUrl ? (
					<div className="flex items-center justify-between gap-4 text-sm">
						<span className="text-gray-500">Website</span>
						<a
							className="inline-flex min-w-0 items-center gap-1 truncate font-medium text-yellow-500 hover:text-yellow-400"
							href={stock.webUrl}
							target="_blank"
							rel="noopener noreferrer"
						>
							<Globe2 className="size-3.5 shrink-0" aria-hidden="true" />
							<span className="truncate">
								{formatWebsiteLabel(stock.webUrl)}
							</span>
						</a>
					</div>
				) : null}
			</div>
		</section>
	);
}
