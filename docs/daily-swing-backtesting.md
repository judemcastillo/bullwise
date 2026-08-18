# Daily swing backtesting

The backtester performs a chronological, single-instrument walk-forward simulation around `analyzeDailySwing`. It is research infrastructure; its results are not yet suitable for customer-facing recommendations or live orders.

## Method

- Each analysis receives only bars at or before its completed-session timestamp.
- A setup can first fill on the next completed bar and expires after the trade plan's configured setup window.
- Only one pending setup or open trade is active for the instrument at a time.
- Position size risks a fixed percentage of current equity between the modeled entry and stop.
- Target 1 closes half of the position. Target 2 closes the remainder.
- A stop and target touched within the same daily candle use `stop_first` by default. This is deliberately conservative because daily OHLC data cannot reveal intraday ordering.
- Entry and exit slippage and transaction costs are configurable independently.
- Open positions close at the configured maximum holding period or the end of the dataset.
- Maximum drawdown marks open positions to every completed bar's close, including realized and unrealized P&L and incurred transaction costs. It does not estimate intraday portfolio drawdown within a daily candle.

The report includes trade-level results, equity and drawdown, direction and regime breakdowns, untriggered setups, buy-and-hold comparisons, and a simple SMA200 plus 20-day-momentum baseline.

Data-provider adjustment policies matter when interpreting returns:

- Massive REST aggregates marked adjusted are split-adjusted but not dividend-adjusted. ETF strategy and buy-and-hold figures produced from Massive data are price returns and exclude distributions.
- The Alpaca exporter requests SIP bars with `adjustment=all`. Its returns incorporate Alpaca's split, cash-dividend, merger, and spin-off adjustments. It intentionally does not fall back to the limited-volume IEX feed if SIP access is denied.

## Run it offline

Fetch a default AAPL history with SPY as the benchmark, then run it:

```sh
npm run fetch:backtest-history
npm run backtest:daily-swing -- history.json --output=report.json
```

Choose another common stock or a standard ETF with exporter options:

```sh
npm run fetch:backtest-history -- --symbol=MSFT --from=2018-01-01 --output=msft-history.json
npm run fetch:backtest-history -- --symbol=QQQ --security-type=etf --benchmark=SPY --output=qqq-history.json
```

Run `npm run fetch:backtest-history -- --help` for every available option. The exporter refuses to replace an existing file unless `--force` is supplied.

## Run the ETF batch

The default batch contains SPY, QQQ, IWM, DIA, and the 11 Select Sector SPDR ETFs. SPY is fetched once and reused as the benchmark:

```sh
npm run fetch:backtest-batch
npm run backtest:daily-swing-batch
```

For longer history, place Alpaca credentials in `.env` using either naming pair:

```dotenv
ALPACA_API_KEY_ID=your-key-id
ALPACA_API_SECRET_KEY=your-secret-key
```

The aliases `ALPACA_API_KEY` and `ALPACA_API_SECRET` are also accepted. Then fetch and analyze Alpaca data without replacing the Massive bundle:

```sh
npm run fetch:backtest-batch -- --provider=alpaca --force
npm run backtest:daily-swing-batch -- alpaca-batch-history.json --output=alpaca-batch-report.json
```

If both provider bundles exist, compare their overlapping dates, adjusted returns, closing price, and volume:

```sh
npm run audit:backtest-providers
```

The audit writes `provider-audit.json` and exits unsuccessfully when its coverage or divergence thresholds fail.

The second command writes `batch-report.json` and prints the aggregate result directly. Its `diagnostics` section breaks performance down by setup, direction, trend, volatility, combined regime, terminal exit, and holding period. It also compares configured execution friction with frictionless and stressed scenarios. To refresh an existing history bundle, pass `--force`. A custom universe can be supplied as a comma-separated list:

```sh
npm run fetch:backtest-batch -- --symbols=SPY,QQQ,IWM,DIA --force
```

Every ETF receives an independent account with equal starting equity. The aggregate average therefore describes equal-weight instrument results; it is not a portfolio simulation and does not model overlapping capital requirements.

After generating a batch report with backtest version 1.2 or later, replay its candidate trades through one shared account:

```sh
npm run backtest:daily-swing-portfolio -- alpaca-batch-report.json --output=portfolio-report.json
```

The default portfolio starts with $100,000, risks 1% per accepted trade, allows at most five opening positions and 5% aggregate committed risk, and caps gross exposure at 100% when accepting a trade. All limits can be changed explicitly; run `npm run backtest:daily-swing-portfolio -- --help` for the options.

The portfolio replay sizes accepted trades from then-current shared equity and rejects candidates that exceed a position, risk, or gross-exposure limit. Same-session candidates use deterministic symbol ordering, and a position exiting during that session still consumes opening capacity. This is conservative and avoids assuming an unknown intraday event order. The candidate stream still comes from the one-trade-at-a-time per-instrument simulations, so this is stronger portfolio accounting rather than a fully event-driven multi-instrument signal scanner.

The batch report considers 1,250 daily bars the minimum multi-regime research depth and 2,500 bars the recommended depth. These thresholds are coverage gates, not evidence that a strategy is profitable or product-ready.

The input is ordinary JSON. All dates must be ISO-8601 strings:

```json
{
  "instrument": {
    "instrumentId": "equity:us:aapl",
    "displaySymbol": "AAPL",
    "assetClass": "equity",
    "securityType": "common_stock",
    "currency": "USD",
    "pricePrecision": 2
  },
  "marketData": {
    "instrumentId": "equity:us:aapl",
    "provider": "massive",
    "providerSymbol": "AAPL",
    "currency": "USD",
    "interval": "1d",
    "from": "2020-01-02T00:00:00.000Z",
    "to": "2025-12-31T00:00:00.000Z",
    "adjusted": true,
    "timeliness": "historical",
    "bars": [
      {
        "startedAt": "2020-01-02T00:00:00.000Z",
        "open": "74.06",
        "high": "75.15",
        "low": "73.80",
        "close": "75.09",
        "volume": "135480400"
      }
    ]
  },
  "startAt": "2022-01-01T00:00:00.000Z",
  "endAt": "2025-12-31T00:00:00.000Z",
  "configuration": {
    "initialEquity": 100000,
    "riskPerTradePercent": 1,
    "transactionCostBpsPerSide": 2,
    "slippageBpsPerFill": 3,
    "maximumHoldingBars": 20,
    "sameBarPolicy": "stop_first",
    "allowShortSetups": false
  }
}
```

At least 300 adjusted daily bars are needed before the first evaluation. Historical bars before `startAt` are retained only as indicator warm-up data. Add `benchmarkData` in the same shape to calculate benchmark-relative analysis and a benchmark buy-and-hold baseline.

## Before product exposure

Run broad instrument and market-regime coverage, then evaluate out-of-sample performance separately from parameter selection. Inspect trade count, drawdown, expectancy in R, profit factor, sensitivity to higher friction, and stability across regimes. Add delisted securities and point-in-time index membership before treating portfolio-level results as credible; otherwise survivorship bias can materially overstate performance.

## Frozen v2 confirmation

The v2 hypothesis, untouched cross-asset ETF universe, and pass criteria are recorded in `docs/daily-swing-v2-preregistration.md`. Reproduce its data retrieval and one-shot confirmation with:

```sh
npm run fetch:backtest-v2-holdout -- --force
npm run backtest:daily-swing-v2-holdout
```

The result is written to `v2-holdout-report.json`, including a machine-readable `confirmation` section. The 2026-08-19 confirmation failed two frozen criteria: average R multiple and stressed-cost profit factor. V2 is therefore rejected and must not be exposed as a customer signal or tuned and re-run on that holdout universe.

## Frozen v3 portfolio confirmation

The v3 hypothesis, untouched 20-ETF universe, deterministic candidate-ranking policy, and pass criteria are recorded in `docs/daily-swing-v3-preregistration.md`. After producing the frozen source report, run the one-shot comparison with:

```sh
npm run evaluate:daily-swing-v3-holdout
```

The result is written to `v3-holdout-report.json`. The 2026-08-19 confirmation failed six of seven criteria. The ranked policy accepted 379 trades, produced a 0.0752 average R multiple, 1.1651 profit factor, 2.6922% annualized return, and 20.4076% maximum drawdown. It also underperformed the deterministic symbol-order baseline by 0.1762 percentage points annualized and 0.0050 R per trade. V3 is rejected and must not be exposed as a customer signal or tuned and re-run on this holdout universe.
