# Daily swing broad development v2 expansion

Frozen on 2026-08-19 before retrieving histories or generating strategy outcomes for these candidates.

Manifest version: `2.0.0`

Universe name: `daily-swing-broad-development-v2-expansion`

## Decision and scope

The first broad-development dataset produced 4,620 episode-first training rows, 380 below the frozen 5,000-row coverage target. That is a sample-coverage failure, not evidence that the target, episode rule, strategy, features, validation period, or sealed test should change.

This manifest adds 30 candidates, leaving margin above the shortfall instead of selecting just enough instruments to reach 380 additional episodes. It is a separate expansion artifact: the original 100-symbol history, scan, dataset, episode artifact, and their hashes remain unchanged.

No per-symbol setup count, label rate, return, R-multiple, validation result, or test result was used to select or rank these candidates. The prior total of 4,620 training episodes was used only to determine that more independent coverage is required.

## Outcome-blind selection rules

- U.S.-listed, standard, unleveraged ETFs only.
- Official issuer inception on or before 2015-12-31, making full 2016 retrieval plausible.
- No overlap with the original 15 ETFs, the v2/v3 confirmation universes, the broad-development v1 candidates, or the SPY benchmark.
- Add exposure breadth across sector/industry, country, fixed-income, and real-asset/resource equity families.
- Present-day fund identity, structure, inception, category, and a coarse liquidity screen were allowed to avoid adding obviously unusable funds. Historical liquidity, strategy outcomes, and returns were not inspected for selection.
- Historical inclusion still depends on the unchanged frozen coverage and point-in-time liquidity gates; an inception date is not assumed to prove Alpaca coverage or historical liquidity.

Issuer information was checked against the official [Vanguard ETF list](https://workplace.vanguard.com/fund-list/?filters=etf), [iShares ETF list](https://www.ishares.com/us/products/etf-investments), [Schwab ETF finder](https://www.schwabassetmanagement.com/product-finder?combine=etf), [State Street BWX page](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-bloomberg-international-treasury-bond-etf-bwx), [Global X COPX page](https://www.globalxetfs.com/funds/COPX), and VanEck pages for [GDXJ](https://www.vaneck.com/us/en/investments/exchange-traded-funds/equity/gdxj-vaneck-junior-gold-miners-etf/) and [OIH](https://www.vaneck.com/us/en/investments/oil-services-etf-oih/overview/). The versioned TypeScript manifest records each candidate's issuer and inception date and is authoritative.

## Frozen candidates

- U.S. sector and industry: `VGT, VHT, VFH, VIS, VDC, VCR, VAW, VOX, IYZ, IGM`
- International and country: `VEU, VPL, EWI, EWP, EWL, EWN, EWD, EWM`
- Fixed income: `VGSH, VGIT, VGLT, SCHO, SCHR, BNDX, BWX, VWOB`
- Real-asset and resource equity: `COPX, GDXJ, OIH, REM`

SPY remains benchmark data only and is not a candidate. Tests enforce the count, uniqueness, symbol format, four-category breadth, pre-2016 inception cutoff, and zero overlap with every previously consumed candidate.

## Frozen retrieval and eligibility policy

- Alpaca SIP adjusted daily bars.
- Request 2016-01-01 through 2026-08-18.
- Require at least 2,500 bars per coverage-eligible instrument.
- The first available bar may be no more than 31 days after the requested start.
- Require at least 24 of the 30 expansion instruments to pass coverage before outcome generation.
- Reuse the exact v1 point-in-time liquidity rule: 19 of 20 valid completed sessions, at least $10 million median adjusted dollar volume, position notional no more than 1% of that median, and missing data ineligible.

Coverage and liquidity rules will not be loosened based on the number or outcomes of setups. The training target remains 5,000 combined episode-first rows. The episode rule, feature schema, label definition, strategy, fixed train period, 2023–2024 validation period, and sealed 2025+ test remain unchanged.

This static, currently available fund list has survival and present-day-liquidity selection bias. The coarse screen does not determine whether any historical setup is eligible; only the frozen 20-session, signal-time liquidity calculation can do that.

## Retrieval and coverage audit result

The frozen Alpaca retrieval completed on 2026-08-19. `analysis-broad-v2-expansion-history.json` is 24,110,790 bytes, has SHA-256 `7262c1a32e3cac8651c57daee97812c72edd6d39036e310e4259b25b37559505`, and records artifact creation at `2026-08-19T09:21:28.915Z`.

The read-only, outcome-blind audit found:

- The schema version, universe name, exact ordered 30-symbol manifest, Alpaca provider, requested dates, SPY benchmark, standard-ETF profiles, adjustment flags, and daily intervals all match the frozen contract.
- Twenty-eight candidates pass coverage, exceeding the frozen minimum of 24.
- Those 28 candidates each contain 2,671 bars from 2016-01-04 through 2026-08-18.
- GDXJ and OIH are the only coverage exclusions. Each contains 2,589 bars from 2016-05-02 through 2026-08-18, so each passes the 2,500-bar minimum but fails `first_bar_after_maximum_delay`.
- SPY contains 2,671 bars from 2016-01-04 through 2026-08-18.
- No candidate or benchmark history has a missing or non-positive reported volume, an invalid/duplicate/non-chronological timestamp, or a missing requested final session.

The 24-instrument coverage gate passes without changing any rule. No setup was generated, no label or return was inspected, and no validation or sealed-test data was opened.

## Frozen scan implementation

The expansion-specific exhaustive-scan policy was implemented and verified before outcome generation. It requires the exact source SHA-256, exact ordered 30-symbol manifest, frozen Alpaca metadata, and at least 24 coverage-eligible instruments. It automatically excludes GDXJ and OIH with the frozen coverage function and reuses strategy v1, objective-feature v1, independent fixed-equity labeling, and the unchanged point-in-time liquidity rule.

## Exhaustive expansion scan and integrity audit

The protected expansion scan completed on 2026-08-19. `analysis-broad-v2-expansion-setup-scan.json` is 99,373,971 bytes, has SHA-256 `9a21909cdc21ecc49521630cd873bd74f8711a77d276c99392618ba7fb695305`, and records generation at `2026-08-19T09:30:57.316Z`.

It uses setup-scan version `2.0.0`, backtest version `1.3.0`, engine version `1.0.0`, strategy `daily-swing-v1-draft`, objective-feature version `1.0.0`, and research policy `broad_development_v2_expansion`. The scan records:

- 30 candidates received, 28 instruments scanned, and the two frozen outcome-blind coverage exclusions.
- 66,416 completed-bar analyses.
- 28,027 objective feature snapshots.
- 9,137 setups rejected before labeling by the frozen signal-time liquidity rule.
- 18,890 liquidity-eligible labeled setups: 13,873 triggered and 5,017 untriggered.

The read-only integrity audit found zero violations. All report versions and source provenance match the frozen contract; aggregate and per-instrument inventories reconcile; every objective snapshot has matching instrument/timestamp provenance and finite-or-null feature values; every liquidity-eligible label joins exactly one eligible snapshot; and no rejected snapshot has an outcome label.

These are source-inventory counts, not profitability or model-quality results. No return, target rate, symbol ranking, training-episode total, validation result, or sealed-test label was inspected.

## Authorized next step

Implement a deterministic combined broad dataset that requires both frozen scan hashes, preserves the existing time splits and purges, and keeps the expansion rows separate in provenance. Then materialize episode-first training rows and check only whether the combined count reaches 5,000.

Do not inspect validation or sealed-test labels, fit a model, rank symbols, or measure profitability before the combined coverage gate is evaluated.
