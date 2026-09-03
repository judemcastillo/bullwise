# Graph Report - bullwise  (2026-08-31)

## Corpus Check
- 472 files · ~245,512 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2861 nodes · 6878 edges · 128 communities (120 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5ff13290`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scripts
- input-group.tsx
- technical-analysis.ts
- dependencies
- functions.ts
- user-alerts.ts
- transparent-analysis-telemetry.ts
- batch-diagnostics.ts
- portfolio-backtest.ts
- communication-policy.ts
- technical-analysis.types.ts
- email-delivery.ts
- Graphify Pipeline
- combined-broad-model-runner.ts
- utils.ts
- types.ts
- analysis-dataset.ts
- risk-controlled-momentum-v3-runner.ts
- combined-broad-train-diagnostic-runner.ts
- episode-validation.ts
- types/instruments.ts
- broad-dataset.types.ts
- market-structure.ts
- constants.ts
- backtest.ts
- combined-broad-strategy-target-audit-runner.ts
- processor.ts
- symmetric-regime-strategy-runner.ts
- cross-sectional-momentum-runner.ts
- data/instruments.ts
- DailyMarketAnalysisCard.tsx
- combined-broad-episode-dataset.ts
- global.d.ts
- compilerOptions
- scan-analysis-setups.ts
- combined-broad-strategy-redesign-runner.ts
- transparent-analysis-panel.ts
- email-suppression.ts
- unsubscribe-token.ts
- cn
- UserDropdown.tsx
- analysis/run-tests.ts
- onboarding/service.ts
- boosted-model.ts
- equity-catalog.ts
- devDependencies
- baseline-model.ts
- require-user.ts
- transparent-analysis-daily-observation.ts
- training-diagnostics.ts
- market-data/service.ts
- backtest-daily-swing-batch.ts
- watchlist.ts
- components.json
- transparent-analysis-service.ts
- transparent-analysis-orchestrator.ts
- mongoose.ts
- broad-dataset.ts
- auth.actions.ts
- NotificationsForm.tsx
- analysis-dataset.types.ts
- combined-broad-fold-dataset.types.ts
- objective-features.ts
- risk-controlled-momentum-v2-universe.ts
- crypto-catalog.ts
- us-equity-session.ts
- requireUser
- analysis-dataset.test.ts
- MarketBars
- index.ts
- episode-validation.test.ts
- combined-broad-train-diagnostic-runner.test.ts
- fetch-backtest-history.ts
- DashboardWatchlist.tsx
- sync-instrument-catalog.ts
- transparent-analysis-telemetry.test.ts
- watchlist-policy.test.ts
- WatchlistButton.tsx
- TradingViewWidget.tsx
- migrate-communication-preferences.ts
- email-rendering.ts
- backtest.test.ts
- risk-controlled-momentum-v2-history.ts
- watchlist/page.tsx
- alerts/run-tests.ts
- combined-broad-model-features.ts
- canonical-key.ts
- Q: Why does connectToDatabase() bridge 17 distinct communities?
- fetch-backtest-batch.ts
- CountryList
- AlertDialogs.tsx
- Daily Swing Episode Model v1 Preregistration
- connectToDatabase
- risk-controlled-momentum-v3-report.test.ts
- risk-controlled-momentum-v3-development.ts
- risk-controlled-momentum-v3-source.ts
- email-template.test.ts
- smoke-transparent-analysis.ts
- instruments/run-tests.ts
- package.json
- Signalist Financial Dashboard
- Daily Swing Combined Train Diagnostics v1
- ETF Risk-Controlled Momentum v2 Source and Protocol Design
- Signalist Dashboard Preview
- privacy/page.tsx
- Daily Swing Symmetric Regime Development v1
- Daily Swing Strategy Research Reset v1
- combined-broad-model-development.ts
- Bull and Rising Chart Emblem
- app/layout.tsx
- Email Suppression and Key Rotation
- ETF Risk-Controlled Momentum v3 Preregistration
- Transparent Analysis Panel v1 Contract
- Future Strategy Research Resumption Guide
- ETF Cross-Sectional Momentum Development v1
- Bullish Market Growth
- settings/layout.tsx
- Email Client Rendering Checklist
- proxy.ts
- Bull and Rising Market Chart Motif
- Confirmed Breakout Filter
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- Star Icon

## God Nodes (most connected - your core abstractions)
1. `cn()` - 94 edges
2. `scripts` - 64 edges
3. `connectToDatabase()` - 50 edges
4. `MarketBars` - 40 edges
5. `DailySwingAnalysisDataset` - 22 edges
6. `MarketBar` - 22 edges
7. `analyzeDailySwing()` - 21 edges
8. `ProviderBinding` - 21 edges
9. `Button()` - 20 edges
10. `AssetClass` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Frozen Artifact Immutability` --semantically_similar_to--> `Holdout Safeguards`  [INFERRED] [semantically similar]
  artifacts/README.md → .agents/skills/bullwise-analysis-research/SKILL.md
- `Holdout Safeguards` --semantically_similar_to--> `Episode-First One-Shot Validation`  [INFERRED] [semantically similar]
  .agents/skills/bullwise-analysis-research/SKILL.md → docs/daily-swing-backtesting.md
- `Fixed Splits and Sealed Test Policy` --semantically_similar_to--> `Holdout Safeguards`  [INFERRED] [semantically similar]
  docs/daily-swing-broad-dataset-v2.md → .agents/skills/bullwise-analysis-research/SKILL.md
- `Home()` --calls--> `getWatchlistWithData()`  [EXTRACTED]
  app/(root)/page.tsx → lib/data/watchlist.ts
- `VerifyEmailPage()` --calls--> `getRequestSession`  [EXTRACTED]
  app/(verification)/verify-email/page.tsx → lib/auth/require-user.ts

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

## Communities (128 total, 8 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.03
Nodes (64): scripts, audit:analysis-broad-combined-strategy-target, audit:backtest-providers, backtest:daily-swing, backtest:daily-swing-batch, backtest:daily-swing-portfolio, backtest:daily-swing-v2-holdout, backtest:daily-swing-v3-holdout (+56 more)

### Community 1 - "input-group.tsx"
Cohesion: 0.21
Nodes (10): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), InputGroupText(), InputGroupTextarea() (+2 more)

### Community 2 - "technical-analysis.ts"
Cohesion: 0.10
Nodes (39): annualizedRealizedVolatility(), averageTrueRangeSeries(), exponentialMovingAverageSeries(), macdSeries(), NumericBar, parseMarketBar(), percentageReturn(), relativeStrengthIndexSeries() (+31 more)

### Community 3 - "dependencies"
Cohesion: 0.04
Nodes (47): @base-ui/react, better-auth, class-variance-authority, clsx, cmdk, country-flag-icons, inngest, lucide-react (+39 more)

### Community 4 - "functions.ts"
Cohesion: 0.11
Nodes (34): { GET, POST, PUT }, deliverAlertEmailOutbox(), BetterAuthUser, listMarketNewsRecipientIdsPage(), MarketNewsRecipientPage, PreferenceUserId, createMarketNewsDeliveryEvents(), deliveryFrequencies (+26 more)

### Community 5 - "user-alerts.ts"
Cohesion: 0.14
Nodes (27): AlertDetailsDialogState(), actionError(), deleteAlertAction(), sendTestAlertEmailAction(), setAlertStatusAction(), updateAlertAction(), deliverSpecificAlertEmail(), requireCompletedUser() (+19 more)

### Community 6 - "transparent-analysis-telemetry.ts"
Cohesion: 0.13
Nodes (18): TransparentAnalysisOrchestrationResult, handleTransparentAnalysisRequest(), json(), PRIVATE_JSON_HEADERS, unavailableResponse, TransparentAnalysisRouteDependencies, buildTransparentAnalysisRequestTelemetry(), historyBars() (+10 more)

### Community 7 - "batch-diagnostics.ts"
Cohesion: 0.10
Nodes (27): DailySwingBacktestDependencies, BacktestTradeExitReason, DailySwingBacktestReport, aggregateSummary(), average(), DailySwingBatchBacktestInput, instrumentSummary(), median() (+19 more)

### Community 8 - "portfolio-backtest.ts"
Cohesion: 0.08
Nodes (30): activeAtOpen(), activeOpeningExposure(), Candidate, DEFAULT_CONFIGURATION, descendingNullable(), finitePositive(), latestMark(), PortfolioBacktestInput (+22 more)

### Community 9 - "communication-policy.ts"
Cohesion: 0.08
Nodes (41): CommunicationPreferenceDocument, communicationPreferenceSchema, emailSubscriptionSchema, emailSuppressionSchema, subscriptionsValidationError(), validSubscriptions(), updateMarketNewsPreference(), COMMUNICATION_POLICY_VERSION (+33 more)

### Community 10 - "technical-analysis.types.ts"
Cohesion: 0.10
Nodes (23): analyzeDailySwingV2(), applyDailySwingV2Rules(), DAILY_SWING_V2_RULES, plan(), readyResult(), plan(), result(), AnalysisDataQuality (+15 more)

### Community 11 - "email-delivery.ts"
Cohesion: 0.10
Nodes (18): ALERT_EMAIL_BATCH_SIZE, ALERT_EMAIL_LEASE_MS, ALERT_EMAIL_MAX_ATTEMPTS, AlertEmailDeliveryStore, AlertEmailDeliverySummary, AlertEmailJob, AlertEmailRecipient, AlertEmailRecipientDirectory (+10 more)

### Community 12 - "Graphify Pipeline"
Cohesion: 0.06
Nodes (39): Bullwise Analysis Research, Holdout Safeguards, Graphify Pipeline, Honest Graph Audit Trail, Graphify Add and Watch, Graphify Extra Exports, Edge Confidence Rubric, Semantic Extraction Specification (+31 more)

### Community 13 - "combined-broad-model-runner.ts"
Cohesion: 0.18
Nodes (21): compareClassificationToConstantBaseline(), evaluateClassificationMetrics(), fitBaselineLinearModel(), linearPrediction(), predictBaselineProbabilities(), sigmoid(), DailySwingCombinedBroadFoldPartitionId, average() (+13 more)

### Community 14 - "utils.ts"
Cohesion: 0.11
Nodes (19): WatchlistNews(), WatchlistNewsSection(), POPULAR_STOCK_SYMBOLS, articleKey(), buildFinnhubUrl(), fetchArticleList(), FinnhubCompanyProfile, getGeneralNews() (+11 more)

### Community 15 - "types.ts"
Cohesion: 0.08
Nodes (27): AlpacaBar, AlpacaBarsPayload, AlpacaBarsProvider, AlpacaBarsProviderOptions, parseBar(), validateRequest(), INTERVALS, MassiveAggregate (+19 more)

### Community 16 - "analysis-dataset.ts"
Cohesion: 0.14
Nodes (21): buildDailySwingAnalysisDataset(), BuildDatasetInput, CandidateRow, collectRows(), DatasetOutcomeReport, DEFAULT_ANALYSIS_DATASET_SPLIT_RATIOS, features(), normalizedSymbols() (+13 more)

### Community 17 - "risk-controlled-momentum-v3-runner.ts"
Cohesion: 0.14
Nodes (34): addTurnover(), candidateAt(), Costs, EquityPoint, evaluateGates(), executeTargets(), formationBars(), median() (+26 more)

### Community 18 - "combined-broad-train-diagnostic-runner.ts"
Cohesion: 0.17
Nodes (23): CombinedBroadFeatureEncoder, average(), averageRanks(), buildCohorts(), categoricalValue(), CohortMetric, EpisodeRow, featureDrift() (+15 more)

### Community 19 - "episode-validation.ts"
Cohesion: 0.15
Nodes (24): DAILY_SWING_EPISODE_DATASET_VERSION, DailySwingEpisodeTrainingDataset, EpisodeTrainingRow, EpisodeTrainingTarget, preregisterDailySwingEpisodeExperiment(), sha256(), DAILY_SWING_EPISODE_EXPERIMENT_FROZEN_SHA256, DAILY_SWING_EPISODE_EXPERIMENT_ID (+16 more)

### Community 20 - "types/instruments.ts"
Cohesion: 0.08
Nodes (45): ASSET_FILTERS, SearchCommand(), SECURITY_TYPE_FILTERS, INSTRUMENT_TYPES_BY_ASSET_CLASS, InstrumentContract, instrumentContractSchema, InstrumentItem, instrumentSchema (+37 more)

### Community 21 - "broad-dataset.types.ts"
Cohesion: 0.16
Nodes (23): AnalysisDatasetLabels, DAILY_SWING_BROAD_DATASET_VERSION, DAILY_SWING_BROAD_SPLIT_BOUNDARIES, DAILY_SWING_BROAD_WALK_FORWARD_FOLDS, DailySwingBroadDataset, DailySwingBroadDatasetRow, DailySwingBroadFeatureVector, buildDailySwingBroadEpisodeDataset() (+15 more)

### Community 22 - "market-structure.ts"
Cohesion: 0.25
Nodes (9): addRangeBoundary(), clusterLevels(), DerivedMarketStructure, deriveMarketStructure(), findPivots(), InternalPriceLevel, LevelSource, toPublicLevel() (+1 more)

### Community 23 - "constants.ts"
Cohesion: 0.07
Nodes (37): Home(), MARKET_SUMMARY_WIDGET_CONFIG, StockAlertButton(), DASHBOARD_TOP_STORIES_WIDGET_CONFIG, DashboardNews(), CountrySelectField(), MultiSelectField(), defaultValues (+29 more)

### Community 24 - "backtest.ts"
Cohesion: 0.07
Nodes (48): applySlippage(), buildBacktestSignalFeatures(), buyAndHoldReturn(), calculateBaselines(), DEFAULT_BACKTEST_CONFIGURATION, entryBasePrice(), groupMetrics(), isStopTouched() (+40 more)

### Community 25 - "combined-broad-strategy-target-audit-runner.ts"
Cohesion: 0.13
Nodes (23): DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_ID, DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL, DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_VERSION, AuditRow, average(), buildCandidates(), buildCohorts(), COHORT_DEFINITIONS (+15 more)

### Community 26 - "processor.ts"
Cohesion: 0.09
Nodes (29): AlertEvaluationInput, AlertEvaluationReason, AlertEvaluationResult, buildOneTimeAlertDedupeKey(), comparePriceValues(), DEFAULT_MAX_QUOTE_AGE_MS, evaluatePriceAlert(), ParsedDecimal (+21 more)

### Community 27 - "symmetric-regime-strategy-runner.ts"
Cohesion: 0.10
Nodes (30): BacktestTrade, DailySwingBroadCandidateRow, scanDailySwingSetupBatch(), readFrozenSymmetricTrainHistory(), DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_ID, DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_PROTOCOL, DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_VERSION, assertFrozenConfiguration() (+22 more)

### Community 28 - "cross-sectional-momentum-runner.ts"
Cohesion: 0.10
Nodes (37): ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_ID, ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL, ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_VERSION, writeMomentumDevelopmentReport(), Costs, EquityPoint, evaluateMomentumDevelopmentGates(), executeTargets() (+29 more)

### Community 29 - "data/instruments.ts"
Cohesion: 0.13
Nodes (22): InstrumentResolutionError, isDuplicateKeyError(), normalizeFinnhubSymbol(), resolveFinnhubEquityCatalogInstrument(), resolveFinnhubEquityInstrument(), DashboardProfileData, DashboardQuoteData, fetchStockData() (+14 more)

### Community 30 - "DailyMarketAnalysisCard.tsx"
Cohesion: 0.11
Nodes (23): analysisEndpointForInstrument(), AnalysisLoadState, AvailableAnalysis(), DailyMarketAnalysisCard(), DailyMarketAnalysisCardProps, DailyMarketAnalysisError(), DailyMarketAnalysisLoading(), DailyMarketAnalysisView() (+15 more)

### Community 31 - "combined-broad-episode-dataset.ts"
Cohesion: 0.10
Nodes (34): AnalysisDatasetSplitSummary, DailySwingBroadWalkForwardFold, DAILY_SWING_COMBINED_BROAD_DATASET_VERSION, DAILY_SWING_COMBINED_BROAD_UNIVERSE_NAME, DailySwingCombinedBroadDataset, DailySwingCombinedBroadDatasetRow, DailySwingCombinedBroadSourceScan, buildDailySwingCombinedBroadEpisodeDataset() (+26 more)

### Community 32 - "global.d.ts"
Cohesion: 0.07
Nodes (29): Alert, AlertData, AlertModalProps, AlertsListProps, CountrySelectProps, FinancialsData, FinnhubSearchResponse, FinnhubSearchResult (+21 more)

### Community 33 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 34 - "scan-analysis-setups.ts"
Cohesion: 0.21
Nodes (12): writeDailySwingSetupScanReport(), writeLargeJsonObjectWithArray(), writeText(), main(), main(), option(), parseInput(), parseMarketBars() (+4 more)

### Community 35 - "combined-broad-strategy-redesign-runner.ts"
Cohesion: 0.10
Nodes (29): DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_ID, DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL, DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_VERSION, average(), BenchmarkInput, benchmarkRiskAt(), cohortMetrics(), FoldId (+21 more)

### Community 36 - "transparent-analysis-panel.ts"
Cohesion: 0.10
Nodes (31): AnalysisState, TechnicalAnalysisReadyResult, TechnicalAnalysisUnavailableReason, analysisPanelContext(), APPROVED_WARNING_MAP, approvedWarnings(), BuildAnalysisPanelInput, buildAnalysisPanelResponse() (+23 more)

### Community 37 - "email-suppression.ts"
Cohesion: 0.18
Nodes (20): POST(), BetterAuthUser, capturePermanentSmtpFailure(), EmailSuppressionRecordResult, findUserIdByEmail(), lowerPriorityReasons, recordEmailSuppressionByEmail(), createEmailEventWebhookSignature() (+12 more)

### Community 38 - "unsubscribe-token.ts"
Cohesion: 0.16
Nodes (20): POST(), unsubscribeFromDailyNews(), UnsubscribePage(), unsubscribeFromMarketNews(), addUtcMonths(), assertSigningSecret(), createDailyNewsUnsubscribeToken(), createDailyNewsUnsubscribeUrls() (+12 more)

### Community 39 - "cn"
Cohesion: 0.09
Nodes (34): CountrySelect(), CountrySelectProps, Checkbox(), Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput() (+26 more)

### Community 40 - "UserDropdown.tsx"
Cohesion: 0.10
Nodes (21): NavItems(), Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), DropdownMenu() (+13 more)

### Community 41 - "analysis/run-tests.ts"
Cohesion: 0.11
Nodes (28): FROZEN_CONFIRMATION_SYMBOLS, BROAD_DEVELOPMENT_CATEGORIES, BROAD_DEVELOPMENT_DATA_POLICY, BROAD_DEVELOPMENT_LIQUIDITY_POLICY, BROAD_DEVELOPMENT_UNIVERSE_VERSION, BroadDevelopmentCoverageEvaluation, BroadDevelopmentCoverageSnapshot, evaluateBroadDevelopmentCoverage() (+20 more)

### Community 42 - "onboarding/service.ts"
Cohesion: 0.12
Nodes (23): allowedInvestmentExperiences, allowedInvestmentGoals, allowedPreferredIndustries, allowedPreferredMarkets, allowedRiskTolerances, CompleteOnboardingResult, completeOnboardingWorkflow(), createOnboardingDefaults() (+15 more)

### Community 43 - "boosted-model.ts"
Cohesion: 0.14
Nodes (20): ClassificationMetrics, binaryTarget(), BOOSTED_DEVELOPMENT_THRESHOLDS, BOOSTED_TRAINING_CONFIGURATION, CandidateThresholds, fitStump(), minimum(), rawPredictions() (+12 more)

### Community 44 - "equity-catalog.ts"
Cohesion: 0.12
Nodes (26): formatInstrumentType(), WatchlistInstrumentDetails(), WatchlistTable(), applyChanges, EquityInstrument, listingKey(), run(), typeCounts() (+18 more)

### Community 45 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, @next/env, devDependencies, eslint, eslint-config-next, @next/env, tailwindcss (+17 more)

### Community 46 - "baseline-model.ts"
Cohesion: 0.09
Nodes (30): auc(), BASELINE_TRAINING_CONFIGURATION, binaryTarget(), CATEGORICAL_FEATURES, compareRegressionToConstantBaseline(), encodeBaselineFeatureRows(), EncodedBaselineRows, evaluateRegressionMetrics() (+22 more)

### Community 47 - "require-user.ts"
Cohesion: 0.18
Nodes (13): OnboardingForm(), PreferencesForm(), completeOnboarding(), saveOnboardingProgress(), AccessControlError, assertCompletedUser(), assertVerifiedUser(), AuthenticatedUser (+5 more)

### Community 48 - "transparent-analysis-daily-observation.ts"
Cohesion: 0.22
Nodes (15): DAILY_CANDIDATES, increment(), isRecordedDate(), isValidInstrumentRequest(), StoredTelemetryLine, summarizeTransparentAnalysisObservation(), TRANSPARENT_ANALYSIS_OBSERVATION_MINIMUM_DAYS, TRANSPARENT_ANALYSIS_OBSERVATION_MINIMUM_REQUESTS (+7 more)

### Community 49 - "training-diagnostics.ts"
Cohesion: 0.14
Nodes (20): DAILY_SWING_ANALYSIS_DATASET_VERSION, ACTIONABLE_SUCCESS_R_THRESHOLD, buildEpisodes(), diagnoseDailySwingTrainingData(), Episode, finiteR(), percentile(), repeatSimilarity() (+12 more)

### Community 50 - "market-data/service.ts"
Cohesion: 0.09
Nodes (24): FakeProvider, getFinnhubApiKey(), invertBars(), invertPositiveDecimal(), invertQuote(), marketStateForCalendar(), normalizeMarketNumber(), FinnhubQuotePayload (+16 more)

### Community 51 - "backtest-daily-swing-batch.ts"
Cohesion: 0.14
Nodes (20): runDailySwingBatchDiagnosticBacktest(), DailySwingBatchDiagnosticReport, withFriction(), DAILY_SWING_V2_CONFIRMATION_ID, DAILY_SWING_V2_CONFIRMATION_THRESHOLDS, DailySwingV2Confirmation, evaluateDailySwingV2Confirmation(), maximum() (+12 more)

### Community 52 - "watchlist.ts"
Cohesion: 0.22
Nodes (17): mapWithConcurrency(), addToCurrentUserWatchlist(), enrichWatchlistItems(), getCurrentUserId(), getPaginatedWatchlistWithData(), getWatchlistSymbolsForUser(), getWatchlistWithData(), isDuplicateKeyError() (+9 more)

### Community 53 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 54 - "transparent-analysis-service.ts"
Cohesion: 0.24
Nodes (13): dynamic, GET(), runtime, orchestrateTransparentAnalysis(), response(), getMarketDataService(), getTransparentAnalysisPanel(), toAnalysisInstrument() (+5 more)

### Community 55 - "transparent-analysis-orchestrator.ts"
Cohesion: 0.18
Nodes (17): AnalysisCatalogInstrument, classifyTransparentAnalysisOperationalFailure(), hasEnabledBarsBinding(), isEligibleBenchmark(), isEligibleTarget(), loadBenchmarkBars(), reportFailure(), benchmarkInstrument() (+9 more)

### Community 56 - "mongoose.ts"
Cohesion: 0.12
Nodes (19): runMigration(), applyChanges, FinnhubProfile, getFinnhubProfile(), isDuplicateKeyError(), LEGACY_WATCHLIST_FILTER, LegacyWatchlistRow, runMigration() (+11 more)

### Community 57 - "broad-dataset.ts"
Cohesion: 0.06
Nodes (58): BacktestSignalFeatures, DAILY_SWING_BACKTEST_VERSION, UntriggeredSetup, applyDailySwingBroadSplitPolicy(), BASE_NULLABLE_FEATURES, baseFeatures(), buildDailySwingBroadDataset(), buildWalkForwardFolds() (+50 more)

### Community 58 - "auth.actions.ts"
Cohesion: 0.05
Nodes (51): handler(), SignInPage(), SignUpPage(), VerifyEmailPage(), AuthDivider(), AuthFormError(), FooterLink(), GoogleAuthButton() (+43 more)

### Community 59 - "NotificationsForm.tsx"
Cohesion: 0.16
Nodes (17): InputField(), categoryLabels, frequencyOptions, NotificationsForm(), preferenceKey(), Label(), Select(), SelectContent() (+9 more)

### Community 60 - "analysis-dataset.types.ts"
Cohesion: 0.16
Nodes (21): AnalysisDatasetFeatureVector, AnalysisDatasetRow, AnalysisDatasetSplit, DailySwingAnalysisDataset, dataset(), features(), row(), featureVector() (+13 more)

### Community 61 - "combined-broad-fold-dataset.types.ts"
Cohesion: 0.17
Nodes (12): DAILY_SWING_COMBINED_BROAD_FINAL_EPISODE_SHA256, DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_SHA256, DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_VERSION, DAILY_SWING_COMBINED_BROAD_FOLD_INVENTORY, DailySwingCombinedBroadFoldDataset, CombinedBroadCandidateReport, CombinedBroadDevelopmentActuals, evaluateCombinedBroadDevelopmentGates() (+4 more)

### Community 62 - "objective-features.ts"
Cohesion: 0.23
Nodes (12): buildDailySwingObjectiveFeatures(), BuildDailySwingObjectiveFeaturesInput, median(), nearestLevel(), parseBars(), percentileRank(), positiveDollarVolumes(), positiveVolumes() (+4 more)

### Community 63 - "risk-controlled-momentum-v2-universe.ts"
Cohesion: 0.12
Nodes (27): ORIGINAL_DEVELOPMENT_SYMBOLS, assertRiskControlledMomentumV2ManifestIntegrity(), Candidate, Exchange, RISK_CONTROLLED_MOMENTUM_V2_COMPUTED_MANIFEST_SHA256, RISK_CONTROLLED_MOMENTUM_V2_EXCLUDED_SYMBOLS, RISK_CONTROLLED_MOMENTUM_V2_INCEPTION_CUTOFF, RISK_CONTROLLED_MOMENTUM_V2_METADATA_VERIFIED_AT (+19 more)

### Community 64 - "crypto-catalog.ts"
Cohesion: 0.24
Nodes (10): CryptoCatalogEntry, currency(), normalizeFinnhubCoinbaseCatalogEntry(), normalizeMassiveCryptoCatalogEntry(), pairKey(), reconcileCoinbaseCryptoCatalogs(), usesUsd(), isTradingViewCoinbaseSpotSymbolAvailable() (+2 more)

### Community 65 - "us-equity-session.ts"
Cohesion: 0.16
Nodes (18): CLOSED_SESSION_DATES, dateKey(), EARLY_CLOSE_SESSION_DATES, isSupported(), isWeekend(), LocalDate, LocalDateTime, NEW_YORK_PARTS (+10 more)

### Community 66 - "requireUser"
Cohesion: 0.18
Nodes (13): Layout(), OnboardingPage(), InstrumentPage(), Layout(), PreferencesSettingsPage(), Header(), HeaderNavigation(), getRequestSession (+5 more)

### Community 67 - "analysis-dataset.test.ts"
Cohesion: 0.27
Nodes (8): at(), developmentReport(), FIRST_SIGNAL, instrumentReport(), SIGNAL_FEATURES, SIGNAL_QUALITY, trade(), untriggered()

### Community 68 - "MarketBars"
Cohesion: 0.15
Nodes (16): auditProviderSeries(), BacktestProviderAuditReport, buildProviderAuditReport(), dateKey(), median(), percentile(), ProviderSeriesAudit, THRESHOLDS (+8 more)

### Community 69 - "index.ts"
Cohesion: 0.16
Nodes (17): BetterAuthUser, getEmailEligibilityByEmail(), getPreference(), EmailEligibilityRequest, EmailEligibilityResult, EmailBranding, getApplicationBaseUrl(), getEmailBranding() (+9 more)

### Community 70 - "episode-validation.test.ts"
Cohesion: 0.31
Nodes (8): evaluate(), features(), fixture(), PREREGISTRATION_SHA, row(), sealRows(), SOURCE_SHA, TRAINING_SHA

### Community 71 - "combined-broad-train-diagnostic-runner.test.ts"
Cohesion: 0.27
Nodes (7): run(), syntheticDataset(), DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_ID, DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL, DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_VERSION, main(), readFrozen()

### Community 72 - "fetch-backtest-history.ts"
Cohesion: 0.46
Nodes (7): dateArgument(), ensureWritableDestination(), fetchBars(), main(), option(), requireSymbol(), serializeBars()

### Community 73 - "DashboardWatchlist.tsx"
Cohesion: 0.27
Nodes (7): DashboardWatchlist(), DashboardWatchlistItem, StockLogo(), StockLogoProps, ScrollArea(), ScrollBar(), formatCurrencyValue()

### Community 74 - "sync-instrument-catalog.ts"
Cohesion: 0.10
Nodes (38): applyChanges, bindingKey(), deactivateOnly, ExistingInstrument, matchingExistingInstruments(), normalizeCatalog(), omittedInstrumentFields(), OPTIONAL_INSTRUMENT_FIELDS (+30 more)

### Community 75 - "transparent-analysis-telemetry.test.ts"
Cohesion: 0.31
Nodes (5): AnalysisPanelAvailableResponse, appendTransparentAnalysisLocalTelemetry(), TRANSPARENT_ANALYSIS_LOCAL_TELEMETRY_PATH, transparentAnalysisLocalTelemetryPath(), transparentAnalysisDurationBucket

### Community 76 - "watchlist-policy.test.ts"
Cohesion: 0.52
Nodes (5): hasWatchlistCapacity(), paginateWatchlist(), parseRequestedPage(), WATCHLIST_MAX_ITEMS, WATCHLIST_PAGE_SIZE

### Community 77 - "WatchlistButton.tsx"
Cohesion: 0.73
Nodes (4): WatchlistButton(), addToWatchlist(), removeFromWatchlist(), revalidateWatchlistViews()

### Community 78 - "TradingViewWidget.tsx"
Cohesion: 0.60
Nodes (3): TradingViewWidget(), TradingViewWidgetProps, useTradingViewWidget()

### Community 79 - "migrate-communication-preferences.ts"
Cohesion: 0.29
Nodes (8): applyChanges, MigrationSummary, runMigration(), CommunicationPreferenceSnapshot, createLegacyCommunicationPreferenceSeed(), LegacyCommunicationPreferenceSeed, LegacyUserProfileEmailPreference, migratedAt

### Community 80 - "email-rendering.ts"
Cohesion: 0.12
Nodes (26): dashboardUrl(), formatPrice(), formatTimestamp(), renderAlertEmail(), controlledTag(), escapeHtml(), PARAGRAPH_ATTRIBUTES, parseSafeHttpUrl() (+18 more)

### Community 81 - "backtest.test.ts"
Cohesion: 0.24
Nodes (6): bar(), historicalBars(), longPlan(), SIGNAL_AT, simulate(), DailySwingAnalysisInput

### Community 82 - "risk-controlled-momentum-v2-history.ts"
Cohesion: 0.19
Nodes (17): RISK_CONTROLLED_MOMENTUM_V2_DEVELOPMENT_ID, RISK_CONTROLLED_MOMENTUM_V2_DEVELOPMENT_VERSION, RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL, buildRiskControlledMomentumV2HistoryArtifact(), RISK_CONTROLLED_MOMENTUM_V2_HISTORY_POLICY, RISK_CONTROLLED_MOMENTUM_V2_HISTORY_VERSION, serializeBar(), serializeMarketData() (+9 more)

### Community 84 - "watchlist/page.tsx"
Cohesion: 0.22
Nodes (8): WatchlistContent(), WatchlistSearchParams, WatchlistAlerts(), WatchlistNewsLoading(), WatchlistPageLoading(), WatchlistPagination(), WatchlistSearch(), getFinnhubWatchlistNewsSymbol()

### Community 85 - "alerts/run-tests.ts"
Cohesion: 0.19
Nodes (6): ALERT_EMAIL_DELIVERY_CRON, ALERT_EMAIL_DELIVERY_EVENT, ALERT_EMAIL_DELIVERY_FUNCTION_CONFIG, ALERT_MONITORING_CRON, ALERT_MONITORING_EVENT, ALERT_MONITORING_FUNCTION_CONFIG

### Community 86 - "combined-broad-model-features.ts"
Cohesion: 0.24
Nodes (13): DailySwingCombinedBroadEpisodeRow, clip(), COMBINED_BROAD_CATEGORICAL_FEATURES, COMBINED_BROAD_NUMERIC_FEATURES, encodeCombinedBroadFeatureRows(), finite(), fitCombinedBroadFeatureEncoder(), median() (+5 more)

### Community 87 - "canonical-key.ts"
Cohesion: 0.11
Nodes (26): applyChanges, LegacyMetalInstrument, runMigration(), targetDefinition(), buildCanonicalKey(), CANONICAL_KEY_MAX_LENGTH, CANONICAL_KEY_PATTERN, CanonicalInstrumentIdentity (+18 more)

### Community 88 - "Q: Why does connectToDatabase() bridge 17 distinct communities?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why does connectToDatabase() bridge 17 distinct communities?, Source Nodes

### Community 89 - "fetch-backtest-batch.ts"
Cohesion: 0.23
Nodes (14): dateArgument(), DEFAULT_ETF_SYMBOLS, delay(), ensureWritableDestination(), fetchBars(), fetchBarsWithRateLimitRetry(), instrument(), main() (+6 more)

### Community 90 - "CountryList"
Cohesion: 0.13
Nodes (4): CountryList, CountryMap, CountryOption, react-select-country-list

### Community 91 - "AlertDialogs.tsx"
Cohesion: 0.24
Nodes (12): AlertDetailsDialog(), AlertDetailsDialogProps, CreateAlertDialog(), CreateAlertDialogProps, CreateAlertDialogState(), instrumentKey(), suggestedThreshold(), Button() (+4 more)

### Community 92 - "Daily Swing Episode Model v1 Preregistration"
Cohesion: 0.15
Nodes (14): 5,000-Episode Coverage Gate, Daily Swing Broad Episode Training v1, Episode-First Selection, Walk-Forward Model Selection, Daily Swing Episode Model v1 Preregistration, Episode Actionable Logistic Model, Independent Episode Split Policy, Rejected Episode Validation Result (+6 more)

### Community 95 - "connectToDatabase"
Cohesion: 0.12
Nodes (20): NotificationSettingsPage(), MarketNewsDeliveryLogDocument, marketNewsDeliveryLogSchema, MarketNewsDeliveryStatus, connectToDatabase(), getVerifiedMarketNewsRecipient(), getEmailEligibility(), getLegacyDailyNewsEmailPreference() (+12 more)

### Community 97 - "risk-controlled-momentum-v3-development.ts"
Cohesion: 0.32
Nodes (8): assertRiskControlledMomentumV3IsOpen(), RISK_CONTROLLED_MOMENTUM_V3_CLOSURE, RISK_CONTROLLED_MOMENTUM_V3_CLOSURE_STATUS, RISK_CONTROLLED_MOMENTUM_V3_CLOSURE_VERSION, RISK_CONTROLLED_MOMENTUM_V3_DEVELOPMENT_ID, RISK_CONTROLLED_MOMENTUM_V3_DEVELOPMENT_VERSION, RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL, main()

### Community 98 - "risk-controlled-momentum-v3-source.ts"
Cohesion: 0.33
Nodes (11): RiskControlledMomentumBenchmarkHistory, RiskControlledMomentumSleeveId, bar(), JsonObject, marketBars(), object(), parseRiskControlledMomentumV3HistoryArtifact(), positive() (+3 more)

### Community 99 - "email-template.test.ts"
Cohesion: 0.29
Nodes (10): NEWS_SUMMARY_EMAIL_PROMPT, PERSONALIZED_WELCOME_EMAIL_PROMPT, TRADINGVIEW_SYMBOL_MAPPING_PROMPT, INACTIVE_USER_REMINDER_EMAIL_TEMPLATE, NEWS_SUMMARY_EMAIL_TEMPLATE, STOCK_ALERT_LOWER_EMAIL_TEMPLATE, STOCK_ALERT_UPPER_EMAIL_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE (+2 more)

### Community 100 - "smoke-transparent-analysis.ts"
Cohesion: 0.33
Nodes (9): transparentAnalysisHistoryQuery(), AnalysisPanelResponse, buildTransparentAnalysisSmokeFailure(), buildTransparentAnalysisSmokeSummary(), TRANSPARENT_ANALYSIS_SMOKE_VERSION, TransparentAnalysisSmokeFailure, TransparentAnalysisSmokeSummary, validateTransparentAnalysisSmokeArguments() (+1 more)

### Community 101 - "instruments/run-tests.ts"
Cohesion: 0.10
Nodes (16): applyChanges, EquityInstrument, run(), AlertEventItem, alertEventSchema, EmailDeliveryStatus, AlertItem, alertSchema (+8 more)

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

### Community 113 - "combined-broad-model-development.ts"
Cohesion: 0.38
Nodes (5): DAILY_SWING_COMBINED_BROAD_EPISODE_SHA256, DAILY_SWING_COMBINED_BROAD_MODEL_DEVELOPMENT_ID, DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL, DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL_VERSION, LOGISTIC_PENALTIES

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

### Community 120 - "Future Strategy Research Resumption Guide"
Cohesion: 0.33
Nodes (6): One-Shot Validation, Clean Non-Overlapping Development Source, Future Strategy Research Resumption Guide, Liquid ETF Daily Mean Reversion, Multi-Asset Time-Series Trend, Research Restart Sequence

### Community 121 - "ETF Cross-Sectional Momentum Development v1"
Cohesion: 0.33
Nodes (6): Daily Swing v3 Portfolio Preregistration, Signal-Time Ranked Portfolio, ETF Cross-Sectional Momentum Development v1, Four-Sleeve 12-Minus-1 Momentum, Static Four-Sleeve Benchmark, Thirteen-Gate Decision Rule

### Community 122 - "Bullish Market Growth"
Cohesion: 0.70
Nodes (5): Bull Silhouette, Bullish Market Growth, Bullwise Market Growth Icon, Rising Bar Chart, Upward Trend Arrow

### Community 125 - "Email Client Rendering Checklist"
Cohesion: 0.67
Nodes (4): Email Client Rendering Checklist, Email Rendering Compatibility Contract, Real-Inbox Rendering Smoke Test, Price Alert Email Template

### Community 129 - "Bull and Rising Market Chart Motif"
Cohesion: 1.00
Nodes (3): Bull and Rising Market Chart Motif, Bull Wise Email Logo, Bull Wise Wordmark

## Knowledge Gaps
- **646 isolated node(s):** `metadata`, `sections`, `metadata`, `sections`, `MARKET_SUMMARY_WIDGET_CONFIG` (+641 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `connectToDatabase()` connect `connectToDatabase` to `requireUser`, `auth.actions.ts`, `instruments/run-tests.ts`, `user-alerts.ts`, `functions.ts`, `index.ts`, `email-suppression.ts`, `communication-policy.ts`, `email-delivery.ts`, `require-user.ts`, `types/instruments.ts`, `watchlist.ts`, `transparent-analysis-service.ts`, `mongoose.ts`, `processor.ts`, `data/instruments.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `AssetClass` connect `types/instruments.ts` to `global.d.ts`, `user-alerts.ts`, `technical-analysis.types.ts`, `sync-instrument-catalog.ts`, `types.ts`, `market-data/service.ts`, `watchlist.ts`, `processor.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `EquitySecurityType` connect `types/instruments.ts` to `global.d.ts`, `technical-analysis.ts`, `fetch-backtest-history.ts`, `technical-analysis.types.ts`, `equity-catalog.ts`, `watchlist.ts`, `transparent-analysis-orchestrator.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `metadata`, `sections`, `metadata` to the rest of the system?**
  _646 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.03125 - nodes in this community are weakly interconnected._
- **Should `technical-analysis.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10338164251207729 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._