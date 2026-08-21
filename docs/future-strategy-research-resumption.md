# Future strategy research resumption guide

Status: parked for possible future use

Recorded: 2026-08-21

Purpose: explain how to start a genuinely new Bullwise trading-strategy experiment without rerunning, repairing, or relabelling the closed research family.

## Current conclusion

Bullwise has a useful deterministic analysis and research engine, but it does not currently have a validated profitable trading strategy.

The completed work should be interpreted precisely:

- The original daily-swing ETF batch lost money after simulated costs and materially trailed buy-and-hold.
- The broad combined classifiers had weak discrimination and failed their frozen gates.
- Train-only audits found negative average utility for the existing strategy mechanics.
- The benchmark-risk redesign and symmetric long/short redesign remained negative after costs.
- Cross-sectional ETF momentum passed many individual checks but failed its complete gate set, with excessive drawdown for the frozen requirements.
- Risk-controlled momentum v3 produced no performance result. Its registered source lacked a held-position valuation bar on a consequential stress session, so the experiment closed as `source_infeasible_without_complete_valuation_data` before a report or gate decision existed.

Do not summarize v3 as profitable or unprofitable. It was not evaluable under its frozen source contract.

## What remains reusable

Keep and reuse:

- adjusted-bar validation and data provenance;
- completed-bar and signal-time leakage protections;
- deterministic indicators and market structure;
- trade and portfolio simulation infrastructure;
- commissions, slippage, borrow-cost, and cost-stress modelling;
- chronological splitting, purging, checksum registration, and no-overwrite reports;
- synthetic fixtures, aggregate reporting, and validation/holdout safeguards.

Do not reuse as an assumed edge:

- the rejected daily-swing entry and exit rules;
- its buy/sell/setup labels or trade plans;
- the rejected model scores or thresholds;
- the rejected benchmark-risk or symmetric-regime filters;
- the exact v3 candidate or its incomplete source as if it had passed.

## Candidate new research families

These are research questions, not recommendations or authorized experiments.

### 1. Liquid ETF daily mean reversion — preferred feasibility candidate

Hypothesis: after unusually large short-term moves, highly liquid diversified ETFs may partially revert over a short holding period, subject to an outcome-blind volatility or market-regime rule.

Why it is materially different: the closed family primarily pursued trend, breakout, momentum, and ranking effects. Mean reversion predicts the opposite short-horizon behavior.

Main risks: high turnover, gap risk, trading costs, crowded signals, crisis behavior, and accidental tuning of lookbacks or thresholds.

Minimum source needs: complete adjusted daily OHLCV, a predeclared liquid universe, reliable session calendars, corporate-action handling, and enough history to include quiet, crisis, recovery, inflation, and rate-shock regimes.

### 2. Multi-asset time-series trend — secondary candidate

Hypothesis: each liquid asset's own medium-term direction may contain information about its subsequent return, with slow rebalancing and explicit volatility control.

Why it might be viable: it is simpler and potentially lower-turnover than the rejected setup engine.

Why it is not first: it remains related to momentum, so the new charter must show that it is not merely v3 with changed parameters. Futures-quality continuous histories, roll rules, and cross-asset comparability may also increase source cost.

### 3. Earnings or news drift — defer unless point-in-time data become available

Hypothesis: market prices may adjust gradually to genuinely new company information.

Why it is different: the explanatory input is a timestamped event rather than price pattern alone.

Why it is deferred: valid testing requires point-in-time event timestamps, revisions, delisted securities, historical constituents, and strict prevention of publication-time leakage. Current price history alone is insufficient.

## Mandatory restart sequence

Follow these phases in order. A later phase is not authorized merely because an earlier phase is complete.

### Phase 0 — recover context

1. Read this guide, `docs/analysis-feature-product-direction.md`, and the closure section of `docs/etf-risk-controlled-momentum-v3-preregistration.md`.
2. Confirm the working tree state with `git status --short`.
3. Confirm that `npm run develop:etf-risk-controlled-momentum-v3` remains closed. Do not remove its guard.
4. Do not fetch data, open large artifacts, run a backtest, train a model, or inspect validation/holdout data during context recovery.

### Phase 1 — write one falsifiable research charter

Create `docs/<new-development-id>-research-charter.md` before writing strategy code.

The charter must state:

- one economic or behavioral rationale;
- one primary hypothesis and its predicted direction;
- instrument and asset-class scope;
- expected holding period and rebalance frequency;
- data fields and point-in-time requirements;
- major implementation and market risks;
- why the candidate is materially different from every rejected family;
- what result would falsify the hypothesis;
- a bounded exploration budget, including the maximum number of variants permitted on development-only data.

Do not combine all three candidate families in one backtest. Pick one.

### Phase 2 — inventory prior access and prove source feasibility

Before calculating any candidate return:

1. Inventory every relevant existing artifact, provider, symbol universe, date range, and split that has already been accessed.
2. Mark previously inspected outcomes as development-contaminated. They may be used for exploration if documented, but never represented as untouched validation or holdout evidence.
3. Define proposed development, validation, and holdout boundaries. Prefer genuinely new data; future forward data may be the only defensible final holdout if historical periods have already been inspected extensively.
4. Audit provider entitlements, adjustment semantics, delisted-symbol availability, survivorship bias, exchange calendars, missing sessions, duplicates, currency, and benchmark coverage.
5. For event strategies, verify original publication timestamps and revision history.
6. Write only aggregate, outcome-blind coverage diagnostics.
7. Register the immutable source artifact byte size and SHA-256 in a separate commit before calculating performance.

If source coverage fails a frozen requirement, record `source_infeasible`, preserve the evidence, and stop. Do not forward-fill a stress session, silently delete dates, substitute symbols, weaken coverage, or mix providers after observing the defect.

### Phase 3 — freeze the executable preregistration

Create `docs/<new-development-id>-preregistration.md` and a machine-readable protocol constant.

Freeze at least:

- source paths, byte sizes, checksums, provider, adjustment, and calendars;
- exact outcome-blind universe and benchmark;
- development, validation, holdout, purge, and embargo boundaries;
- signal timestamp and earliest legal execution timestamp;
- entry, exit, holding-period, overlap, and same-bar collision rules;
- position sizing, capital sharing, exposure caps, and cash handling;
- commissions, spread/slippage, market impact assumptions, borrow costs, and stress costs;
- comparators and baselines;
- trial count and model or parameter search space;
- minimum coverage and sample-size requirements;
- economic, risk, robustness, and baseline-improvement gates;
- aggregate report schema and prohibited symbol-level searches;
- fail-closed behavior for missing data and implementation errors;
- exact decisions permitted by pass, fail, or source infeasibility.

Gate thresholds must be frozen before the registered outcome run. They should cover net expectancy or return, drawdown, risk-adjusted performance, profit factor where applicable, trade or holding-period count, cost stress, subperiod consistency, concentration, turnover, and improvement over simple baselines. Do not choose thresholds after viewing candidate results.

### Phase 4 — implement without real outcomes

1. Build deterministic types, simulator logic, report writer, and guarded command.
2. Use synthetic fixtures to test long, short if applicable, cash, gaps, missing sessions, corporate actions, costs, ambiguous bars, concurrent positions, and end-of-data valuation.
3. Prove that bars after the signal timestamp cannot affect the signal.
4. Prove that validation and holdout readers are not imported or invoked by development code.
5. Prove deterministic output for the same frozen input.
6. Make reports aggregate-only and no-overwrite by default.
7. Run the smallest relevant tests during development and the full analysis suite only at the final implementation checkpoint.
8. Review and commit the evaluator before opening the registered development artifact.

### Phase 5 — run development once

The user must explicitly authorize the exact registered development command after reviewing the source registration, preregistration, evaluator, and tests.

The run must:

- verify byte size and SHA-256 before parsing;
- accept no provider, symbol, date, parameter, cost, or output overrides;
- read development data only;
- refuse to overwrite a prior report;
- print a compact aggregate summary;
- record whether any validation or holdout features or labels were read.

Decision rules:

- If the source fails, close as source-infeasible.
- If any mandatory development gate fails, reject the exact candidate.
- Do not change a failed threshold and rerun the same candidate.
- Exploratory follow-up is allowed only if it was inside the charter's unused development-only trial budget and creates a newly versioned candidate before another outcome run.
- A development pass authorizes only preparation of a separately frozen validation evaluator.

### Phase 6 — one-shot validation

Before validation:

1. Commit the passing development report checksum.
2. Freeze validation source checksum, evaluator, gates, and confirmation command without reading validation outcomes.
3. Test the evaluator only with synthetic fixtures.
4. Obtain explicit user authorization for the one real validation run.

A validation failure rejects the candidate. Do not tune on validation and call the rerun validation. Any revision returns to a new development version, and the examined validation period becomes development-contaminated.

### Phase 7 — untouched holdout or forward observation

Only a preregistered validation pass can authorize holdout preparation. The final holdout must be genuinely unexamined for this research program. If no historical period meets that requirement, use a frozen forward-observation period and wait for new data.

One holdout pass is evidence of robustness, not a guarantee of future profitability. Paper trading, operational monitoring, risk limits, and regulatory/product review still come before customer-facing signals or live orders.

## Adding AI to a future strategy experiment

Do not ask an AI model to discover arbitrary profitable rules from all available data.

AI becomes a candidate component only after a deterministic baseline is economically credible on development data. Then preregister one narrow role, such as ranking already valid setups, classifying a point-in-time event, or calibrating risk. Require:

- signal-time-only, versioned model inputs;
- a deterministic baseline comparison;
- fixed training, validation, and holdout boundaries;
- model, prompt, seed, preprocessing, and hyperparameter records;
- realistic inference cost and latency;
- calibration and abstention behavior;
- proof that AI output cannot bypass portfolio risk rules;
- the same one-shot validation and holdout discipline.

An LLM narrative that explains deterministic market context is a product feature, not evidence that a trading strategy is profitable.

## Stop conditions

Stop and record the state when any of these occurs:

- required source history is unavailable, incomplete, wrongly adjusted, or survivorship-biased beyond the frozen allowance;
- a frozen checksum, universe, boundary, or evaluator changes unexpectedly;
- future bars or protected labels are read;
- sample size or instrument coverage misses its minimum;
- development or validation fails a mandatory gate;
- the requested repair depends on seeing the failed outcome;
- costs, slippage, borrow, valuation, or portfolio exposure cannot be modelled credibly.

Stopping is a valid research result. It prevents a weak or contaminated experiment from becoming a customer claim.

## Quick restart checklist

- [ ] Choose exactly one materially different hypothesis.
- [ ] Write and commit its research charter.
- [ ] Inventory previously accessed periods and mark contamination.
- [ ] Audit source feasibility without calculating outcomes.
- [ ] Freeze split boundaries and reserve a genuinely untouched holdout.
- [ ] Register source size and checksum in a separate commit.
- [ ] Freeze all mechanics, costs, baselines, searches, reports, and gates.
- [ ] Implement and test with synthetic fixtures only.
- [ ] Commit the evaluator before the registered development run.
- [ ] Obtain explicit authorization for each real outcome-bearing command.
- [ ] Stop on source failure or any mandatory gate failure.
- [ ] Never describe development evidence as validated profitability.

## Recommended first action when research resumes

Create the research charter for the liquid-ETF daily mean-reversion hypothesis. Do not fetch data yet. The first review should decide whether the rationale is sufficiently distinct and whether a complete, survivorship-aware, multi-regime source is realistically obtainable at the available budget.

This guide is a handoff, not authorization to begin an experiment, inspect protected data, emit customer signals, or trade.
