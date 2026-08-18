import TradingViewWidget from "@/components/TradingViewWidget";
import {
	TOP_STORIES_WIDGET_CONFIG,
	TRADING_VIEW_EMBED_URL,
} from "@/lib/constants";

const TOP_STORIES_HEIGHT = 470;
const DASHBOARD_TOP_STORIES_WIDGET_CONFIG = {
	...TOP_STORIES_WIDGET_CONFIG,
	height: TOP_STORIES_HEIGHT,
};

export default function DashboardNews() {
	return (
		<section className="min-w-0">
			<div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
				<TradingViewWidget
					scriptUrl={`${TRADING_VIEW_EMBED_URL}timeline.js`}
					config={DASHBOARD_TOP_STORIES_WIDGET_CONFIG}
					height={TOP_STORIES_HEIGHT}
					className="!border-0"
				/>
			</div>
		</section>
	);
}
