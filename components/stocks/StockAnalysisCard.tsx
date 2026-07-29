import TradingViewWidget from "@/components/TradingViewWidget";
import {
	TECHNICAL_ANALYSIS_WIDGET_CONFIG,
	TRADING_VIEW_EMBED_URL,
} from "@/lib/constants";

export default function StockAnalysisCard({ symbol }: { symbol: string }) {
	return (
		<section className="stock-card" aria-labelledby="analysis-heading">
			<div className="stock-card-heading">
				<h2 id="analysis-heading">Analysis</h2>
			</div>
			<div className="pt-4">
				<TradingViewWidget
					scriptUrl={`${TRADING_VIEW_EMBED_URL}technical-analysis.js`}
					config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(symbol)}
					height={290}
					className="stock-analysis-widget"
				/>
			</div>
		</section>
	);
}
