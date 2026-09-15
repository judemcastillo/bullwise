# Graph Report - bullwise  (2026-09-09)

## Corpus Check
- 553 files · ~289,933 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3452 nodes · 8255 edges · 152 communities (144 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 100 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8663c01e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scripts
- transparent-analysis-ai-question-routing.ts
- technical-analysis.ts
- dependencies
- functions.ts
- stock-data.ts
- transparent-analysis-ai-selection-evaluation-v1-5.ts
- sync-instrument-catalog.ts
- watchlist/page.tsx
- MarketBar
- portfolio-backtest.ts
- email-delivery.ts
- Graphify Pipeline
- combined-broad-model-runner.ts
- types/instruments.ts
- technical-analysis.types.ts
- analysis-dataset.ts
- risk-controlled-momentum-v3-runner.ts
- combined-broad-train-diagnostic-runner.ts
- episode-validation.ts
- massive-bars-client.ts
- analysis-dataset.test.ts
- combined-broad-episode-dataset.ts
- constants.ts
- backtest.ts
- combined-broad-strategy-target-audit-runner.ts
- processor.ts
- symmetric-regime-strategy-runner.ts
- cross-sectional-momentum-runner.ts
- types.ts
- DailyMarketAnalysisCard.tsx
- training-diagnostics.ts
- global.d.ts
- compilerOptions
- batch-diagnostics.ts
- combined-broad-strategy-redesign-runner.ts
- transparent-analysis-panel.ts
- email-suppression.ts
- unsubscribe-token.ts
- AlertDialogs.tsx
- UserDropdown.tsx
- setup-scan.ts
- OnboardingForm.tsx
- buildTransparentAnalysisAiInput
- equity-catalog.ts
- devDependencies
- content-safety.ts
- require-user.ts
- baseline-model.types.ts
- sign-in/page.tsx
- transparent-analysis-ai-contract.ts
- Transparent analysis AI fact-selection v1.5 preregistration
- watchlist.ts
- components.json
- access-policy.ts
- transparent-analysis-orchestrator.ts
- utils.ts
- market-data/service.ts
- combined-broad-train-source.ts
- risk-controlled-momentum-v3-history.ts
- backtest-daily-swing-batch.ts
- AnalysisDatasetFeatureVector
- objective-features.ts
- email-rendering.ts
- broad-episode-dataset.ts
- us-equity-session.ts
- communication-policy.ts
- baseline-model.ts
- Transparent analysis AI latency observation v1 preregistration
- market-data/finnhub.ts
- Transparent analysis AI provider pacing v1 preregistration
- user-alerts.ts
- boosted-model.ts
- transparent-analysis-ai-topic-routing-v2.ts
- mongoose.ts
- transparent-analysis-ai-selection-acceptance-v1-fixtures.ts
- setup-scan.types.ts
- Transparent analysis AI explanation v1.3 preregistration
- combined-broad-model-development.ts
- email/run-tests.ts
- email-client-compatibility.test.ts
- Q: Can you make the terms and privacy to be separate pages
- transparent-analysis-telemetry.ts
- transparent-analysis-ai-question-routing-fixtures.ts
- risk-controlled-momentum-v2-history.ts
- alerts/run-tests.ts
- google-transparent-analysis-ai-provider.ts
- analysis/run-tests.ts
- Q: Why does connectToDatabase() bridge 17 distinct communities?
- fetch-backtest-batch.ts
- CountryList
- transparent-analysis-ai-fixtures.ts
- Daily Swing Episode Model v1 Preregistration
- forex-catalog.ts
- connectToDatabase
- onboarding/service.ts
- Transparent analysis AI explanation v1 preregistration
- combined-broad-model-features.ts
- analysis-dataset.types.ts
- email-template.test.ts
- cn
- canonical-key.ts
- risk-controlled-momentum-v3-development.ts
- smoke-transparent-analysis.ts
- package.json
- Signalist Financial Dashboard
- Daily Swing Combined Train Diagnostics v1
- ETF Risk-Controlled Momentum v2 Source and Protocol Design
- broad-dataset.ts
- Signalist Dashboard Preview
- privacy/page.tsx
- Daily Swing Symmetric Regime Development v1
- Daily Swing Strategy Research Reset v1
- Transparent analysis grounded AI topic routing v2
- Bull and Rising Chart Emblem
- app/layout.tsx
- Email Suppression and Key Rotation
- ETF Risk-Controlled Momentum v3 Preregistration
- Transparent Analysis Panel v1 Contract
- Transparent analysis AI explanation v1.1 preregistration
- Future Strategy Research Resumption Guide
- ETF Cross-Sectional Momentum Development v1
- Bullish Market Growth
- settings/layout.tsx
- Overview selection and AI ordering product review
- Email Client Rendering Checklist
- training-diagnostics.test.ts
- proxy.ts
- Bull and Rising Market Chart Motif
- episode-validation.test.ts
- Confirmed Breakout Filter
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- Star Icon
- Transparent analysis AI v1.6 acceptance v1 preregistration
- Transparent analysis AI explanation v1.4 preregistration
- risk-controlled-momentum-v3-report.test.ts
- Transparent analysis AI explanation v1.2 preregistration
- Transparent analysis AI provider reliability v1 preregistration
- risk-controlled-momentum-v2-universe.ts
- risk-controlled-momentum-v3-source.ts
- Transparent analysis grounded AI question routing v1
- evaluator.ts
- Transparent analysis AI deterministic-overview ordering v1.6 preregistration
- SearchCommand.tsx
- combined-broad-train-diagnostic-runner.test.ts
- finnhub-client.ts
- auth.actions.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 94 edges
2. `scripts` - 77 edges
3. `connectToDatabase()` - 50 edges
4. `MarketBars` - 40 edges
5. `buildTransparentAnalysisAiInput()` - 39 edges
6. `AnalysisPanelResponse` - 25 edges
7. `DailySwingAnalysisDataset` - 22 edges
8. `MarketBar` - 22 edges
9. `analyzeDailySwing()` - 21 edges
10. `ProviderBinding` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Frozen Artifact Immutability` --semantically_similar_to--> `Holdout Safeguards`  [INFERRED] [semantically similar]
  artifacts/README.md → .agents/skills/bullwise-analysis-research/SKILL.md
- `Holdout Safeguards` --semantically_similar_to--> `Episode-First One-Shot Validation`  [INFERRED] [semantically similar]
  .agents/skills/bullwise-analysis-research/SKILL.md → docs/daily-swing-backtesting.md
- `Fixed Splits and Sealed Test Policy` --semantically_similar_to--> `Holdout Safeguards`  [INFERRED] [semantically similar]
  docs/daily-swing-broad-dataset-v2.md → .agents/skills/bullwise-analysis-research/SKILL.md
- `VerifyEmailPage()` --calls--> `getRequestSession`  [EXTRACTED]
  app/(verification)/verify-email/page.tsx → lib/auth/require-user.ts
- `GET()` --indirect_call--> `requireUser()`  [INFERRED]
  app/api/instruments/[canonicalKey]/analysis/route.ts → lib/auth/require-user.ts

## Import Cycles
- 4-file cycle: `lib/analysis/analysis-dataset.ts -> lib/analysis/setup-scan.types.ts -> lib/analysis/objective-features.types.ts -> lib/analysis/broad-development-universe.ts -> lib/analysis/analysis-dataset.ts`

## Hyperedges (group relationships)
- **Graphify Build Query and Update Workflow** — _codex_skills_graphify_graphify_pipeline, _codex_skills_graphify_references_query_graph_query_navigation, _codex_skills_graphify_references_update_incremental_update, _codex_skills_graphify_references_hooks_graphify_hooks [EXTRACTED 1.00]
- **BullWise Brand Lockup** — public_assets_icons_logo_bullwise_logo, public_assets_icons_logo_bull_and_rising_chart_emblem, public_assets_icons_logo_bull_wise_wordmark [EXTRACTED 1.00]
- **Dashboard Market Intelligence Sections** — public_assets_images_dashboard_preview_market_summary, public_assets_images_dashboard_preview_watchlist, public_assets_images_dashboard_preview_top_stocks, public_assets_images_dashboard_preview_financial_news [INFERRED 0.85]
- **Unified Market Intelligence** — public_assets_images_dashboard_market_summary, public_assets_images_dashboard_watchlist, public_assets_images_dashboard_top_stocks_table, public_assets_images_dashboard_financial_news_feed [INFERRED 0.85]
- **Transparent Analysis Product Boundary** — docs_transparent_analysis_panel_v1_contract_deterministic_daily_market_context, docs_transparent_analysis_panel_v1_contract_allow_listed_product_adapter, docs_transparent_analysis_panel_v1_contract_ai_explanation_boundary, docs_transparent_analysis_telemetry_v1_privacy_preserving_operational_telemetry [INFERRED 0.85]
- **Bullish Growth Visual Identity** — app_icon_bullwise_market_growth_icon, app_icon_bull_silhouette, app_icon_rising_bar_chart, app_icon_upward_trend_arrow, app_icon_bullish_market_growth [INFERRED 0.95]
- **Daily Setup Research Rejection Chain** — docs_daily_swing_combined_model_development_v1_daily_swing_combined_model_development_v1, docs_daily_swing_combined_train_diagnostics_v1_daily_swing_combined_train_diagnostics_v1, docs_daily_swing_combined_strategy_target_audit_v1_daily_swing_combined_strategy_and_target_audit_v1, docs_daily_swing_combined_strategy_redesign_v1_daily_swing_combined_strategy_redesign_v1, docs_daily_swing_symmetric_regime_development_v1_daily_swing_symmetric_regime_development_v1, docs_daily_swing_strategy_research_reset_v1_daily_swing_strategy_research_reset_v1 [INFERRED 0.95]
- **Momentum and Risk-Control Research Chain** — docs_etf_cross_sectional_momentum_development_v1_etf_cross_sectional_momentum_development_v1, docs_etf_cross_sectional_momentum_development_v1_result_etf_cross_sectional_momentum_development_v1_result, docs_etf_risk_controlled_momentum_v2_source_and_protocol_design_etf_risk_controlled_momentum_v2_source_and_protocol_design, docs_etf_risk_controlled_momentum_v2_preregistration_etf_risk_controlled_momentum_v2_preregistration, docs_etf_risk_controlled_momentum_v2_source_feasibility_result_etf_risk_controlled_momentum_v2_source_feasibility_result, docs_etf_risk_controlled_momentum_v3_preregistration_etf_risk_controlled_momentum_v3_preregistration, docs_future_strategy_research_resumption_future_strategy_research_resumption_guide [INFERRED 0.95]
- **Outcome-Blind Broad Dataset Pipeline** — docs_daily_swing_broad_development_v1_outcome_blind_liquidity_policy, docs_daily_swing_broad_development_v2_sample_coverage_expansion, docs_daily_swing_broad_combined_dataset_v3_label_blind_combination, docs_daily_swing_broad_combined_episode_training_v1_train_only_materialization [INFERRED 0.95]
- **Sealed Research Evidence Safeguards** — _agents_skills_bullwise_analysis_research_holdout_safeguards, docs_daily_swing_backtesting_episode_first_one_shot_validation, docs_daily_swing_broad_dataset_v2_split_and_sealed_test_policy, docs_daily_swing_broad_combined_episode_training_v1_train_only_materialization [INFERRED 0.95]

## Communities (152 total, 8 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.03
Nodes (77): scripts, accept:transparent-analysis-ai-selection-v1-6, audit:analysis-broad-combined-strategy-target, audit:backtest-providers, backtest:daily-swing, backtest:daily-swing-batch, backtest:daily-swing-portfolio, backtest:daily-swing-v2-holdout (+69 more)

### Community 1 - "transparent-analysis-ai-question-routing.ts"
Cohesion: 0.06
Nodes (63): GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE, GoogleTransparentAnalysisAiFetchImplementation, GOOGLE_TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_CANDIDATE, GoogleTransparentAnalysisAiQuestionRoutingProvider, allFacts(), buildTransparentAnalysisAiQuestionRoutingInput(), boundaryMetrics(), containsAll() (+55 more)

### Community 2 - "technical-analysis.ts"
Cohesion: 0.08
Nodes (46): annualizedRealizedVolatility(), averageTrueRangeSeries(), exponentialMovingAverageSeries(), macdSeries(), NumericBar, percentageReturn(), relativeStrengthIndexSeries(), rsiFromAverages() (+38 more)

### Community 3 - "dependencies"
Cohesion: 0.04
Nodes (47): @base-ui/react, better-auth, class-variance-authority, clsx, cmdk, country-flag-icons, inngest, lucide-react (+39 more)

### Community 4 - "functions.ts"
Cohesion: 0.10
Nodes (38): { GET, POST, PUT }, deliverAlertEmailOutbox(), BetterAuthUser, getVerifiedMarketNewsRecipient(), listMarketNewsRecipientIdsPage(), MarketNewsRecipientPage, PreferenceUserId, getWatchlistSymbolsForUser() (+30 more)

### Community 5 - "stock-data.ts"
Cohesion: 0.18
Nodes (16): DashboardProfileData, DashboardQuoteData, getListedSecurityQuoteDetails, getStockMetrics, getStockProfile, getStockQuote, getStocksDetails, normalizeSymbol() (+8 more)

### Community 6 - "transparent-analysis-ai-selection-evaluation-v1-5.ts"
Cohesion: 0.12
Nodes (28): TransparentAnalysisAiExplanation, TransparentAnalysisAiFactorName, factIdsSchema, hasExactKeys(), isRecord(), isUniqueStringArray(), sameMembers(), TRANSPARENT_ANALYSIS_AI_SELECTION_CONTRACT_VERSION (+20 more)

### Community 7 - "sync-instrument-catalog.ts"
Cohesion: 0.10
Nodes (40): applyChanges, bindingKey(), deactivateOnly, ExistingInstrument, matchingExistingInstruments(), normalizeCatalog(), omittedInstrumentFields(), OPTIONAL_INSTRUMENT_FIELDS (+32 more)

### Community 8 - "watchlist/page.tsx"
Cohesion: 0.22
Nodes (8): WatchlistSearchParams, WatchlistNews(), WatchlistNewsLoading(), WatchlistNewsSection(), WatchlistPageLoading(), WatchlistPagination(), WatchlistSearch(), formatTimeAgo()

### Community 9 - "MarketBar"
Cohesion: 0.15
Nodes (16): auditProviderSeries(), BacktestProviderAuditReport, buildProviderAuditReport(), dateKey(), median(), percentile(), ProviderSeriesAudit, THRESHOLDS (+8 more)

### Community 10 - "portfolio-backtest.ts"
Cohesion: 0.08
Nodes (31): DailySwingBatchDiagnosticReport, activeAtOpen(), activeOpeningExposure(), Candidate, DEFAULT_CONFIGURATION, descendingNullable(), finitePositive(), latestMark() (+23 more)

### Community 11 - "email-delivery.ts"
Cohesion: 0.10
Nodes (18): ALERT_EMAIL_BATCH_SIZE, ALERT_EMAIL_LEASE_MS, ALERT_EMAIL_MAX_ATTEMPTS, AlertEmailDeliveryStore, AlertEmailDeliverySummary, AlertEmailJob, AlertEmailRecipient, AlertEmailRecipientDirectory (+10 more)

### Community 12 - "Graphify Pipeline"
Cohesion: 0.06
Nodes (39): Bullwise Analysis Research, Holdout Safeguards, Graphify Pipeline, Honest Graph Audit Trail, Graphify Add and Watch, Graphify Extra Exports, Edge Confidence Rubric, Semantic Extraction Specification (+31 more)

### Community 13 - "combined-broad-model-runner.ts"
Cohesion: 0.14
Nodes (27): compareClassificationToConstantBaseline(), evaluateClassificationMetrics(), fitBaselineLinearModel(), predictBaselineProbabilities(), sigmoid(), DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_SHA256, average(), binaryTargets() (+19 more)

### Community 14 - "types/instruments.ts"
Cohesion: 0.08
Nodes (42): applyChanges, EquityInstrument, listingKey(), run(), INSTRUMENT_TYPES_BY_ASSET_CLASS, InstrumentContract, instrumentContractSchema, InstrumentItem (+34 more)

### Community 15 - "technical-analysis.types.ts"
Cohesion: 0.06
Nodes (36): bar(), historicalBars(), longPlan(), SIGNAL_AT, simulate(), analyzeDailySwingV2(), applyDailySwingV2Rules(), DAILY_SWING_V2_RULES (+28 more)

### Community 16 - "analysis-dataset.ts"
Cohesion: 0.13
Nodes (22): buildDailySwingAnalysisDataset(), BuildDatasetInput, CandidateRow, collectRows(), DatasetOutcomeReport, DEFAULT_ANALYSIS_DATASET_SPLIT_RATIOS, features(), normalizedSymbols() (+14 more)

### Community 17 - "risk-controlled-momentum-v3-runner.ts"
Cohesion: 0.13
Nodes (36): addTurnover(), candidateAt(), Costs, EquityPoint, evaluateGates(), executeTargets(), formationBars(), median() (+28 more)

### Community 18 - "combined-broad-train-diagnostic-runner.ts"
Cohesion: 0.17
Nodes (23): CombinedBroadFeatureEncoder, average(), averageRanks(), buildCohorts(), categoricalValue(), CohortMetric, EpisodeRow, featureDrift() (+15 more)

### Community 19 - "episode-validation.ts"
Cohesion: 0.15
Nodes (24): DAILY_SWING_EPISODE_DATASET_VERSION, DailySwingEpisodeTrainingDataset, EpisodeTrainingRow, EpisodeTrainingTarget, preregisterDailySwingEpisodeExperiment(), sha256(), DAILY_SWING_EPISODE_EXPERIMENT_FROZEN_SHA256, DAILY_SWING_EPISODE_EXPERIMENT_ID (+16 more)

### Community 20 - "massive-bars-client.ts"
Cohesion: 0.16
Nodes (15): INTERVALS, MassiveAggregate, MassiveAggregatesPayload, MassiveBarsProvider, MassiveBarsProviderOptions, parseAggregate(), validateRequest(), MarketDataInterval (+7 more)

### Community 21 - "analysis-dataset.test.ts"
Cohesion: 0.22
Nodes (10): FROZEN_CONFIRMATION_SYMBOLS, at(), developmentReport(), FIRST_SIGNAL, instrumentReport(), SIGNAL_FEATURES, SIGNAL_QUALITY, trade() (+2 more)

### Community 22 - "combined-broad-episode-dataset.ts"
Cohesion: 0.15
Nodes (23): DailySwingBroadFeatureVector, DailySwingCombinedBroadDataset, DailySwingCombinedBroadDatasetRow, buildDailySwingCombinedBroadEpisodeDataset(), finiteUtility(), requireSource(), rowsBefore(), rowsBetween() (+15 more)

### Community 23 - "constants.ts"
Cohesion: 0.10
Nodes (22): MARKET_SUMMARY_WIDGET_CONFIG, DASHBOARD_TOP_STORIES_WIDGET_CONFIG, DashboardNews(), InstrumentDashboard(), InstrumentDashboardProps, TradingViewWidget(), TradingViewWidgetProps, useTradingViewWidget() (+14 more)

### Community 24 - "backtest.ts"
Cohesion: 0.08
Nodes (43): applySlippage(), buildBacktestSignalFeatures(), buyAndHoldReturn(), calculateBaselines(), entryBasePrice(), groupMetrics(), isStopTouched(), isTargetTouched() (+35 more)

### Community 25 - "combined-broad-strategy-target-audit-runner.ts"
Cohesion: 0.10
Nodes (30): DAILY_SWING_COMBINED_BROAD_FINAL_EPISODE_SHA256, DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_VERSION, DAILY_SWING_COMBINED_BROAD_FOLD_INVENTORY, DailySwingCombinedBroadFoldDataset, DailySwingCombinedBroadFoldPartitionId, DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_ID, DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL, DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_VERSION (+22 more)

### Community 26 - "processor.ts"
Cohesion: 0.13
Nodes (20): AlertEvaluationReason, buildOneTimeAlertDedupeKey(), monitorDuePriceAlerts(), AlertMonitoringStore, AlertProcessingSummary, MonitorableAlert, PreparedAlert, processAlertBatch() (+12 more)

### Community 27 - "symmetric-regime-strategy-runner.ts"
Cohesion: 0.11
Nodes (26): DailySwingBroadCandidateRow, DailySwingCombinedBroadSourceScan, DailySwingInstrumentSetupScan, DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_ID, DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_PROTOCOL, DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_VERSION, assertFrozenConfiguration(), buildDailySwingSymmetricCandidateRows() (+18 more)

### Community 28 - "cross-sectional-momentum-runner.ts"
Cohesion: 0.05
Nodes (68): BROAD_DEVELOPMENT_CATEGORIES, BROAD_DEVELOPMENT_DATA_POLICY, BROAD_DEVELOPMENT_LIQUIDITY_POLICY, BROAD_DEVELOPMENT_SYMBOLS, BROAD_DEVELOPMENT_UNIVERSE_NAME, BROAD_DEVELOPMENT_UNIVERSE_VERSION, BroadDevelopmentCoverageEvaluation, evaluateBroadDevelopmentCoverage() (+60 more)

### Community 29 - "types.ts"
Cohesion: 0.09
Nodes (22): AlpacaBar, AlpacaBarsPayload, AlpacaBarsProvider, AlpacaBarsProviderOptions, parseBar(), validateRequest(), errorMessage(), parseBar() (+14 more)

### Community 30 - "DailyMarketAnalysisCard.tsx"
Cohesion: 0.11
Nodes (23): analysisEndpointForInstrument(), AnalysisLoadState, AvailableAnalysis(), DailyMarketAnalysisCard(), DailyMarketAnalysisCardProps, DailyMarketAnalysisError(), DailyMarketAnalysisLoading(), DailyMarketAnalysisView() (+15 more)

### Community 31 - "training-diagnostics.ts"
Cohesion: 0.19
Nodes (15): ACTIONABLE_SUCCESS_R_THRESHOLD, buildEpisodes(), diagnoseDailySwingTrainingData(), Episode, finiteR(), percentile(), repeatSimilarity(), summarizeTargets() (+7 more)

### Community 32 - "global.d.ts"
Cohesion: 0.07
Nodes (29): Alert, AlertData, AlertModalProps, AlertsListProps, CountrySelectProps, FinancialsData, FinnhubSearchResponse, FinnhubSearchResult (+21 more)

### Community 33 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 34 - "batch-diagnostics.ts"
Cohesion: 0.11
Nodes (27): DailySwingBacktestDependencies, BacktestTrade, DailySwingBacktestReport, aggregateSummary(), average(), DailySwingBatchBacktestInput, instrumentSummary(), median() (+19 more)

### Community 35 - "combined-broad-strategy-redesign-runner.ts"
Cohesion: 0.13
Nodes (23): DAILY_SWING_BROAD_WALK_FORWARD_FOLDS, DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_ID, DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL, DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_VERSION, average(), BenchmarkInput, benchmarkRiskAt(), cohortMetrics() (+15 more)

### Community 36 - "transparent-analysis-panel.ts"
Cohesion: 0.12
Nodes (24): AnalysisDataQuality, IndicatorSnapshot, analysisPanelContext(), APPROVED_WARNING_MAP, approvedWarnings(), BuildAnalysisPanelInput, buildAnalysisPanelResponse(), buildUnavailableAnalysisPanelResponse() (+16 more)

### Community 37 - "email-suppression.ts"
Cohesion: 0.17
Nodes (22): POST(), EmailSuppressionReason, BetterAuthUser, capturePermanentSmtpFailure(), EmailSuppressionRecordResult, findUserIdByEmail(), lowerPriorityReasons, recordEmailSuppressionByEmail() (+14 more)

### Community 38 - "unsubscribe-token.ts"
Cohesion: 0.16
Nodes (20): POST(), unsubscribeFromDailyNews(), UnsubscribePage(), unsubscribeFromMarketNews(), addUtcMonths(), assertSigningSecret(), createDailyNewsUnsubscribeToken(), createDailyNewsUnsubscribeUrls() (+12 more)

### Community 39 - "AlertDialogs.tsx"
Cohesion: 0.13
Nodes (20): AlertDetailsDialog(), AlertDetailsDialogProps, CreateAlertDialog(), CreateAlertDialogProps, CreateAlertDialogState(), instrumentKey(), suggestedThreshold(), StockAlertButton() (+12 more)

### Community 40 - "UserDropdown.tsx"
Cohesion: 0.11
Nodes (17): Header(), HeaderNavigation(), NavItems(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel() (+9 more)

### Community 41 - "setup-scan.ts"
Cohesion: 0.10
Nodes (27): DEFAULT_BACKTEST_CONFIGURATION, MINIMUM_ANALYSIS_BARS, BacktestConfiguration, BroadDevelopmentCoverageSnapshot, assertValidInput(), marketBarsThrough(), scanDailySwingSetupBatch(), scanDailySwingSetups() (+19 more)

### Community 42 - "OnboardingForm.tsx"
Cohesion: 0.12
Nodes (22): CountrySelectField(), MultiSelectField(), defaultValues, OnboardingForm(), stepFields, stepLabels, SelectField(), cachedSchemaIsCurrent (+14 more)

### Community 43 - "buildTransparentAnalysisAiInput"
Cohesion: 0.10
Nodes (48): buildTransparentAnalysisAiInput(), TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES, TransparentAnalysisAiFact, boundaryMetrics(), boundaryResult(), evaluateTransparentAnalysisAiSelectionAcceptanceV1(), TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES, TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES_SHA256 (+40 more)

### Community 44 - "equity-catalog.ts"
Cohesion: 0.17
Nodes (20): applyChanges, EquityInstrument, listingKey(), run(), typeCounts(), entryKey(), EquityCatalogEntry, normalizeFinnhubEquityCatalogEntry() (+12 more)

### Community 45 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, @next/env, devDependencies, eslint, eslint-config-next, @next/env, tailwindcss (+17 more)

### Community 46 - "content-safety.ts"
Cohesion: 0.26
Nodes (14): dashboardUrl(), formatPrice(), formatTimestamp(), renderAlertEmail(), controlledTag(), escapeHtml(), PARAGRAPH_ATTRIBUTES, parseSafeHttpUrl() (+6 more)

### Community 47 - "require-user.ts"
Cohesion: 0.24
Nodes (12): Layout(), OnboardingPage(), InstrumentPage(), Layout(), PreferencesSettingsPage(), PreferencesForm(), getRequestSession, requireUser() (+4 more)

### Community 48 - "baseline-model.types.ts"
Cohesion: 0.16
Nodes (13): BaselineFeatureEncoder, BaselineLinearModel, BaselineTrainingConfiguration, CategoricalFeatureTransform, ClassificationMetrics, DAILY_SWING_BASELINE_MODEL_VERSION, DailySwingBaselineModelReport, NumericFeatureTransform (+5 more)

### Community 49 - "sign-in/page.tsx"
Cohesion: 0.26
Nodes (7): AuthDivider(), AuthFormError(), FooterLink(), GoogleAuthButton(), InputField(), Label(), authClient

### Community 50 - "transparent-analysis-ai-contract.ts"
Cohesion: 0.18
Nodes (14): exactKeys(), FACTOR_STATES, facts(), isRecord(), isStringArray(), limitations(), numericTokens(), TRANSPARENT_ANALYSIS_AI_EVALUATION_GATES (+6 more)

### Community 51 - "Transparent analysis AI fact-selection v1.5 preregistration"
Cohesion: 0.25
Nodes (7): Decision rule, Development result, Frozen architecture, Frozen gates, Frozen protocol, Purpose, Transparent analysis AI fact-selection v1.5 preregistration

### Community 52 - "watchlist.ts"
Cohesion: 0.11
Nodes (33): Home(), WatchlistContent(), WatchlistButton(), addToWatchlist(), removeFromWatchlist(), revalidateWatchlistViews(), mapWithConcurrency(), addToCurrentUserWatchlist() (+25 more)

### Community 53 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 54 - "access-policy.ts"
Cohesion: 0.23
Nodes (8): AccessControlError, assertCompletedUser(), assertVerifiedUser(), AuthenticatedUser, AuthenticationError, EmailVerificationRequiredError, OnboardingRequiredError, verifiedUser

### Community 55 - "transparent-analysis-orchestrator.ts"
Cohesion: 0.18
Nodes (19): AnalysisCatalogInstrument, classifyTransparentAnalysisOperationalFailure(), hasEnabledBarsBinding(), isEligibleBenchmark(), isEligibleTarget(), loadBenchmarkBars(), orchestrateTransparentAnalysis(), reportFailure() (+11 more)

### Community 56 - "utils.ts"
Cohesion: 0.13
Nodes (9): DashboardWatchlist(), DashboardWatchlistItem, StockLogo(), StockLogoProps, ScrollArea(), ScrollBar(), formatCurrencyValue(), getFormattedTodayDate() (+1 more)

### Community 57 - "market-data/service.ts"
Cohesion: 0.17
Nodes (12): invertBars(), invertPositiveDecimal(), invertQuote(), normalizeMarketNumber(), HistoricalQuery, InstrumentMarketDataService, InstrumentMarketDataServiceOptions, providerMap() (+4 more)

### Community 58 - "combined-broad-train-source.ts"
Cohesion: 0.16
Nodes (14): DAILY_SWING_COMBINED_BROAD_FOLD_SOURCE_SHA256, normalizedSha256(), parseMetadata(), readDailySwingCombinedBroadTrainSource(), ROWS_MARKER, sha256File(), BENCHMARK_MARKER, normalizedSha256() (+6 more)

### Community 59 - "risk-controlled-momentum-v3-history.ts"
Cohesion: 0.24
Nodes (16): assertRiskControlledMomentumV2ManifestIntegrity(), RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS, buildRiskControlledMomentumV3HistoryArtifact(), RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY, RISK_CONTROLLED_MOMENTUM_V3_HISTORY_VERSION, serializeBar(), serializeMarketData(), serializeRiskControlledMomentumV3HistoryArtifact() (+8 more)

### Community 60 - "backtest-daily-swing-batch.ts"
Cohesion: 0.16
Nodes (17): DAILY_SWING_V2_CONFIRMATION_ID, DAILY_SWING_V2_CONFIRMATION_THRESHOLDS, DailySwingV2Confirmation, evaluateDailySwingV2Confirmation(), maximum(), minimum(), V2ConfirmationCriterion, main() (+9 more)

### Community 61 - "AnalysisDatasetFeatureVector"
Cohesion: 0.33
Nodes (7): AnalysisDatasetFeatureVector, dataset(), features(), row(), featureVector(), nonlinearDataset(), row()

### Community 62 - "objective-features.ts"
Cohesion: 0.27
Nodes (11): parseMarketBar(), buildDailySwingObjectiveFeatures(), BuildDailySwingObjectiveFeaturesInput, median(), nearestLevel(), parseBars(), percentileRank(), positiveDollarVolumes() (+3 more)

### Community 63 - "email-rendering.ts"
Cohesion: 0.17
Nodes (20): getEmailEligibilityByEmail(), requireSafeEmailUrl(), EmailBranding, getApplicationBaseUrl(), getEmailBranding(), getMarketingEmailBranding(), MarketingEmailBranding, ENV_KEYS (+12 more)

### Community 64 - "broad-episode-dataset.ts"
Cohesion: 0.18
Nodes (18): AnalysisDatasetLabels, DailySwingBroadDataset, buildDailySwingBroadEpisodeDataset(), finiteUtility(), requireSource(), rowsBefore(), rowsBetween(), selectEpisodeFirstBroadRows() (+10 more)

### Community 65 - "us-equity-session.ts"
Cohesion: 0.16
Nodes (18): CLOSED_SESSION_DATES, dateKey(), EARLY_CLOSE_SESSION_DATES, isSupported(), isWeekend(), LocalDate, LocalDateTime, NEW_YORK_PARTS (+10 more)

### Community 66 - "communication-policy.ts"
Cohesion: 0.08
Nodes (43): NotificationSettingsPage(), categoryLabels, frequencyOptions, NotificationsForm(), preferenceKey(), CommunicationPreferenceDocument, communicationPreferenceSchema, emailSubscriptionSchema (+35 more)

### Community 67 - "baseline-model.ts"
Cohesion: 0.15
Nodes (19): auc(), BASELINE_TRAINING_CONFIGURATION, binaryTarget(), CATEGORICAL_FEATURES, compareRegressionToConstantBaseline(), encodeBaselineFeatureRows(), EncodedBaselineRows, evaluateRegressionMetrics() (+11 more)

### Community 68 - "Transparent analysis AI latency observation v1 preregistration"
Cohesion: 0.33
Nodes (5): Frozen protocol, Interpretation boundary, Question, Recorded observation, Transparent analysis AI latency observation v1 preregistration

### Community 69 - "market-data/finnhub.ts"
Cohesion: 0.22
Nodes (14): articleKey(), buildFinnhubUrl(), fetchArticleList(), FinnhubCompanyProfile, getGeneralNews(), getNews(), isRawNewsArticle(), searchFinnhubStocks() (+6 more)

### Community 70 - "Transparent analysis AI provider pacing v1 preregistration"
Cohesion: 0.33
Nodes (5): Basis, Frozen gates, Frozen protocol, Recorded observation, Transparent analysis AI provider pacing v1 preregistration

### Community 71 - "user-alerts.ts"
Cohesion: 0.14
Nodes (28): AlertDetailsDialogState(), actionError(), createAlertAction(), deleteAlertAction(), sendTestAlertEmailAction(), setAlertStatusAction(), updateAlertAction(), deliverSpecificAlertEmail() (+20 more)

### Community 72 - "boosted-model.ts"
Cohesion: 0.15
Nodes (20): DailySwingAnalysisDataset, binaryTarget(), BOOSTED_DEVELOPMENT_THRESHOLDS, BOOSTED_TRAINING_CONFIGURATION, CandidateThresholds, fitStump(), minimum(), rawPredictions() (+12 more)

### Community 73 - "transparent-analysis-ai-topic-routing-v2.ts"
Cohesion: 0.05
Nodes (75): GOOGLE_TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_CANDIDATE, GoogleTransparentAnalysisAiTopicRoutingV2Provider, buildTransparentAnalysisAiTopicRoutingV2Input(), boundaryMetrics(), evaluateTransparentAnalysisAiTopicRoutingV2(), exactExpansion(), exactSelectionSatisfied(), expectedSelectionSatisfied() (+67 more)

### Community 74 - "mongoose.ts"
Cohesion: 0.08
Nodes (26): runMigration(), applyChanges, EquityInstrument, run(), applyChanges, LegacyMetalInstrument, runMigration(), targetDefinition() (+18 more)

### Community 75 - "transparent-analysis-ai-selection-acceptance-v1-fixtures.ts"
Cohesion: 0.16
Nodes (15): availablePanel(), boundaryPanel, context(), generationFixtures, generationSpecifications, momentumFacts(), MomentumState, participationFacts() (+7 more)

### Community 76 - "setup-scan.types.ts"
Cohesion: 0.38
Nodes (6): writeDailySwingSetupScanReport(), writeLargeJsonObjectWithArray(), writeText(), DailySwingSetupScanReport, main(), main()

### Community 77 - "Transparent analysis AI explanation v1.3 preregistration"
Cohesion: 0.29
Nodes (6): Decision rule, Frozen gates, Frozen protocol, Purpose, Recorded development result, Transparent analysis AI explanation v1.3 preregistration

### Community 78 - "combined-broad-model-development.ts"
Cohesion: 0.38
Nodes (5): DAILY_SWING_COMBINED_BROAD_EPISODE_SHA256, DAILY_SWING_COMBINED_BROAD_MODEL_DEVELOPMENT_ID, DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL, DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL_VERSION, LOGISTIC_PENALTIES

### Community 79 - "email/run-tests.ts"
Cohesion: 0.17
Nodes (9): applyChanges, MigrationSummary, runMigration(), CommunicationPreferenceSnapshot, consentedAt, createLegacyCommunicationPreferenceSeed(), LegacyCommunicationPreferenceSeed, LegacyUserProfileEmailPreference (+1 more)

### Community 80 - "email-client-compatibility.test.ts"
Cohesion: 0.20
Nodes (5): createAlertJob(), emailBranding, EmailFixture, marketingEmailBranding, RenderedEmail

### Community 81 - "Q: Can you make the terms and privacy to be separate pages"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Can you make the terms and privacy to be separate pages, Source Nodes

### Community 82 - "transparent-analysis-telemetry.ts"
Cohesion: 0.05
Nodes (59): dynamic, GET(), runtime, DAILY_CANDIDATES, increment(), incrementStringArray(), isRecordedDate(), isValidInstrumentRequest() (+51 more)

### Community 83 - "transparent-analysis-ai-question-routing-fixtures.ts"
Cohesion: 0.12
Nodes (25): analysisDetailFixtures, BoundaryFixture, BoundaryFixtureBase, boundaryFixtures, clarifyFixtures, context(), contextFixtures, expected() (+17 more)

### Community 84 - "risk-controlled-momentum-v2-history.ts"
Cohesion: 0.25
Nodes (14): buildRiskControlledMomentumV2HistoryArtifact(), RISK_CONTROLLED_MOMENTUM_V2_HISTORY_POLICY, RISK_CONTROLLED_MOMENTUM_V2_HISTORY_VERSION, serializeBar(), serializeMarketData(), serializeRiskControlledMomentumV2HistoryArtifact(), bars(), fixture() (+6 more)

### Community 85 - "alerts/run-tests.ts"
Cohesion: 0.19
Nodes (6): ALERT_EMAIL_DELIVERY_CRON, ALERT_EMAIL_DELIVERY_EVENT, ALERT_EMAIL_DELIVERY_FUNCTION_CONFIG, ALERT_MONITORING_CRON, ALERT_MONITORING_EVENT, ALERT_MONITORING_FUNCTION_CONFIG

### Community 86 - "google-transparent-analysis-ai-provider.ts"
Cohesion: 0.09
Nodes (27): geminiCompatibleSchema(), GeminiResponse, GoogleTransparentAnalysisAiEvaluationRequest, GoogleTransparentAnalysisAiProvider, GoogleTransparentAnalysisAiProviderError, GoogleTransparentAnalysisAiProviderFailureCategory, httpFailureCategory(), outputText() (+19 more)

### Community 87 - "analysis/run-tests.ts"
Cohesion: 0.07
Nodes (45): request(), TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_GATES, TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_PROTOCOL, TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_VERSION, TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2, TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2_SHA256, TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_GATES, TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_MINIMUM_COMPLETION_PERCENT (+37 more)

### Community 88 - "Q: Why does connectToDatabase() bridge 17 distinct communities?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why does connectToDatabase() bridge 17 distinct communities?, Source Nodes

### Community 89 - "fetch-backtest-batch.ts"
Cohesion: 0.23
Nodes (14): dateArgument(), DEFAULT_ETF_SYMBOLS, delay(), ensureWritableDestination(), fetchBars(), fetchBarsWithRateLimitRetry(), instrument(), main() (+6 more)

### Community 90 - "CountryList"
Cohesion: 0.13
Nodes (4): CountryList, CountryMap, CountryOption, react-select-country-list

### Community 91 - "transparent-analysis-ai-fixtures.ts"
Cohesion: 0.18
Nodes (11): availablePanel(), boundaryFixtures, context(), contextFixtures, MomentumState, ParticipationState, qualityFixtures, stateFixtures (+3 more)

### Community 92 - "Daily Swing Episode Model v1 Preregistration"
Cohesion: 0.15
Nodes (14): 5,000-Episode Coverage Gate, Daily Swing Broad Episode Training v1, Episode-First Selection, Walk-Forward Model Selection, Daily Swing Episode Model v1 Preregistration, Episode Actionable Logistic Model, Independent Episode Split Policy, Rejected Episode Validation Result (+6 more)

### Community 93 - "forex-catalog.ts"
Cohesion: 0.27
Nodes (9): normalizeFinnhubOandaCatalogEntry(), ForexCatalogEntry, pairKey(), reconcileForexCatalogs(), tradingViewBinding(), normalizeMassiveForexCatalogEntry(), parseMassiveForexTicker(), FinnhubForexSymbol (+1 more)

### Community 94 - "connectToDatabase"
Cohesion: 0.11
Nodes (20): MarketNewsDeliveryLogDocument, marketNewsDeliveryLogSchema, MarketNewsDeliveryStatus, connectToDatabase(), BetterAuthUser, getEmailEligibility(), getPreference(), EmailEligibilityRequest (+12 more)

### Community 95 - "onboarding/service.ts"
Cohesion: 0.12
Nodes (22): allowedInvestmentExperiences, allowedInvestmentGoals, allowedPreferredIndustries, allowedPreferredMarkets, allowedRiskTolerances, CompleteOnboardingResult, createOnboardingDefaults(), getRecord() (+14 more)

### Community 96 - "Transparent analysis AI explanation v1 preregistration"
Cohesion: 0.20
Nodes (9): Authorized next step, Development results, Failure and caching contract, Frozen evaluation suite, Frozen input boundary, Frozen output boundary, Local candidate evaluation, Purpose (+1 more)

### Community 97 - "combined-broad-model-features.ts"
Cohesion: 0.29
Nodes (11): DailySwingCombinedBroadEpisodeRow, clip(), COMBINED_BROAD_CATEGORICAL_FEATURES, COMBINED_BROAD_NUMERIC_FEATURES, encodeCombinedBroadFeatureRows(), finite(), fitCombinedBroadFeatureEncoder(), median() (+3 more)

### Community 98 - "analysis-dataset.types.ts"
Cohesion: 0.22
Nodes (14): AnalysisDatasetRow, AnalysisDatasetSplit, DAILY_SWING_ANALYSIS_DATASET_VERSION, buildDailySwingEpisodeTrainingDataset(), finiteR(), selectEpisodeFirstRows(), features(), row() (+6 more)

### Community 99 - "email-template.test.ts"
Cohesion: 0.29
Nodes (10): NEWS_SUMMARY_EMAIL_PROMPT, PERSONALIZED_WELCOME_EMAIL_PROMPT, TRADINGVIEW_SYMBOL_MAPPING_PROMPT, INACTIVE_USER_REMINDER_EMAIL_TEMPLATE, NEWS_SUMMARY_EMAIL_TEMPLATE, STOCK_ALERT_LOWER_EMAIL_TEMPLATE, STOCK_ALERT_UPPER_EMAIL_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE (+2 more)

### Community 100 - "cn"
Cohesion: 0.07
Nodes (48): CountrySelect(), CountrySelectProps, Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage() (+40 more)

### Community 101 - "canonical-key.ts"
Cohesion: 0.09
Nodes (30): applyChanges, FinnhubProfile, getFinnhubProfile(), isDuplicateKeyError(), LEGACY_WATCHLIST_FILTER, LegacyWatchlistRow, runMigration(), InstrumentResolutionError (+22 more)

### Community 102 - "risk-controlled-momentum-v3-development.ts"
Cohesion: 0.20
Nodes (12): RISK_CONTROLLED_MOMENTUM_V2_DEVELOPMENT_ID, RISK_CONTROLLED_MOMENTUM_V2_DEVELOPMENT_VERSION, RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL, RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256, assertRiskControlledMomentumV3IsOpen(), RISK_CONTROLLED_MOMENTUM_V3_CLOSURE, RISK_CONTROLLED_MOMENTUM_V3_CLOSURE_STATUS, RISK_CONTROLLED_MOMENTUM_V3_CLOSURE_VERSION (+4 more)

### Community 103 - "smoke-transparent-analysis.ts"
Cohesion: 0.36
Nodes (8): transparentAnalysisHistoryQuery(), buildTransparentAnalysisSmokeFailure(), buildTransparentAnalysisSmokeSummary(), TRANSPARENT_ANALYSIS_SMOKE_VERSION, TransparentAnalysisSmokeFailure, TransparentAnalysisSmokeSummary, validateTransparentAnalysisSmokeArguments(), main()

### Community 104 - "package.json"
Cohesion: 0.20
Nodes (9): name, overrides, brace-expansion@1.1.16, brace-expansion@2.1.2, brace-expansion@5.0.7, postcss, sharp, private (+1 more)

### Community 105 - "Signalist Financial Dashboard"
Cohesion: 0.24
Nodes (10): Asset Class Tabs, Today's Financial News Feed, Index Snapshot Cards, Market Monitoring Workspace, Market Navigation, Market Summary, Market Time-Series Chart, Signalist Financial Dashboard (+2 more)

### Community 106 - "Daily Swing Combined Train Diagnostics v1"
Cohesion: 0.25
Nodes (9): Daily Swing Combined Model Development v1, L2 Logistic Candidate Family, Rejected Combined Logistic Development, Daily Swing Combined Strategy and Target Audit v1, Direction-by-Setup Nomination Boundary, Actionable-Success Target Compression Audit, Daily Swing Combined Train Diagnostics v1, Expected-Utility Decision Boundary (+1 more)

### Community 107 - "ETF Risk-Controlled Momentum v2 Source and Protocol Design"
Cohesion: 0.31
Nodes (9): ETF Cross-Sectional Momentum Development v1 Result, Rejected Cross-Sectional Momentum Result, Capped 10% Volatility Overlay, ETF Risk-Controlled Momentum v2 Preregistration, Nineteen-Gate Decision Rule, ETF Risk-Controlled Momentum v2 Source and Protocol Design, Faber, A Quantitative Approach to Tactical Asset Allocation, Marmi et al., A Quantitative Approach to Faber's Tactical Asset Allocation (+1 more)

### Community 108 - "broad-dataset.ts"
Cohesion: 0.08
Nodes (49): AnalysisDatasetSplitSummary, BacktestSignalFeatures, applyDailySwingBroadSplitPolicy(), BASE_NULLABLE_FEATURES, baseFeatures(), buildDailySwingBroadDataset(), buildWalkForwardFolds(), collectDailySwingBroadRows() (+41 more)

### Community 109 - "Signalist Dashboard Preview"
Cohesion: 0.31
Nodes (9): Signalist Dashboard Preview, Today's Financial News, Market Navigation, Market Performance Chart, Market Summary, Stock Quote Cards, Today's Top Stocks, User Profile (+1 more)

### Community 110 - "privacy/page.tsx"
Cohesion: 0.20
Nodes (7): metadata, sections, metadata, sections, LegalDocument(), LegalDocumentProps, LegalSection

### Community 111 - "Daily Swing Symmetric Regime Development v1"
Cohesion: 0.25
Nodes (8): Completed-Bar SPY Risk Filter, Daily Swing Combined Strategy Redesign v1, Rejected Benchmark Risk Filter, Daily Swing Symmetric Regime Development v1, Rejected Symmetric Regime Result, Short Borrow Cost Stress, Symmetric Long-Short Candidate, Completed U.S. Equity Session Resolver

### Community 112 - "Daily Swing Strategy Research Reset v1"
Cohesion: 0.32
Nodes (8): Closed Daily Setup Strategy Family, Daily Swing Strategy Research Reset v1, ETF Cross-Sectional Momentum Research Question, Huang et al. 2020, Jegadeesh and Titman 1993, Kim, Tse, and Wald 2016, Marmi et al. 2012, Moskowitz, Ooi, and Pedersen 2012

### Community 113 - "Transparent analysis grounded AI topic routing v2"
Cohesion: 0.12
Nodes (16): Authorization boundary and next checkpoint, Closed topic catalog, Decision and purpose, Decision rule, Deterministic expansion and rendering, Frozen development gates, Frozen fixtures and fake-evaluator implementation result, Frozen prompt and Google-adapter implementation result (+8 more)

### Community 114 - "Bull and Rising Chart Emblem"
Cohesion: 0.39
Nodes (8): Ascending Bar Chart, Bull and Rising Chart Emblem, Bull Wise Wordmark, Bullish Market Growth, BullWise Logo, Financial Analysis Brand Identity, Green Bull Silhouette, Upward Growth Arrow

### Community 115 - "app/layout.tsx"
Cohesion: 0.33
Nodes (4): geistMono, geistSans, metadata, Toaster()

### Community 116 - "Email Suppression and Key Rotation"
Cohesion: 0.33
Nodes (7): Bull Wise Communication Policy, Consent and Centralized Eligibility, Delivery Suppression Order, Unsubscribe Token Lifecycle, Authentication Market Data and Workflow Stack, Bull Wise, Email Suppression and Key Rotation

### Community 117 - "ETF Risk-Controlled Momentum v3 Preregistration"
Cohesion: 0.38
Nodes (7): Alpaca Pre-2016 Equity Data Limit, ETF Risk-Controlled Momentum v2 Source-Feasibility Result, Source Infeasible Without Strategy Outcomes, ETF Risk-Controlled Momentum v3 Preregistration, Incomplete Flash Crash Valuation Data, Source Infeasible Without Complete Valuation Data, Tiingo EOD Source Substitution

### Community 118 - "Transparent Analysis Panel v1 Contract"
Cohesion: 0.33
Nodes (7): AI Explanation Boundary, Allow-Listed Product Adapter, Deterministic Daily Market Context, Transparent Analysis Panel v1 Contract, First Operational Review Gate, Privacy-Preserving Operational Telemetry, Transparent Analysis Telemetry v1

### Community 119 - "Transparent analysis AI explanation v1.1 preregistration"
Cohesion: 0.25
Nodes (7): Decision rule, Fixed v1.1 changes, Frozen hypothesis, Purpose, Recorded development result, Transparent analysis AI explanation v1.1 preregistration, Unchanged experiment design

### Community 120 - "Future Strategy Research Resumption Guide"
Cohesion: 0.33
Nodes (6): One-Shot Validation, Clean Non-Overlapping Development Source, Future Strategy Research Resumption Guide, Liquid ETF Daily Mean Reversion, Multi-Asset Time-Series Trend, Research Restart Sequence

### Community 121 - "ETF Cross-Sectional Momentum Development v1"
Cohesion: 0.33
Nodes (6): Daily Swing v3 Portfolio Preregistration, Signal-Time Ranked Portfolio, ETF Cross-Sectional Momentum Development v1, Four-Sleeve 12-Minus-1 Momentum, Static Four-Sleeve Benchmark, Thirteen-Gate Decision Rule

### Community 122 - "Bullish Market Growth"
Cohesion: 0.70
Nodes (5): Bull Silhouette, Bullish Market Growth, Bullwise Market Growth Icon, Rising Bar Chart, Upward Trend Arrow

### Community 124 - "Overview selection and AI ordering product review"
Cohesion: 0.25
Nodes (7): Defensive context: acceptance-generation-09, Finding, Implementation checkpoint result, Mixed context: acceptance-generation-06, Overview selection and AI ordering product review, Presentation comparisons, Recommendation and implementation scope

### Community 125 - "Email Client Rendering Checklist"
Cohesion: 0.67
Nodes (4): Email Client Rendering Checklist, Email Rendering Compatibility Contract, Real-Inbox Rendering Smoke Test, Price Alert Email Template

### Community 127 - "training-diagnostics.test.ts"
Cohesion: 0.70
Nodes (4): BASE_FEATURES, dataset(), sealedRow(), trainRow()

### Community 129 - "Bull and Rising Market Chart Motif"
Cohesion: 1.00
Nodes (3): Bull and Rising Market Chart Motif, Bull Wise Email Logo, Bull Wise Wordmark

### Community 130 - "episode-validation.test.ts"
Cohesion: 0.31
Nodes (8): evaluate(), features(), fixture(), PREREGISTRATION_SHA, row(), sealRows(), SOURCE_SHA, TRAINING_SHA

### Community 138 - "Transparent analysis AI v1.6 acceptance v1 preregistration"
Cohesion: 0.22
Nodes (8): Acceptance result, Frozen candidate, Frozen gates, One-shot decision rule, Ordering value and limitations, Prerequisite and purpose, Sealed acceptance fixtures, Transparent analysis AI v1.6 acceptance v1 preregistration

### Community 139 - "Transparent analysis AI explanation v1.4 preregistration"
Cohesion: 0.29
Nodes (6): Decision rule, Development result, Frozen gates, Frozen protocol, Purpose, Transparent analysis AI explanation v1.4 preregistration

### Community 141 - "Transparent analysis AI explanation v1.2 preregistration"
Cohesion: 0.29
Nodes (6): Frozen gates and decision rule, Frozen hypothesis and change, Frozen protocol, Purpose, Recorded development result, Transparent analysis AI explanation v1.2 preregistration

### Community 142 - "Transparent analysis AI provider reliability v1 preregistration"
Cohesion: 0.33
Nodes (5): Frozen protocol, Interpretation, Question, Recorded observation, Transparent analysis AI provider reliability v1 preregistration

### Community 143 - "risk-controlled-momentum-v2-universe.ts"
Cohesion: 0.19
Nodes (10): ORIGINAL_DEVELOPMENT_SYMBOLS, Candidate, Exchange, RISK_CONTROLLED_MOMENTUM_V2_COMPUTED_MANIFEST_SHA256, RISK_CONTROLLED_MOMENTUM_V2_EXCLUDED_SYMBOLS, RISK_CONTROLLED_MOMENTUM_V2_INCEPTION_CUTOFF, RISK_CONTROLLED_MOMENTUM_V2_METADATA_VERIFIED_AT, RISK_CONTROLLED_MOMENTUM_V2_SLEEVES (+2 more)

### Community 145 - "risk-controlled-momentum-v3-source.ts"
Cohesion: 0.44
Nodes (9): bar(), JsonObject, marketBars(), object(), parseRiskControlledMomentumV3HistoryArtifact(), positive(), readRegisteredRiskControlledMomentumV3History(), string() (+1 more)

### Community 146 - "Transparent analysis grounded AI question routing v1"
Cohesion: 0.13
Nodes (14): Decision and purpose, Decision rule and authorized next step, Development fixtures, Explicit interaction contract, Fixture and fake-evaluator implementation result, Frozen development evaluation result, Frozen development gates, Frozen prompt and Google-adapter implementation result (+6 more)

### Community 147 - "evaluator.ts"
Cohesion: 0.18
Nodes (14): AlertEventItem, AlertItem, AlertEvaluationInput, AlertEvaluationResult, comparePriceValues(), DEFAULT_MAX_QUOTE_AGE_MS, evaluatePriceAlert(), ParsedDecimal (+6 more)

### Community 148 - "Transparent analysis AI deterministic-overview ordering v1.6 preregistration"
Cohesion: 0.22
Nodes (8): Decision rule, Development result, Frozen deterministic overview, Frozen gates, Frozen protocol, Frozen rendering and failure behavior, Purpose, Transparent analysis AI deterministic-overview ordering v1.6 preregistration

### Community 149 - "SearchCommand.tsx"
Cohesion: 0.20
Nodes (14): ASSET_FILTERS, SearchCommand(), SECURITY_TYPE_FILTERS, Select(), SelectContent(), SelectGroup(), SelectItem(), SelectLabel() (+6 more)

### Community 150 - "combined-broad-train-diagnostic-runner.test.ts"
Cohesion: 0.27
Nodes (7): run(), syntheticDataset(), DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_ID, DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL, DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_VERSION, main(), readFrozen()

### Community 151 - "finnhub-client.ts"
Cohesion: 0.17
Nodes (9): FakeProvider, getFinnhubApiKey(), marketStateForCalendar(), FinnhubQuotePayload, FinnhubQuoteProvider, FinnhubQuoteProviderOptions, FakeQuoteProvider, QuoteRequest (+1 more)

### Community 152 - "auth.actions.ts"
Cohesion: 0.06
Nodes (46): handler(), SignInPage(), SignUpPage(), VerifyEmailPage(), maskEmail(), verificationErrorMessage(), VerifyEmailCard(), VerificationEmailRateLimitDocument (+38 more)

## Knowledge Gaps
- **854 isolated node(s):** `metadata`, `sections`, `metadata`, `sections`, `MARKET_SUMMARY_WIDGET_CONFIG` (+849 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `connectToDatabase()` connect `connectToDatabase` to `communication-policy.ts`, `functions.ts`, `canonical-key.ts`, `email-suppression.ts`, `user-alerts.ts`, `mongoose.ts`, `email-delivery.ts`, `OnboardingForm.tsx`, `types/instruments.ts`, `require-user.ts`, `transparent-analysis-telemetry.ts`, `watchlist.ts`, `auth.actions.ts`, `processor.ts`, `email-rendering.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `AnalysisPanelResponse` connect `transparent-analysis-ai-question-routing.ts` to `transparent-analysis-panel.ts`, `transparent-analysis-ai-selection-evaluation-v1-5.ts`, `smoke-transparent-analysis.ts`, `transparent-analysis-ai-topic-routing-v2.ts`, `buildTransparentAnalysisAiInput`, `transparent-analysis-ai-selection-acceptance-v1-fixtures.ts`, `transparent-analysis-ai-contract.ts`, `transparent-analysis-ai-question-routing-fixtures.ts`, `transparent-analysis-telemetry.ts`, `transparent-analysis-orchestrator.ts`, `analysis/run-tests.ts`, `transparent-analysis-ai-fixtures.ts`, `DailyMarketAnalysisCard.tsx`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `EquitySecurityType` connect `types/instruments.ts` to `global.d.ts`, `technical-analysis.ts`, `equity-catalog.ts`, `technical-analysis.types.ts`, `watchlist.ts`, `SearchCommand.tsx`, `massive-bars-client.ts`, `transparent-analysis-orchestrator.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `metadata`, `sections`, `metadata` to the rest of the system?**
  _854 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.025974025974025976 - nodes in this community are weakly interconnected._
- **Should `transparent-analysis-ai-question-routing.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05809802012333658 - nodes in this community are weakly interconnected._
- **Should `technical-analysis.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08282828282828283 - nodes in this community are weakly interconnected._