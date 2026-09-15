# Graph Report - bullwise  (2026-09-09)

## Corpus Check
- 549 files · ~288,754 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3436 nodes · 8192 edges · 160 communities (153 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 99 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `745b555a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scripts
- transparent-analysis-ai-question-routing.ts
- technical-analysis.ts
- dependencies
- functions.ts
- data/instruments.ts
- transparent-analysis-ai-selection-evaluation-v1-5.ts
- sync-instrument-catalog.ts
- watchlist/page.tsx
- audit-backtest-providers.ts
- portfolio-backtest.ts
- email-delivery.ts
- Graphify Pipeline
- combined-broad-model-runner.ts
- types/instruments.ts
- technical-analysis.types.ts
- analysis-dataset.ts
- risk-controlled-momentum-v3-runner.ts
- combined-broad-train-diagnostic-runner.ts
- episode-dataset.types.ts
- massive-bars-client.ts
- analysis-dataset.test.ts
- combined-broad-episode-dataset.ts
- constants.ts
- backtest.ts
- combined-broad-strategy-target-audit-runner.ts
- processor.ts
- symmetric-regime-strategy-runner.ts
- cross-sectional-momentum-runner.ts
- alpaca-bars-client.ts
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
- transparent-analysis-ai-content-evaluation-v1-4.ts
- transparent-analysis-ai-selection-acceptance-v1.ts
- equity-catalog.ts
- devDependencies
- transparent-analysis-ai-question-routing-evaluation.ts
- require-user.ts
- CountrySelectField.tsx
- button.tsx
- transparent-analysis-ai-contract.ts
- Transparent analysis AI fact-selection v1.5 preregistration
- connectToDatabase
- components.json
- transparent-analysis-ai-evaluation.ts
- transparent-analysis-orchestrator.ts
- utils.ts
- market-data/service.ts
- combined-broad-fold-dataset.ts
- MarketBars
- backtest-daily-swing-batch.ts
- email/run-tests.ts
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
- canonical-key.ts
- transparent-analysis-ai-selection-acceptance-v1-fixtures.ts
- setup-scan.types.ts
- Transparent analysis AI explanation v1.3 preregistration
- transparent-analysis-daily-observation.ts
- mongoose.ts
- email-client-compatibility.test.ts
- Q: Can you make the terms and privacy to be separate pages
- transparent-analysis-telemetry.ts
- transparent-analysis-ai-question-routing-fixtures.ts
- risk-controlled-momentum-v2-history.ts
- alerts/run-tests.ts
- transparent-analysis-ai-provider-reliability.ts
- analysis/run-tests.ts
- Q: Why does connectToDatabase() bridge 17 distinct communities?
- fetch-backtest-batch.ts
- CountryList
- transparent-analysis-ai-fixtures.ts
- Daily Swing Episode Model v1 Preregistration
- forex-catalog.ts
- market-news-delivery-log.ts
- onboarding/service.ts
- Transparent analysis AI explanation v1 preregistration
- combined-broad-model-features.ts
- episode-dataset.ts
- email-template.test.ts
- cn
- finnhub-equity.ts
- risk-controlled-momentum-v3-development.ts
- AnalysisPanelResponse
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
- input-group.tsx
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
- market-news-preference.ts
- Transparent analysis AI explanation v1.2 preregistration
- Transparent analysis AI provider reliability v1 preregistration
- risk-controlled-momentum-v2-universe.ts
- transparent-analysis-ai-question-routing-prompt.test.ts
- risk-controlled-momentum-v3-source.ts
- Transparent analysis grounded AI question routing v1
- evaluator.ts
- Transparent analysis AI deterministic-overview ordering v1.6 preregistration
- NotificationsForm.tsx
- combined-broad-train-diagnostic-runner.test.ts
- types.ts
- auth.actions.ts
- deactivate-unavailable-tradingview-equities.ts
- getFinnhubApiKey
- use-finnhub-equity-display-names.ts
- backtest.test.ts
- communication-eligibility.ts
- [canonicalKey]/page.tsx
- train-analysis-baselines.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 94 edges
2. `scripts` - 76 edges
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
- `Home()` --calls--> `getWatchlistWithData()`  [EXTRACTED]
  app/(root)/page.tsx → lib/data/watchlist.ts
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

## Communities (160 total, 7 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.03
Nodes (76): scripts, accept:transparent-analysis-ai-selection-v1-6, audit:analysis-broad-combined-strategy-target, audit:backtest-providers, backtest:daily-swing, backtest:daily-swing-batch, backtest:daily-swing-portfolio, backtest:daily-swing-v2-holdout (+68 more)

### Community 1 - "transparent-analysis-ai-question-routing.ts"
Cohesion: 0.11
Nodes (25): TransparentAnalysisAiFact, TransparentAnalysisAiLimitation, allFacts(), hasExactKeys(), isRecord(), isUniqueStringArray(), LIMITATION_TEXT, TransparentAnalysisAiQuestionRoutingGenerationResult (+17 more)

### Community 2 - "technical-analysis.ts"
Cohesion: 0.08
Nodes (48): annualizedRealizedVolatility(), averageTrueRangeSeries(), exponentialMovingAverageSeries(), macdSeries(), NumericBar, parseMarketBar(), percentageReturn(), relativeStrengthIndexSeries() (+40 more)

### Community 3 - "dependencies"
Cohesion: 0.04
Nodes (47): @base-ui/react, better-auth, class-variance-authority, clsx, cmdk, country-flag-icons, inngest, lucide-react (+39 more)

### Community 4 - "functions.ts"
Cohesion: 0.10
Nodes (38): { GET, POST, PUT }, deliverAlertEmailOutbox(), BetterAuthUser, getVerifiedMarketNewsRecipient(), listMarketNewsRecipientIdsPage(), MarketNewsRecipientPage, PreferenceUserId, EmailEligibilityResult (+30 more)

### Community 5 - "data/instruments.ts"
Cohesion: 0.13
Nodes (22): InstrumentResolutionError, isDuplicateKeyError(), normalizeFinnhubSymbol(), resolveFinnhubEquityCatalogInstrument(), resolveFinnhubEquityInstrument(), DashboardProfileData, DashboardQuoteData, fetchStockData() (+14 more)

### Community 6 - "transparent-analysis-ai-selection-evaluation-v1-5.ts"
Cohesion: 0.12
Nodes (27): TransparentAnalysisAiExplanation, factIdsSchema, hasExactKeys(), isRecord(), isUniqueStringArray(), sameMembers(), TRANSPARENT_ANALYSIS_AI_SELECTION_CONTRACT_VERSION, TRANSPARENT_ANALYSIS_AI_SELECTION_OUTPUT_SCHEMA (+19 more)

### Community 7 - "sync-instrument-catalog.ts"
Cohesion: 0.09
Nodes (37): applyChanges, bindingKey(), deactivateOnly, ExistingInstrument, matchingExistingInstruments(), normalizeCatalog(), omittedInstrumentFields(), OPTIONAL_INSTRUMENT_FIELDS (+29 more)

### Community 8 - "watchlist/page.tsx"
Cohesion: 0.23
Nodes (8): WatchlistSearchParams, WatchlistNews(), WatchlistNewsLoading(), WatchlistNewsSection(), WatchlistPageLoading(), WatchlistPagination(), WatchlistSearch(), formatTimeAgo()

### Community 9 - "audit-backtest-providers.ts"
Cohesion: 0.18
Nodes (14): auditProviderSeries(), BacktestProviderAuditReport, buildProviderAuditReport(), dateKey(), median(), percentile(), ProviderSeriesAudit, THRESHOLDS (+6 more)

### Community 10 - "portfolio-backtest.ts"
Cohesion: 0.08
Nodes (31): DailySwingBatchDiagnosticReport, activeAtOpen(), activeOpeningExposure(), Candidate, DEFAULT_CONFIGURATION, descendingNullable(), finitePositive(), latestMark() (+23 more)

### Community 11 - "email-delivery.ts"
Cohesion: 0.09
Nodes (18): ALERT_EMAIL_BATCH_SIZE, ALERT_EMAIL_LEASE_MS, ALERT_EMAIL_MAX_ATTEMPTS, AlertEmailDeliveryStore, AlertEmailDeliverySummary, AlertEmailJob, AlertEmailRecipient, AlertEmailRecipientDirectory (+10 more)

### Community 12 - "Graphify Pipeline"
Cohesion: 0.06
Nodes (39): Bullwise Analysis Research, Holdout Safeguards, Graphify Pipeline, Honest Graph Audit Trail, Graphify Add and Watch, Graphify Extra Exports, Edge Confidence Rubric, Semantic Extraction Specification (+31 more)

### Community 13 - "combined-broad-model-runner.ts"
Cohesion: 0.12
Nodes (28): compareClassificationToConstantBaseline(), evaluateClassificationMetrics(), DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_SHA256, DAILY_SWING_COMBINED_BROAD_EPISODE_SHA256, DAILY_SWING_COMBINED_BROAD_MODEL_DEVELOPMENT_ID, DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL, DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL_VERSION, LOGISTIC_PENALTIES (+20 more)

### Community 14 - "types/instruments.ts"
Cohesion: 0.09
Nodes (40): ASSET_FILTERS, SearchCommand(), SECURITY_TYPE_FILTERS, INSTRUMENT_TYPES_BY_ASSET_CLASS, InstrumentContract, instrumentContractSchema, InstrumentItem, instrumentSchema (+32 more)

### Community 15 - "technical-analysis.types.ts"
Cohesion: 0.09
Nodes (25): plan(), readyResult(), plan(), result(), AnalysisDataQuality, AnalysisSignal, AnalysisState, DAILY_SWING_STRATEGY_VERSION (+17 more)

### Community 16 - "analysis-dataset.ts"
Cohesion: 0.14
Nodes (21): buildDailySwingAnalysisDataset(), BuildDatasetInput, CandidateRow, collectRows(), DatasetOutcomeReport, DEFAULT_ANALYSIS_DATASET_SPLIT_RATIOS, features(), normalizedSymbols() (+13 more)

### Community 17 - "risk-controlled-momentum-v3-runner.ts"
Cohesion: 0.14
Nodes (34): addTurnover(), candidateAt(), Costs, EquityPoint, evaluateGates(), executeTargets(), formationBars(), median() (+26 more)

### Community 18 - "combined-broad-train-diagnostic-runner.ts"
Cohesion: 0.17
Nodes (23): CombinedBroadFeatureEncoder, average(), averageRanks(), buildCohorts(), categoricalValue(), CohortMetric, EpisodeRow, featureDrift() (+15 more)

### Community 19 - "episode-dataset.types.ts"
Cohesion: 0.19
Nodes (16): DAILY_SWING_EPISODE_DATASET_VERSION, DailySwingEpisodeTrainingDataset, EpisodeTrainingRow, EpisodeTrainingTarget, preregisterDailySwingEpisodeExperiment(), sha256(), DAILY_SWING_EPISODE_EXPERIMENT_FROZEN_SHA256, DAILY_SWING_EPISODE_EXPERIMENT_ID (+8 more)

### Community 20 - "massive-bars-client.ts"
Cohesion: 0.16
Nodes (15): INTERVALS, MassiveAggregate, MassiveAggregatesPayload, MassiveBarsProvider, MassiveBarsProviderOptions, parseAggregate(), validateRequest(), MarketDataInterval (+7 more)

### Community 21 - "analysis-dataset.test.ts"
Cohesion: 0.22
Nodes (10): at(), developmentReport(), FIRST_SIGNAL, instrumentReport(), SIGNAL_FEATURES, SIGNAL_QUALITY, trade(), untriggered() (+2 more)

### Community 22 - "combined-broad-episode-dataset.ts"
Cohesion: 0.12
Nodes (25): DailySwingBroadFeatureVector, DAILY_SWING_COMBINED_BROAD_DATASET_VERSION, DAILY_SWING_COMBINED_BROAD_UNIVERSE_NAME, DailySwingCombinedBroadDataset, DailySwingCombinedBroadDatasetRow, DailySwingCombinedBroadSourceScan, buildDailySwingCombinedBroadEpisodeDataset(), finiteUtility() (+17 more)

### Community 23 - "constants.ts"
Cohesion: 0.10
Nodes (23): Home(), MARKET_SUMMARY_WIDGET_CONFIG, DASHBOARD_TOP_STORIES_WIDGET_CONFIG, DashboardNews(), InstrumentDashboard(), InstrumentDashboardProps, TradingViewWidget(), TradingViewWidgetProps (+15 more)

### Community 24 - "backtest.ts"
Cohesion: 0.07
Nodes (47): applySlippage(), buildBacktestSignalFeatures(), buyAndHoldReturn(), calculateBaselines(), DEFAULT_BACKTEST_CONFIGURATION, entryBasePrice(), groupMetrics(), isStopTouched() (+39 more)

### Community 25 - "combined-broad-strategy-target-audit-runner.ts"
Cohesion: 0.12
Nodes (25): DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_ID, DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL, DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_VERSION, AuditRow, average(), buildCandidates(), buildCohorts(), COHORT_DEFINITIONS (+17 more)

### Community 26 - "processor.ts"
Cohesion: 0.14
Nodes (19): AlertEvaluationReason, buildOneTimeAlertDedupeKey(), monitorDuePriceAlerts(), AlertMonitoringStore, AlertProcessingSummary, MonitorableAlert, PreparedAlert, processAlertBatch() (+11 more)

### Community 27 - "symmetric-regime-strategy-runner.ts"
Cohesion: 0.10
Nodes (31): DailySwingBroadCandidateRow, DailySwingInstrumentSetupScan, parseTrainMarketBars(), readFrozenSymmetricTrainHistory(), validDate(), DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_ID, DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_PROTOCOL, DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_VERSION (+23 more)

### Community 28 - "cross-sectional-momentum-runner.ts"
Cohesion: 0.10
Nodes (37): ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_ID, ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL, ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_VERSION, writeMomentumDevelopmentReport(), Costs, EquityPoint, evaluateMomentumDevelopmentGates(), executeTargets() (+29 more)

### Community 29 - "alpaca-bars-client.ts"
Cohesion: 0.11
Nodes (15): AlpacaBar, AlpacaBarsPayload, AlpacaBarsProvider, AlpacaBarsProviderOptions, parseBar(), validateRequest(), errorMessage(), parseBar() (+7 more)

### Community 30 - "DailyMarketAnalysisCard.tsx"
Cohesion: 0.11
Nodes (24): analysisEndpointForInstrument(), AnalysisLoadState, AvailableAnalysis(), DailyMarketAnalysisCard(), DailyMarketAnalysisCardProps, DailyMarketAnalysisError(), DailyMarketAnalysisLoading(), DailyMarketAnalysisView() (+16 more)

### Community 31 - "training-diagnostics.ts"
Cohesion: 0.16
Nodes (19): DailySwingAnalysisDataset, buildEpisodes(), diagnoseDailySwingTrainingData(), Episode, finiteR(), percentile(), repeatSimilarity(), summarizeTargets() (+11 more)

### Community 32 - "global.d.ts"
Cohesion: 0.07
Nodes (29): Alert, AlertData, AlertModalProps, AlertsListProps, CountrySelectProps, FinancialsData, FinnhubSearchResponse, FinnhubSearchResult (+21 more)

### Community 33 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 34 - "batch-diagnostics.ts"
Cohesion: 0.10
Nodes (29): DailySwingBacktestDependencies, BacktestTradeExitReason, DailySwingBacktestReport, aggregateSummary(), average(), DailySwingBatchBacktestInput, instrumentSummary(), median() (+21 more)

### Community 35 - "combined-broad-strategy-redesign-runner.ts"
Cohesion: 0.10
Nodes (30): DAILY_SWING_BROAD_WALK_FORWARD_FOLDS, DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_ID, DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL, DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_VERSION, average(), BenchmarkInput, benchmarkRiskAt(), cohortMetrics() (+22 more)

### Community 36 - "transparent-analysis-panel.ts"
Cohesion: 0.13
Nodes (25): analysisPanelContext(), APPROVED_WARNING_MAP, approvedWarnings(), BuildAnalysisPanelInput, buildAnalysisPanelResponse(), buildUnavailableAnalysisPanelResponse(), ENGINE_UNAVAILABLE_REASON_MAP, isPartial() (+17 more)

### Community 37 - "email-suppression.ts"
Cohesion: 0.18
Nodes (20): POST(), BetterAuthUser, capturePermanentSmtpFailure(), EmailSuppressionRecordResult, findUserIdByEmail(), lowerPriorityReasons, recordEmailSuppressionByEmail(), createEmailEventWebhookSignature() (+12 more)

### Community 38 - "unsubscribe-token.ts"
Cohesion: 0.16
Nodes (20): POST(), unsubscribeFromDailyNews(), UnsubscribePage(), unsubscribeFromMarketNews(), addUtcMonths(), assertSigningSecret(), createDailyNewsUnsubscribeToken(), createDailyNewsUnsubscribeUrls() (+12 more)

### Community 39 - "AlertDialogs.tsx"
Cohesion: 0.13
Nodes (19): AlertDetailsDialog(), AlertDetailsDialogProps, CreateAlertDialog(), CreateAlertDialogProps, CreateAlertDialogState(), instrumentKey(), suggestedThreshold(), StockAlertButton() (+11 more)

### Community 40 - "UserDropdown.tsx"
Cohesion: 0.13
Nodes (15): NavItems(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator() (+7 more)

### Community 41 - "setup-scan.ts"
Cohesion: 0.08
Nodes (39): MINIMUM_ANALYSIS_BARS, BROAD_DEVELOPMENT_CATEGORIES, BROAD_DEVELOPMENT_DATA_POLICY, BROAD_DEVELOPMENT_LIQUIDITY_POLICY, BROAD_DEVELOPMENT_SYMBOLS, BROAD_DEVELOPMENT_UNIVERSE_NAME, BROAD_DEVELOPMENT_UNIVERSE_VERSION, BroadDevelopmentCoverageEvaluation (+31 more)

### Community 42 - "transparent-analysis-ai-content-evaluation-v1-4.ts"
Cohesion: 0.15
Nodes (14): TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_GATES, TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_PROTOCOL, TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_VERSION, TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2, TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2_SHA256, TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_GATES, TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_MINIMUM_COMPLETION_PERCENT, TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_PROTOCOL (+6 more)

### Community 43 - "transparent-analysis-ai-selection-acceptance-v1.ts"
Cohesion: 0.12
Nodes (39): TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES, boundaryMetrics(), boundaryResult(), evaluateTransparentAnalysisAiSelectionAcceptanceV1(), GenerationResult, hasRequiredOverviewMembership(), invalidSelection(), percent() (+31 more)

### Community 44 - "equity-catalog.ts"
Cohesion: 0.16
Nodes (22): applyChanges, EquityInstrument, listingKey(), run(), typeCounts(), prepareEquityCatalog(), entryKey(), EquityCatalogEntry (+14 more)

### Community 45 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, @next/env, devDependencies, eslint, eslint-config-next, @next/env, tailwindcss (+17 more)

### Community 46 - "transparent-analysis-ai-question-routing-evaluation.ts"
Cohesion: 0.12
Nodes (25): buildTransparentAnalysisAiQuestionRoutingInput(), boundaryMetrics(), containsAll(), containsOnly(), evaluateTransparentAnalysisAiQuestionRoutingV1(), exactRenderedText(), expectedSelectionSatisfied(), expectedTransparentAnalysisAiQuestionRoutingOutput() (+17 more)

### Community 47 - "require-user.ts"
Cohesion: 0.11
Nodes (25): Layout(), OnboardingPage(), Layout(), PreferencesSettingsPage(), VerifyEmailPage(), OnboardingForm(), Header(), HeaderNavigation() (+17 more)

### Community 48 - "CountrySelectField.tsx"
Cohesion: 0.13
Nodes (17): CountrySelect(), CountrySelectProps, Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem() (+9 more)

### Community 49 - "button.tsx"
Cohesion: 0.25
Nodes (8): AuthDivider(), AuthFormError(), FooterLink(), GoogleAuthButton(), InputField(), Button(), buttonVariants, authClient

### Community 50 - "transparent-analysis-ai-contract.ts"
Cohesion: 0.16
Nodes (17): request(), buildTransparentAnalysisAiInput(), exactKeys(), FACTOR_STATES, facts(), isRecord(), isStringArray(), limitations() (+9 more)

### Community 51 - "Transparent analysis AI fact-selection v1.5 preregistration"
Cohesion: 0.25
Nodes (7): Decision rule, Development result, Frozen architecture, Frozen gates, Frozen protocol, Purpose, Transparent analysis AI fact-selection v1.5 preregistration

### Community 52 - "connectToDatabase"
Cohesion: 0.11
Nodes (34): WatchlistContent(), WatchlistButton(), connectToDatabase(), addToWatchlist(), removeFromWatchlist(), revalidateWatchlistViews(), mapWithConcurrency(), addToCurrentUserWatchlist() (+26 more)

### Community 53 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 54 - "transparent-analysis-ai-evaluation.ts"
Cohesion: 0.11
Nodes (26): geminiCompatibleSchema(), GeminiResponse, GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE, GoogleTransparentAnalysisAiEvaluationRequest, GoogleTransparentAnalysisAiProvider, httpFailureCategory(), outputText(), retryAfterSeconds() (+18 more)

### Community 55 - "transparent-analysis-orchestrator.ts"
Cohesion: 0.17
Nodes (20): AnalysisCatalogInstrument, classifyTransparentAnalysisOperationalFailure(), hasEnabledBarsBinding(), isEligibleBenchmark(), isEligibleTarget(), loadBenchmarkBars(), orchestrateTransparentAnalysis(), reportFailure() (+12 more)

### Community 56 - "utils.ts"
Cohesion: 0.14
Nodes (8): DashboardWatchlist(), DashboardWatchlistItem, StockLogo(), StockLogoProps, ScrollArea(), ScrollBar(), formatCurrencyValue(), ValidNewsArticle

### Community 57 - "market-data/service.ts"
Cohesion: 0.13
Nodes (13): HistoricalQuery, InstrumentMarketDataService, InstrumentMarketDataServiceOptions, providerMap(), selectProviderBinding(), FakeQuoteProvider, from, to (+5 more)

### Community 58 - "combined-broad-fold-dataset.ts"
Cohesion: 0.24
Nodes (14): DailySwingCombinedBroadEpisodeRow, buildDailySwingCombinedBroadFoldDataset(), episodeRow(), materializeDailySwingCombinedBroadFoldRows(), rowsBefore(), rowsBetween(), timestamp(), DAILY_SWING_COMBINED_BROAD_FINAL_EPISODE_SHA256 (+6 more)

### Community 59 - "MarketBars"
Cohesion: 0.24
Nodes (16): RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS, buildRiskControlledMomentumV3HistoryArtifact(), RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY, RISK_CONTROLLED_MOMENTUM_V3_HISTORY_VERSION, serializeBar(), serializeMarketData(), serializeRiskControlledMomentumV3HistoryArtifact(), bars() (+8 more)

### Community 60 - "backtest-daily-swing-batch.ts"
Cohesion: 0.12
Nodes (22): analyzeDailySwingV2(), applyDailySwingV2Rules(), DAILY_SWING_V2_RULES, DAILY_SWING_V2_STRATEGY_VERSION, TechnicalAnalysisResult, DAILY_SWING_V2_CONFIRMATION_ID, DAILY_SWING_V2_CONFIRMATION_THRESHOLDS, DailySwingV2Confirmation (+14 more)

### Community 61 - "email/run-tests.ts"
Cohesion: 0.22
Nodes (3): COMMUNICATION_PREFERENCE_SCHEMA_VERSION, consentedAt, validateMarketNewsPreferenceInput()

### Community 62 - "objective-features.ts"
Cohesion: 0.29
Nodes (10): buildDailySwingObjectiveFeatures(), BuildDailySwingObjectiveFeaturesInput, median(), nearestLevel(), parseBars(), percentileRank(), positiveDollarVolumes(), positiveVolumes() (+2 more)

### Community 63 - "email-rendering.ts"
Cohesion: 0.13
Nodes (29): getEmailEligibilityByEmail(), controlledTag(), escapeHtml(), PARAGRAPH_ATTRIBUTES, parseSafeHttpUrl(), requireSafeEmailUrl(), sanitizeGeneratedMarketNewsHtml(), sanitizeGeneratedWelcomeHtml() (+21 more)

### Community 64 - "broad-episode-dataset.ts"
Cohesion: 0.16
Nodes (20): DAILY_SWING_BROAD_DATASET_VERSION, DAILY_SWING_BROAD_SPLIT_BOUNDARIES, DailySwingBroadDataset, DailySwingBroadDatasetRow, buildDailySwingBroadEpisodeDataset(), finiteUtility(), requireSource(), rowsBefore() (+12 more)

### Community 65 - "us-equity-session.ts"
Cohesion: 0.16
Nodes (18): CLOSED_SESSION_DATES, dateKey(), EARLY_CLOSE_SESSION_DATES, isSupported(), isWeekend(), LocalDate, LocalDateTime, NEW_YORK_PARTS (+10 more)

### Community 66 - "communication-policy.ts"
Cohesion: 0.13
Nodes (26): CommunicationPreferenceDocument, communicationPreferenceSchema, emailSubscriptionSchema, emailSuppressionSchema, subscriptionsValidationError(), validSubscriptions(), EMAIL_CONSENT_SOURCES, EMAIL_CONSENT_STATUSES (+18 more)

### Community 67 - "baseline-model.ts"
Cohesion: 0.09
Nodes (38): auc(), BASELINE_TRAINING_CONFIGURATION, binaryTarget(), CATEGORICAL_FEATURES, encodeBaselineFeatureRows(), EncodedBaselineRows, finiteNumeric(), fitBaselineFeatureEncoder() (+30 more)

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
Cohesion: 0.13
Nodes (28): AlertDetailsDialogState(), actionError(), deleteAlertAction(), sendTestAlertEmailAction(), setAlertStatusAction(), updateAlertAction(), deliverSpecificAlertEmail(), requireCompletedUser() (+20 more)

### Community 72 - "boosted-model.ts"
Cohesion: 0.12
Nodes (24): compareRegressionToConstantBaseline(), evaluateRegressionMetrics(), binaryTarget(), BOOSTED_DEVELOPMENT_THRESHOLDS, BOOSTED_TRAINING_CONFIGURATION, CandidateThresholds, fitStump(), minimum() (+16 more)

### Community 73 - "transparent-analysis-ai-topic-routing-v2.ts"
Cohesion: 0.05
Nodes (69): TransparentAnalysisAiFactorName, buildTransparentAnalysisAiTopicRoutingV2Input(), boundaryMetrics(), evaluateTransparentAnalysisAiTopicRoutingV2(), exactExpansion(), exactSelectionSatisfied(), expectedSelectionSatisfied(), expectedTransparentAnalysisAiTopicRoutingV2Output() (+61 more)

### Community 74 - "canonical-key.ts"
Cohesion: 0.09
Nodes (34): applyChanges, LegacyMetalInstrument, runMigration(), targetDefinition(), AlertEventItem, alertEventSchema, EmailDeliveryStatus, AlertItem (+26 more)

### Community 75 - "transparent-analysis-ai-selection-acceptance-v1-fixtures.ts"
Cohesion: 0.12
Nodes (20): availablePanel(), boundaryPanel, context(), generationFixtures, generationSpecifications, momentumFacts(), MomentumState, participationFacts() (+12 more)

### Community 76 - "setup-scan.types.ts"
Cohesion: 0.17
Nodes (16): writeDailySwingSetupScanReport(), writeLargeJsonObjectWithArray(), writeText(), DailySwingSetupScanReport, main(), main(), main(), main() (+8 more)

### Community 77 - "Transparent analysis AI explanation v1.3 preregistration"
Cohesion: 0.29
Nodes (6): Decision rule, Frozen gates, Frozen protocol, Purpose, Recorded development result, Transparent analysis AI explanation v1.3 preregistration

### Community 78 - "transparent-analysis-daily-observation.ts"
Cohesion: 0.12
Nodes (27): DAILY_CANDIDATES, increment(), incrementStringArray(), isRecordedDate(), isValidInstrumentRequest(), StoredTelemetryLine, summarizeTransparentAnalysisObservation(), TRANSPARENT_ANALYSIS_OBSERVATION_MINIMUM_DAYS (+19 more)

### Community 79 - "mongoose.ts"
Cohesion: 0.21
Nodes (10): runMigration(), applyChanges, MigrationSummary, runMigration(), CommunicationPreferenceSnapshot, DEFAULT_MARKET_NEWS_CATEGORIES, createLegacyCommunicationPreferenceSeed(), LegacyCommunicationPreferenceSeed (+2 more)

### Community 80 - "email-client-compatibility.test.ts"
Cohesion: 0.17
Nodes (10): dashboardUrl(), formatPrice(), formatTimestamp(), renderAlertEmail(), sanitizeEmailHeader(), createAlertJob(), emailBranding, EmailFixture (+2 more)

### Community 81 - "Q: Can you make the terms and privacy to be separate pages"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Can you make the terms and privacy to be separate pages, Source Nodes

### Community 82 - "transparent-analysis-telemetry.ts"
Cohesion: 0.09
Nodes (32): dynamic, GET(), runtime, TransparentAnalysisOrchestrationResult, handleTransparentAnalysisRequest(), json(), PRIVATE_JSON_HEADERS, unavailableResponse (+24 more)

### Community 83 - "transparent-analysis-ai-question-routing-fixtures.ts"
Cohesion: 0.14
Nodes (22): analysisDetailFixtures, BoundaryFixture, BoundaryFixtureBase, boundaryFixtures, clarifyFixtures, context(), contextFixtures, expected() (+14 more)

### Community 84 - "risk-controlled-momentum-v2-history.ts"
Cohesion: 0.26
Nodes (14): buildRiskControlledMomentumV2HistoryArtifact(), RISK_CONTROLLED_MOMENTUM_V2_HISTORY_POLICY, RISK_CONTROLLED_MOMENTUM_V2_HISTORY_VERSION, serializeBar(), serializeMarketData(), serializeRiskControlledMomentumV2HistoryArtifact(), bars(), fixture() (+6 more)

### Community 85 - "alerts/run-tests.ts"
Cohesion: 0.19
Nodes (6): ALERT_EMAIL_DELIVERY_CRON, ALERT_EMAIL_DELIVERY_EVENT, ALERT_EMAIL_DELIVERY_FUNCTION_CONFIG, ALERT_MONITORING_CRON, ALERT_MONITORING_EVENT, ALERT_MONITORING_FUNCTION_CONFIG

### Community 86 - "transparent-analysis-ai-provider-reliability.ts"
Cohesion: 0.16
Nodes (14): GoogleTransparentAnalysisAiProviderError, GoogleTransparentAnalysisAiProviderFailureCategory, evaluateTransparentAnalysisAiProviderPacing(), TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_INTERVAL_MS, TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_MINIMUM_COMPLETION_PERCENT, TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_MINIMUM_OBSERVED_INTERVAL_MS, TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_VERSION, failure() (+6 more)

### Community 87 - "analysis/run-tests.ts"
Cohesion: 0.14
Nodes (19): writeRiskControlledMomentumV3Report(), TransparentAnalysisAiInput, TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES, latencySummary(), observeTransparentAnalysisAiLatency(), percentile(), TRANSPARENT_ANALYSIS_AI_LATENCY_OBSERVATION_VERSION, TransparentAnalysisAiLatencyGenerator (+11 more)

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
Cohesion: 0.19
Nodes (9): normalizeFinnhubOandaCatalogEntry(), ForexCatalogEntry, pairKey(), reconcileForexCatalogs(), tradingViewBinding(), normalizeMassiveForexCatalogEntry(), parseMassiveForexTicker(), usesUsd() (+1 more)

### Community 94 - "market-news-delivery-log.ts"
Cohesion: 0.18
Nodes (10): MarketNewsDeliveryLogDocument, marketNewsDeliveryLogSchema, MarketNewsDeliveryStatus, ActiveMarketNewsDeliveryLease, claimMarketNewsDelivery(), completeMarketNewsDelivery(), failMarketNewsDelivery(), isDuplicateKeyError() (+2 more)

### Community 95 - "onboarding/service.ts"
Cohesion: 0.07
Nodes (37): CountrySelectField(), defaultValues, stepFields, stepLabels, cachedSchemaIsCurrent, cachedUserProfile, UserProfileDocument, userProfileSchema (+29 more)

### Community 96 - "Transparent analysis AI explanation v1 preregistration"
Cohesion: 0.20
Nodes (9): Authorized next step, Development results, Failure and caching contract, Frozen evaluation suite, Frozen input boundary, Frozen output boundary, Local candidate evaluation, Purpose (+1 more)

### Community 97 - "combined-broad-model-features.ts"
Cohesion: 0.31
Nodes (10): clip(), COMBINED_BROAD_CATEGORICAL_FEATURES, COMBINED_BROAD_NUMERIC_FEATURES, encodeCombinedBroadFeatureRows(), finite(), fitCombinedBroadFeatureEncoder(), median(), nearestRank() (+2 more)

### Community 98 - "episode-dataset.ts"
Cohesion: 0.23
Nodes (12): DAILY_SWING_ANALYSIS_DATASET_VERSION, buildDailySwingEpisodeTrainingDataset(), finiteR(), selectEpisodeFirstRows(), features(), row(), sealedRow(), SHA (+4 more)

### Community 99 - "email-template.test.ts"
Cohesion: 0.29
Nodes (10): NEWS_SUMMARY_EMAIL_PROMPT, PERSONALIZED_WELCOME_EMAIL_PROMPT, TRADINGVIEW_SYMBOL_MAPPING_PROMPT, INACTIVE_USER_REMINDER_EMAIL_TEMPLATE, NEWS_SUMMARY_EMAIL_TEMPLATE, STOCK_ALERT_LOWER_EMAIL_TEMPLATE, STOCK_ALERT_UPPER_EMAIL_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE (+2 more)

### Community 100 - "cn"
Cohesion: 0.17
Nodes (20): Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), Checkbox(), Table() (+12 more)

### Community 101 - "finnhub-equity.ts"
Cohesion: 0.14
Nodes (16): applyChanges, FinnhubProfile, getFinnhubProfile(), isDuplicateKeyError(), LEGACY_WATCHLIST_FILTER, LegacyWatchlistRow, runMigration(), WatchlistItem (+8 more)

### Community 102 - "risk-controlled-momentum-v3-development.ts"
Cohesion: 0.32
Nodes (8): assertRiskControlledMomentumV3IsOpen(), RISK_CONTROLLED_MOMENTUM_V3_CLOSURE, RISK_CONTROLLED_MOMENTUM_V3_CLOSURE_STATUS, RISK_CONTROLLED_MOMENTUM_V3_CLOSURE_VERSION, RISK_CONTROLLED_MOMENTUM_V3_DEVELOPMENT_ID, RISK_CONTROLLED_MOMENTUM_V3_DEVELOPMENT_VERSION, RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL, main()

### Community 103 - "AnalysisPanelResponse"
Cohesion: 0.36
Nodes (8): AnalysisPanelResponse, buildTransparentAnalysisSmokeFailure(), buildTransparentAnalysisSmokeSummary(), TRANSPARENT_ANALYSIS_SMOKE_VERSION, TransparentAnalysisSmokeFailure, TransparentAnalysisSmokeSummary, validateTransparentAnalysisSmokeArguments(), main()

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
Nodes (48): AnalysisDatasetFeatureVector, AnalysisDatasetLabels, AnalysisDatasetSplit, AnalysisDatasetSplitSummary, BacktestSignalFeatures, applyDailySwingBroadSplitPolicy(), BASE_NULLABLE_FEATURES, baseFeatures() (+40 more)

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
Nodes (15): Authorization boundary and next checkpoint, Closed topic catalog, Decision and purpose, Decision rule, Deterministic expansion and rendering, Frozen development gates, Frozen fixtures and fake-evaluator implementation result, Independent development fixtures (+7 more)

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

### Community 127 - "input-group.tsx"
Cohesion: 0.21
Nodes (10): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), InputGroupText(), InputGroupTextarea() (+2 more)

### Community 129 - "Bull and Rising Market Chart Motif"
Cohesion: 1.00
Nodes (3): Bull and Rising Market Chart Motif, Bull Wise Email Logo, Bull Wise Wordmark

### Community 130 - "episode-validation.test.ts"
Cohesion: 0.20
Nodes (12): AnalysisDatasetRow, dataset(), features(), row(), evaluate(), features(), fixture(), PREREGISTRATION_SHA (+4 more)

### Community 138 - "Transparent analysis AI v1.6 acceptance v1 preregistration"
Cohesion: 0.22
Nodes (8): Acceptance result, Frozen candidate, Frozen gates, One-shot decision rule, Ordering value and limitations, Prerequisite and purpose, Sealed acceptance fixtures, Transparent analysis AI v1.6 acceptance v1 preregistration

### Community 139 - "Transparent analysis AI explanation v1.4 preregistration"
Cohesion: 0.29
Nodes (6): Decision rule, Development result, Frozen gates, Frozen protocol, Purpose, Transparent analysis AI explanation v1.4 preregistration

### Community 140 - "market-news-preference.ts"
Cohesion: 0.19
Nodes (13): NotificationSettingsPage(), COMMUNICATION_POLICY_VERSION, EmailFrequency, EmailSubscriptionPreferenceSnapshot, getLegacyDailyNewsEmailPreference(), setLegacyDailyNewsEmailPreference(), defaultView(), getMarketNewsPreference() (+5 more)

### Community 141 - "Transparent analysis AI explanation v1.2 preregistration"
Cohesion: 0.29
Nodes (6): Frozen gates and decision rule, Frozen hypothesis and change, Frozen protocol, Purpose, Recorded development result, Transparent analysis AI explanation v1.2 preregistration

### Community 142 - "Transparent analysis AI provider reliability v1 preregistration"
Cohesion: 0.33
Nodes (5): Frozen protocol, Interpretation, Question, Recorded observation, Transparent analysis AI provider reliability v1 preregistration

### Community 143 - "risk-controlled-momentum-v2-universe.ts"
Cohesion: 0.14
Nodes (16): FROZEN_CONFIRMATION_SYMBOLS, ORIGINAL_DEVELOPMENT_SYMBOLS, RISK_CONTROLLED_MOMENTUM_V2_DEVELOPMENT_ID, RISK_CONTROLLED_MOMENTUM_V2_DEVELOPMENT_VERSION, RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL, Candidate, Exchange, RISK_CONTROLLED_MOMENTUM_V2_COMPUTED_MANIFEST_SHA256 (+8 more)

### Community 144 - "transparent-analysis-ai-question-routing-prompt.test.ts"
Cohesion: 0.22
Nodes (12): GoogleTransparentAnalysisAiFetchImplementation, GOOGLE_TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_CANDIDATE, GoogleTransparentAnalysisAiQuestionRoutingProvider, TransparentAnalysisAiQuestionRoutingMeasuredGeneration, TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROMPT, TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROMPT_SHA256, TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROMPT_VERSION, TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROTOCOL (+4 more)

### Community 145 - "risk-controlled-momentum-v3-source.ts"
Cohesion: 0.33
Nodes (11): RiskControlledMomentumBenchmarkHistory, RiskControlledMomentumSleeveId, bar(), JsonObject, marketBars(), object(), parseRiskControlledMomentumV3HistoryArtifact(), positive() (+3 more)

### Community 146 - "Transparent analysis grounded AI question routing v1"
Cohesion: 0.13
Nodes (14): Decision and purpose, Decision rule and authorized next step, Development fixtures, Explicit interaction contract, Fixture and fake-evaluator implementation result, Frozen development evaluation result, Frozen development gates, Frozen prompt and Google-adapter implementation result (+6 more)

### Community 147 - "evaluator.ts"
Cohesion: 0.26
Nodes (10): AlertEvaluationInput, AlertEvaluationResult, comparePriceValues(), DEFAULT_MAX_QUOTE_AGE_MS, evaluatePriceAlert(), ParsedDecimal, parsePositiveDecimal(), evaluate() (+2 more)

### Community 148 - "Transparent analysis AI deterministic-overview ordering v1.6 preregistration"
Cohesion: 0.22
Nodes (8): Decision rule, Development result, Frozen deterministic overview, Frozen gates, Frozen protocol, Frozen rendering and failure behavior, Purpose, Transparent analysis AI deterministic-overview ordering v1.6 preregistration

### Community 149 - "NotificationsForm.tsx"
Cohesion: 0.15
Nodes (18): MultiSelectField(), SelectField(), categoryLabels, frequencyOptions, NotificationsForm(), preferenceKey(), Label(), Select() (+10 more)

### Community 150 - "combined-broad-train-diagnostic-runner.test.ts"
Cohesion: 0.27
Nodes (7): run(), syntheticDataset(), DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_ID, DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL, DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_VERSION, main(), readFrozen()

### Community 151 - "types.ts"
Cohesion: 0.16
Nodes (13): FakeProvider, invertBars(), invertPositiveDecimal(), invertQuote(), marketStateForCalendar(), normalizeMarketNumber(), FinnhubQuotePayload, FinnhubQuoteProviderOptions (+5 more)

### Community 152 - "auth.actions.ts"
Cohesion: 0.06
Nodes (45): handler(), SignInPage(), SignUpPage(), maskEmail(), verificationErrorMessage(), VerifyEmailCard(), VerificationEmailRateLimitDocument, verificationEmailRateLimitSchema (+37 more)

### Community 153 - "deactivate-unavailable-tradingview-equities.ts"
Cohesion: 0.29
Nodes (6): applyChanges, EquityInstrument, run(), listResolvableTradingViewEquities(), normalizeTradingViewSymbol(), TradingViewScannerResponse

### Community 154 - "getFinnhubApiKey"
Cohesion: 0.48
Nodes (3): getFinnhubApiKey(), FinnhubQuoteProvider, createFinnhubQuoteProvider()

### Community 155 - "use-finnhub-equity-display-names.ts"
Cohesion: 0.50
Nodes (4): applyChanges, EquityInstrument, listingKey(), run()

### Community 156 - "backtest.test.ts"
Cohesion: 0.24
Nodes (6): bar(), historicalBars(), longPlan(), SIGNAL_AT, simulate(), DailySwingAnalysisInput

### Community 157 - "communication-eligibility.ts"
Cohesion: 0.32
Nodes (7): BetterAuthUser, getEmailEligibility(), getPreference(), EmailEligibilityRequest, evaluateEmailEligibility(), hasAuditableConsent(), streamForMessage()

### Community 158 - "[canonicalKey]/page.tsx"
Cohesion: 0.83
Nodes (3): InstrumentPage(), getInstrumentByCanonicalKey(), getWatchlistInstrumentIdsForUser()

### Community 159 - "train-analysis-baselines.ts"
Cohesion: 0.83
Nodes (3): main(), metric(), option()

## Knowledge Gaps
- **853 isolated node(s):** `metadata`, `sections`, `metadata`, `sections`, `MARKET_SUMMARY_WIDGET_CONFIG` (+848 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `connectToDatabase()` connect `connectToDatabase` to `functions.ts`, `data/instruments.ts`, `email-suppression.ts`, `user-alerts.ts`, `email-delivery.ts`, `market-news-preference.ts`, `types/instruments.ts`, `require-user.ts`, `mongoose.ts`, `transparent-analysis-telemetry.ts`, `auth.actions.ts`, `market-news-delivery-log.ts`, `processor.ts`, `communication-eligibility.ts`, `[canonicalKey]/page.tsx`, `email-rendering.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `AnalysisPanelResponse` connect `AnalysisPanelResponse` to `transparent-analysis-ai-question-routing.ts`, `transparent-analysis-panel.ts`, `transparent-analysis-ai-selection-evaluation-v1-5.ts`, `transparent-analysis-ai-topic-routing-v2.ts`, `transparent-analysis-ai-selection-acceptance-v1.ts`, `transparent-analysis-ai-selection-acceptance-v1-fixtures.ts`, `transparent-analysis-ai-contract.ts`, `transparent-analysis-ai-question-routing-fixtures.ts`, `transparent-analysis-telemetry.ts`, `transparent-analysis-orchestrator.ts`, `analysis/run-tests.ts`, `transparent-analysis-ai-fixtures.ts`, `DailyMarketAnalysisCard.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `EquitySecurityType` connect `types/instruments.ts` to `global.d.ts`, `technical-analysis.ts`, `equity-catalog.ts`, `technical-analysis.types.ts`, `connectToDatabase`, `massive-bars-client.ts`, `transparent-analysis-orchestrator.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `metadata`, `sections`, `metadata` to the rest of the system?**
  _853 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.02631578947368421 - nodes in this community are weakly interconnected._
- **Should `transparent-analysis-ai-question-routing.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10837438423645321 - nodes in this community are weakly interconnected._
- **Should `technical-analysis.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08145363408521303 - nodes in this community are weakly interconnected._