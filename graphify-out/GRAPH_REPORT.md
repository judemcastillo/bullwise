# Graph Report - bullwise  (2026-08-25)

## Corpus Check
- 475 files · ~244,012 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2835 nodes · 6830 edges · 138 communities (131 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.85)
- Token cost: 540 input · 120 output

## Community Hubs (Navigation)
- Analysis Research Scripts
- Avatar UI Components
- Analysis Domain Types
- Runtime Dependencies
- Authentication Jobs And Tools
- Alert Domain Infrastructure
- Transparent Analysis API
- Daily Swing V2 Backtesting
- Daily Swing V3 Portfolio
- Communication Preferences
- Daily Swing Strategy State
- Email Delivery Repositories
- Research Governance Documents
- Combined Broad Dataset
- Backtest Performance Types
- Market Bar Providers
- Dataset Build Summaries
- Portfolio Performance Math
- Combined Training Diagnostics
- Episode Experiment Controls
- Equity Asset Catalog
- Broad Dataset Metadata
- Instrument Page Data
- Dashboard Widget Configuration
- Daily Setup Scanning
- Strategy Target Auditing
- Analysis Telemetry Recording
- Symmetric Regime Research
- Momentum Portfolio Metrics
- Watchlist Data Flow
- Market Analysis Cards
- Combined Dataset Versioning
- Alert UI Models
- TypeScript Project Configuration
- Daily Swing Backtest Core
- Strategy Redesign Benchmark
- Analysis Warning Presentation
- Email Webhook Validation
- Unsubscribe Token Security
- Alert Dialog Components
- Dropdown Menu Components
- Broad Universe Expansion
- Onboarding Workflow
- Onboarding Form Fields
- Equity Catalog Filtering
- Build Tool Dependencies
- Boosted Model Training
- Data Provider Constructors
- Popular Instrument Catalog
- Analysis Feature Schema
- Provider Data Access
- Quote Provider Access
- ETF Momentum Research
- UI Component Configuration
- Risk Momentum Manifest
- Analysis Catalog Scheduling
- Finnhub Equity Mapping
- Walk Forward Splits
- Authentication Forms
- Notification Settings Filters
- Actionable Success Research
- Baseline Feature Encoding
- Objective Feature Engineering
- Momentum History Policies
- Forex Instrument Catalog
- Market Calendar Logic
- Application Layouts
- Dataset Split Types
- Provider Audit Serialization
- Email Branding Configuration
- Email Rendering Tests
- Financial News Fetching
- Market Data Intervals
- Dashboard Watchlist UI
- Instrument Catalog Preparation
- Combined Training Serialization
- Authentication Test Fixtures
- Preference Migration
- Verification Email Limits
- Daily News Preferences
- Email Content Safety
- Combined Fold Inventory
- Momentum V2 Integrity
- Commodity Catalog
- Watchlist News UI
- Alert Delivery Jobs
- Broad Universe Policy
- Canonical Instrument Identity
- Market Symbol Fetching
- Research Provider CLI
- Chart Data Adapters
- Authentication UI Components
- Episode Training Research
- Baseline Model Training
- Crypto Instrument Catalog
- News Delivery Leasing
- Alert Evaluation Logic
- Momentum V3 Closure
- Momentum Benchmark Types
- Email Template Registry
- Analysis Smoke Testing
- TradingView Equity Sync
- Dataset Export Scripts
- Symmetric Regime Script
- Lockfile Dependencies
- Full Dashboard Design
- Combined Model Diagnostics
- ETF Risk Control Research
- Signal Window Features
- Dashboard Preview Design
- Legal Document UI
- Regime Strategy Research
- Strategy Research Reset
- Combined Model Protocol
- BullWise Brand Assets
- Root Application Layout
- Product And Communication Docs
- Data Feasibility Research
- Transparent Analysis Product
- Watchlist Mutations
- Future Strategy Research
- Portfolio Research Designs
- Market Growth Icon
- Settings Navigation
- Email Verification UI
- Email Rendering Contract
- Request Proxy Configuration
- Email Logo Asset
- Daily Swing V2 Filter
- ESLint Configuration
- Next Configuration
- PostCSS Configuration
- Star Icon

## God Nodes (most connected - your core abstractions)
1. `cn()` - 94 edges
2. `scripts` - 63 edges
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
- `GET()` --indirect_call--> `requireUser()`  [INFERRED]
  app/api/instruments/[canonicalKey]/analysis/route.ts → lib/auth/require-user.ts

## Import Cycles
- 4-file cycle: `lib/analysis/analysis-dataset.ts -> lib/analysis/setup-scan.types.ts -> lib/analysis/objective-features.types.ts -> lib/analysis/broad-development-universe.ts -> lib/analysis/analysis-dataset.ts`

## Hyperedges (group relationships)
- **Graphify Build Query and Update Workflow** — _codex_skills_graphify_graphify_pipeline, _codex_skills_graphify_references_query_graph_query_navigation, _codex_skills_graphify_references_update_incremental_update, _codex_skills_graphify_references_hooks_graphify_hooks [EXTRACTED 1.00]
- **Sealed Research Evidence Safeguards** — _agents_skills_bullwise_analysis_research_holdout_safeguards, docs_daily_swing_backtesting_episode_first_one_shot_validation, docs_daily_swing_broad_dataset_v2_split_and_sealed_test_policy, docs_daily_swing_broad_combined_episode_training_v1_train_only_materialization [INFERRED 0.95]
- **Outcome-Blind Broad Dataset Pipeline** — docs_daily_swing_broad_development_v1_outcome_blind_liquidity_policy, docs_daily_swing_broad_development_v2_sample_coverage_expansion, docs_daily_swing_broad_combined_dataset_v3_label_blind_combination, docs_daily_swing_broad_combined_episode_training_v1_train_only_materialization [INFERRED 0.95]
- **Daily Setup Research Rejection Chain** — docs_daily_swing_combined_model_development_v1_daily_swing_combined_model_development_v1, docs_daily_swing_combined_train_diagnostics_v1_daily_swing_combined_train_diagnostics_v1, docs_daily_swing_combined_strategy_target_audit_v1_daily_swing_combined_strategy_and_target_audit_v1, docs_daily_swing_combined_strategy_redesign_v1_daily_swing_combined_strategy_redesign_v1, docs_daily_swing_symmetric_regime_development_v1_daily_swing_symmetric_regime_development_v1, docs_daily_swing_strategy_research_reset_v1_daily_swing_strategy_research_reset_v1 [INFERRED 0.95]
- **Momentum and Risk-Control Research Chain** — docs_etf_cross_sectional_momentum_development_v1_etf_cross_sectional_momentum_development_v1, docs_etf_cross_sectional_momentum_development_v1_result_etf_cross_sectional_momentum_development_v1_result, docs_etf_risk_controlled_momentum_v2_source_and_protocol_design_etf_risk_controlled_momentum_v2_source_and_protocol_design, docs_etf_risk_controlled_momentum_v2_preregistration_etf_risk_controlled_momentum_v2_preregistration, docs_etf_risk_controlled_momentum_v2_source_feasibility_result_etf_risk_controlled_momentum_v2_source_feasibility_result, docs_etf_risk_controlled_momentum_v3_preregistration_etf_risk_controlled_momentum_v3_preregistration, docs_future_strategy_research_resumption_future_strategy_research_resumption_guide [INFERRED 0.95]
- **Transparent Analysis Product Boundary** — docs_transparent_analysis_panel_v1_contract_deterministic_daily_market_context, docs_transparent_analysis_panel_v1_contract_allow_listed_product_adapter, docs_transparent_analysis_panel_v1_contract_ai_explanation_boundary, docs_transparent_analysis_telemetry_v1_privacy_preserving_operational_telemetry [INFERRED 0.85]
- **Bullish Growth Visual Identity** — app_icon_bullwise_market_growth_icon, app_icon_bull_silhouette, app_icon_rising_bar_chart, app_icon_upward_trend_arrow, app_icon_bullish_market_growth [INFERRED 0.95]
- **BullWise Brand Lockup** — public_assets_icons_logo_bullwise_logo, public_assets_icons_logo_bull_and_rising_chart_emblem, public_assets_icons_logo_bull_wise_wordmark [EXTRACTED 1.00]
- **Dashboard Market Intelligence Sections** — public_assets_images_dashboard_preview_market_summary, public_assets_images_dashboard_preview_watchlist, public_assets_images_dashboard_preview_top_stocks, public_assets_images_dashboard_preview_financial_news [INFERRED 0.85]
- **Unified Market Intelligence** — public_assets_images_dashboard_market_summary, public_assets_images_dashboard_watchlist, public_assets_images_dashboard_top_stocks_table, public_assets_images_dashboard_financial_news_feed [INFERRED 0.85]

## Communities (138 total, 7 thin omitted)

### Community 0 - "Analysis Research Scripts"
Cohesion: 0.03
Nodes (63): scripts, audit:analysis-broad-combined-strategy-target, audit:backtest-providers, backtest:daily-swing, backtest:daily-swing-batch, backtest:daily-swing-portfolio, backtest:daily-swing-v2-holdout, backtest:daily-swing-v3-holdout (+55 more)

### Community 1 - "Avatar UI Components"
Cohesion: 0.07
Nodes (49): CountrySelect(), CountrySelectProps, Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage() (+41 more)

### Community 2 - "Analysis Domain Types"
Cohesion: 0.07
Nodes (51): annualizedRealizedVolatility(), averageTrueRangeSeries(), exponentialMovingAverageSeries(), macdSeries(), NumericBar, percentageReturn(), relativeStrengthIndexSeries(), rsiFromAverages() (+43 more)

### Community 3 - "Runtime Dependencies"
Cohesion: 0.04
Nodes (47): @base-ui/react, better-auth, class-variance-authority, clsx, cmdk, country-flag-icons, inngest, lucide-react (+39 more)

### Community 4 - "Authentication Jobs And Tools"
Cohesion: 0.09
Nodes (39): { GET, POST, PUT }, deliverAlertEmailOutbox(), BetterAuthUser, getVerifiedMarketNewsRecipient(), listMarketNewsRecipientIdsPage(), MarketNewsRecipientPage, PreferenceUserId, EMAIL_FREQUENCIES (+31 more)

### Community 5 - "Alert Domain Infrastructure"
Cohesion: 0.10
Nodes (37): AlertDetailsDialogState(), AlertEventItem, alertEventSchema, EmailDeliveryStatus, AlertItem, alertSchema, actionError(), createAlertAction() (+29 more)

### Community 6 - "Transparent Analysis API"
Cohesion: 0.09
Nodes (32): dynamic, GET(), runtime, TransparentAnalysisOrchestrationResult, AnalysisPanelAvailableResponse, handleTransparentAnalysisRequest(), json(), PRIVATE_JSON_HEADERS (+24 more)

### Community 7 - "Daily Swing V2 Backtesting"
Cohesion: 0.08
Nodes (35): BacktestTradeExitReason, DailySwingBatchBacktestInput, average(), buildDailySwingBatchDiagnostics(), diagnosticTradeMetrics(), FrictionScenarioReports, GroupDefinition, groups() (+27 more)

### Community 8 - "Daily Swing V3 Portfolio"
Cohesion: 0.08
Nodes (30): activeAtOpen(), activeOpeningExposure(), Candidate, DEFAULT_CONFIGURATION, descendingNullable(), finitePositive(), latestMark(), PortfolioBacktestInput (+22 more)

### Community 9 - "Communication Preferences"
Cohesion: 0.09
Nodes (34): CommunicationPreferenceDocument, communicationPreferenceSchema, emailSubscriptionSchema, emailSuppressionSchema, subscriptionsValidationError(), validSubscriptions(), BetterAuthUser, getEmailEligibility() (+26 more)

### Community 10 - "Daily Swing Strategy State"
Cohesion: 0.08
Nodes (30): bar(), historicalBars(), longPlan(), SIGNAL_AT, simulate(), applyDailySwingV2Rules(), DAILY_SWING_V2_RULES, plan() (+22 more)

### Community 11 - "Email Delivery Repositories"
Cohesion: 0.09
Nodes (18): ALERT_EMAIL_BATCH_SIZE, ALERT_EMAIL_LEASE_MS, ALERT_EMAIL_MAX_ATTEMPTS, AlertEmailDeliveryStore, AlertEmailDeliverySummary, AlertEmailJob, AlertEmailRecipient, AlertEmailRecipientDirectory (+10 more)

### Community 12 - "Research Governance Documents"
Cohesion: 0.06
Nodes (39): Bullwise Analysis Research, Holdout Safeguards, Graphify Pipeline, Honest Graph Audit Trail, Graphify Add and Watch, Graphify Extra Exports, Edge Confidence Rubric, Semantic Extraction Specification (+31 more)

### Community 13 - "Combined Broad Dataset"
Cohesion: 0.11
Nodes (33): auc(), evaluateClassificationMetrics(), DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_SHA256, clip(), CombinedBroadFeatureEncoder, encodeCombinedBroadFeatureRows(), finite(), fitCombinedBroadFeatureEncoder() (+25 more)

### Community 14 - "Backtest Performance Types"
Cohesion: 0.08
Nodes (29): at(), developmentReport(), FIRST_SIGNAL, instrumentReport(), SIGNAL_FEATURES, SIGNAL_QUALITY, trade(), untriggered() (+21 more)

### Community 15 - "Market Bar Providers"
Cohesion: 0.09
Nodes (21): AlpacaBar, AlpacaBarsPayload, AlpacaBarsProvider, AlpacaBarsProviderOptions, parseBar(), validateRequest(), errorMessage(), parseBar() (+13 more)

### Community 16 - "Dataset Build Summaries"
Cohesion: 0.09
Nodes (32): buildDailySwingAnalysisDataset(), BuildDatasetInput, CandidateRow, collectRows(), DatasetOutcomeReport, DEFAULT_ANALYSIS_DATASET_SPLIT_RATIOS, features(), normalizedSymbols() (+24 more)

### Community 17 - "Portfolio Performance Math"
Cohesion: 0.14
Nodes (34): addTurnover(), candidateAt(), Costs, EquityPoint, evaluateGates(), executeTargets(), formationBars(), median() (+26 more)

### Community 18 - "Combined Training Diagnostics"
Cohesion: 0.12
Nodes (30): COMBINED_BROAD_NUMERIC_FEATURES, average(), averageRanks(), buildCohorts(), categoricalValue(), CohortMetric, EpisodeRow, featureDrift() (+22 more)

### Community 19 - "Episode Experiment Controls"
Cohesion: 0.13
Nodes (28): fitBaselineLinearModel(), linearPrediction(), predictBaselineProbabilities(), sigmoid(), DAILY_SWING_EPISODE_DATASET_VERSION, DailySwingEpisodeTrainingDataset, EpisodeTrainingRow, EpisodeTrainingTarget (+20 more)

### Community 20 - "Equity Asset Catalog"
Cohesion: 0.12
Nodes (26): applyChanges, EquityInstrument, listingKey(), run(), INSTRUMENT_TYPES_BY_ASSET_CLASS, InstrumentContract, instrumentContractSchema, InstrumentItem (+18 more)

### Community 21 - "Broad Dataset Metadata"
Cohesion: 0.12
Nodes (22): AnalysisDatasetLabels, DAILY_SWING_BROAD_DATASET_VERSION, DailySwingBroadDataset, DailySwingBroadDatasetRow, DailySwingBroadFeatureVector, buildDailySwingBroadEpisodeDataset(), finiteUtility(), requireSource() (+14 more)

### Community 22 - "Instrument Page Data"
Cohesion: 0.12
Nodes (26): InstrumentPage(), getInstrumentByCanonicalKey(), InstrumentResolutionError, isDuplicateKeyError(), normalizeFinnhubSymbol(), resolveFinnhubEquityCatalogInstrument(), resolveFinnhubEquityInstrument(), getWatchlistInstrumentIdsForUser() (+18 more)

### Community 23 - "Dashboard Widget Configuration"
Cohesion: 0.10
Nodes (23): Home(), MARKET_SUMMARY_WIDGET_CONFIG, DASHBOARD_TOP_STORIES_WIDGET_CONFIG, DashboardNews(), InstrumentDashboard(), InstrumentDashboardProps, TradingViewWidget(), TradingViewWidgetProps (+15 more)

### Community 24 - "Daily Setup Scanning"
Cohesion: 0.12
Nodes (29): applySlippage(), buildBacktestSignalFeatures(), buyAndHoldReturn(), calculateBaselines(), entryBasePrice(), groupMetrics(), isStopTouched(), isTargetTouched() (+21 more)

### Community 25 - "Strategy Target Auditing"
Cohesion: 0.11
Nodes (26): COMBINED_BROAD_CATEGORICAL_FEATURES, DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_ID, DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL, DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_VERSION, AuditRow, average(), buildCandidates(), buildCohorts() (+18 more)

### Community 26 - "Analysis Telemetry Recording"
Cohesion: 0.14
Nodes (17): AlertEvaluationReason, buildOneTimeAlertDedupeKey(), monitorDuePriceAlerts(), AlertMonitoringStore, MonitorableAlert, processAlertBatch(), FakeStore, now (+9 more)

### Community 27 - "Symmetric Regime Research"
Cohesion: 0.12
Nodes (24): DailySwingBroadCandidateRow, DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_ID, DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_PROTOCOL, DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_VERSION, assertFrozenConfiguration(), buildDailySwingSymmetricCandidateRows(), calculateShortBorrowStress(), cohortMetrics() (+16 more)

### Community 28 - "Momentum Portfolio Metrics"
Cohesion: 0.16
Nodes (28): Costs, EquityPoint, evaluateMomentumDevelopmentGates(), executeTargets(), median(), metricSummary(), MomentumBar, momentumCandidateAt() (+20 more)

### Community 29 - "Watchlist Data Flow"
Cohesion: 0.16
Nodes (25): WatchlistContent(), connectToDatabase(), mapWithConcurrency(), addToCurrentUserWatchlist(), enrichWatchlistItems(), getCurrentUserId(), getPaginatedWatchlistWithData(), getWatchlistSymbolsForUser() (+17 more)

### Community 30 - "Market Analysis Cards"
Cohesion: 0.11
Nodes (23): analysisEndpointForInstrument(), AnalysisLoadState, AvailableAnalysis(), DailyMarketAnalysisCard(), DailyMarketAnalysisCardProps, DailyMarketAnalysisError(), DailyMarketAnalysisLoading(), DailyMarketAnalysisView() (+15 more)

### Community 31 - "Combined Dataset Versioning"
Cohesion: 0.15
Nodes (24): DAILY_SWING_BROAD_SPLIT_BOUNDARIES, FrozenSource, requireSha256(), DAILY_SWING_BROAD_EXPANSION_SETUP_SCAN_SHA256, DAILY_SWING_COMBINED_BROAD_DATASET_VERSION, DAILY_SWING_COMBINED_BROAD_UNIVERSE_NAME, DailySwingCombinedBroadDataset, DailySwingCombinedBroadDatasetRow (+16 more)

### Community 32 - "Alert UI Models"
Cohesion: 0.07
Nodes (29): Alert, AlertData, AlertModalProps, AlertsListProps, CountrySelectProps, FinancialsData, FinnhubSearchResponse, FinnhubSearchResult (+21 more)

### Community 33 - "TypeScript Project Configuration"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 34 - "Daily Swing Backtest Core"
Cohesion: 0.11
Nodes (25): DEFAULT_BACKTEST_CONFIGURATION, BacktestConfiguration, DailySwingBacktestInput, analyzeDailySwingV2(), SerializedBatchHistory, SerializedMarketBar, SerializedMarketBars, TechnicalAnalysisInstrument (+17 more)

### Community 35 - "Strategy Redesign Benchmark"
Cohesion: 0.13
Nodes (22): DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_ID, DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL, DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_VERSION, average(), BenchmarkInput, benchmarkRiskAt(), cohortMetrics(), FoldId (+14 more)

### Community 36 - "Analysis Warning Presentation"
Cohesion: 0.12
Nodes (26): analysisPanelContext(), APPROVED_WARNING_MAP, approvedWarnings(), BuildAnalysisPanelInput, buildAnalysisPanelResponse(), buildUnavailableAnalysisPanelResponse(), ENGINE_UNAVAILABLE_REASON_MAP, isPartial() (+18 more)

### Community 37 - "Email Webhook Validation"
Cohesion: 0.16
Nodes (23): POST(), EmailSuppressionReason, EmailSuppressionSource, BetterAuthUser, capturePermanentSmtpFailure(), EmailSuppressionRecordResult, findUserIdByEmail(), lowerPriorityReasons (+15 more)

### Community 38 - "Unsubscribe Token Security"
Cohesion: 0.16
Nodes (20): POST(), unsubscribeFromDailyNews(), UnsubscribePage(), unsubscribeFromMarketNews(), addUtcMonths(), assertSigningSecret(), createDailyNewsUnsubscribeToken(), createDailyNewsUnsubscribeUrls() (+12 more)

### Community 39 - "Alert Dialog Components"
Cohesion: 0.13
Nodes (18): AlertDetailsDialog(), AlertDetailsDialogProps, CreateAlertDialog(), CreateAlertDialogProps, CreateAlertDialogState(), instrumentKey(), suggestedThreshold(), StockAlertButton() (+10 more)

### Community 40 - "Dropdown Menu Components"
Cohesion: 0.11
Nodes (18): Header(), HeaderNavigation(), NavItems(), SearchCommand(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem() (+10 more)

### Community 41 - "Broad Universe Expansion"
Cohesion: 0.13
Nodes (15): BROAD_DEVELOPMENT_V2_EXPANSION_CANDIDATES, BROAD_DEVELOPMENT_V2_EXPANSION_CATEGORIES, BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY, BROAD_DEVELOPMENT_V2_EXPANSION_INCEPTION_CUTOFF, BROAD_DEVELOPMENT_V2_EXPANSION_LIQUIDITY_POLICY, BROAD_DEVELOPMENT_V2_EXPANSION_NAME, BROAD_DEVELOPMENT_V2_EXPANSION_SELECTION_POLICY, BROAD_DEVELOPMENT_V2_EXPANSION_SOURCE_SHA256 (+7 more)

### Community 42 - "Onboarding Workflow"
Cohesion: 0.12
Nodes (22): allowedInvestmentExperiences, allowedInvestmentGoals, allowedPreferredIndustries, allowedPreferredMarkets, allowedRiskTolerances, CompleteOnboardingResult, createOnboardingDefaults(), getRecord() (+14 more)

### Community 43 - "Onboarding Form Fields"
Cohesion: 0.13
Nodes (17): CountrySelectField(), MultiSelectField(), defaultValues, stepFields, stepLabels, SelectField(), Label(), cachedSchemaIsCurrent (+9 more)

### Community 44 - "Equity Catalog Filtering"
Cohesion: 0.17
Nodes (20): applyChanges, EquityInstrument, listingKey(), run(), typeCounts(), prepareEquityCatalog(), entryKey(), EquityCatalogEntry (+12 more)

### Community 45 - "Build Tool Dependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, @next/env, devDependencies, eslint, eslint-config-next, @next/env, tailwindcss (+17 more)

### Community 46 - "Boosted Model Training"
Cohesion: 0.14
Nodes (21): compareClassificationToConstantBaseline(), BaselineFeatureEncoder, binaryTarget(), BOOSTED_DEVELOPMENT_THRESHOLDS, BOOSTED_TRAINING_CONFIGURATION, CandidateThresholds, fitStump(), minimum() (+13 more)

### Community 47 - "Data Provider Constructors"
Cohesion: 0.16
Nodes (15): OnboardingForm(), completeOnboarding(), saveOnboardingProgress(), AccessControlError, assertCompletedUser(), assertVerifiedUser(), AuthenticatedUser, AuthenticationError (+7 more)

### Community 48 - "Popular Instrument Catalog"
Cohesion: 0.15
Nodes (19): searchInstruments(), escapeRegExp(), searchCanonicalInstruments(), searchStoredInstruments(), orderPopularInstruments(), POPULAR_ALL, POPULAR_BY_ASSET_CLASS, POPULAR_COMMODITIES (+11 more)

### Community 49 - "Analysis Feature Schema"
Cohesion: 0.16
Nodes (19): DailySwingAnalysisDataset, buildEpisodes(), diagnoseDailySwingTrainingData(), Episode, finiteR(), percentile(), repeatSimilarity(), summarizeTargets() (+11 more)

### Community 50 - "Provider Data Access"
Cohesion: 0.13
Nodes (14): AlertProcessingSummary, PreparedAlert, ProcessAlertBatchOptions, invertBars(), invertPositiveDecimal(), invertQuote(), normalizeMarketNumber(), HistoricalQuery (+6 more)

### Community 51 - "Quote Provider Access"
Cohesion: 0.15
Nodes (12): FakeProvider, getFinnhubApiKey(), marketStateForCalendar(), FinnhubQuotePayload, FinnhubQuoteProvider, FinnhubQuoteProviderOptions, createInstrumentMarketDataService(), InstrumentMarketDataService (+4 more)

### Community 52 - "ETF Momentum Research"
Cohesion: 0.15
Nodes (17): ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_ID, ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL, ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_VERSION, writeMomentumDevelopmentReport(), MomentumBenchmarkHistory, MomentumSleeveId, MomentumSourceScan, assertMarketProvenance() (+9 more)

### Community 53 - "UI Component Configuration"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 54 - "Risk Momentum Manifest"
Cohesion: 0.15
Nodes (15): ORIGINAL_DEVELOPMENT_SYMBOLS, RISK_CONTROLLED_MOMENTUM_V2_DEVELOPMENT_ID, RISK_CONTROLLED_MOMENTUM_V2_DEVELOPMENT_VERSION, RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL, Candidate, Exchange, RISK_CONTROLLED_MOMENTUM_V2_COMPUTED_MANIFEST_SHA256, RISK_CONTROLLED_MOMENTUM_V2_EXCLUDED_SYMBOLS (+7 more)

### Community 55 - "Analysis Catalog Scheduling"
Cohesion: 0.17
Nodes (20): AnalysisCatalogInstrument, classifyTransparentAnalysisOperationalFailure(), hasEnabledBarsBinding(), isEligibleBenchmark(), isEligibleTarget(), loadBenchmarkBars(), orchestrateTransparentAnalysis(), reportFailure() (+12 more)

### Community 56 - "Finnhub Equity Mapping"
Cohesion: 0.14
Nodes (16): applyChanges, FinnhubProfile, getFinnhubProfile(), isDuplicateKeyError(), LEGACY_WATCHLIST_FILTER, LegacyWatchlistRow, runMigration(), WatchlistItem (+8 more)

### Community 57 - "Walk Forward Splits"
Cohesion: 0.16
Nodes (20): FROZEN_CONFIRMATION_SYMBOLS, AnalysisDatasetSplitSummary, applyDailySwingBroadSplitPolicy(), BASE_NULLABLE_FEATURES, baseFeatures(), buildDailySwingBroadDataset(), buildWalkForwardFolds(), collectDailySwingBroadRows() (+12 more)

### Community 58 - "Authentication Forms"
Cohesion: 0.16
Nodes (16): handler(), SignInPage(), SignUpPage(), AuthActionResult, getAuthErrorCode(), getAuthErrorMessage(), isValidEmail(), resendVerificationEmail() (+8 more)

### Community 59 - "Notification Settings Filters"
Cohesion: 0.18
Nodes (16): ASSET_FILTERS, SECURITY_TYPE_FILTERS, categoryLabels, frequencyOptions, NotificationsForm(), preferenceKey(), Select(), SelectContent() (+8 more)

### Community 60 - "Actionable Success Research"
Cohesion: 0.16
Nodes (16): DAILY_SWING_ANALYSIS_DATASET_VERSION, buildDailySwingEpisodeTrainingDataset(), finiteR(), selectEpisodeFirstRows(), timestamp(), evaluate(), features(), fixture() (+8 more)

### Community 61 - "Baseline Feature Encoding"
Cohesion: 0.17
Nodes (17): BASELINE_TRAINING_CONFIGURATION, binaryTarget(), CATEGORICAL_FEATURES, compareRegressionToConstantBaseline(), encodeBaselineFeatureRows(), EncodedBaselineRows, evaluateRegressionMetrics(), finiteNumeric() (+9 more)

### Community 62 - "Objective Feature Engineering"
Cohesion: 0.16
Nodes (17): parseMarketBar(), buildDailySwingObjectiveFeatures(), BuildDailySwingObjectiveFeaturesInput, median(), nearestLevel(), parseBars(), percentileRank(), positiveDollarVolumes() (+9 more)

### Community 63 - "Momentum History Policies"
Cohesion: 0.24
Nodes (16): RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS, buildRiskControlledMomentumV3HistoryArtifact(), RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY, RISK_CONTROLLED_MOMENTUM_V3_HISTORY_VERSION, serializeBar(), serializeMarketData(), serializeRiskControlledMomentumV3HistoryArtifact(), bars() (+8 more)

### Community 64 - "Forex Instrument Catalog"
Cohesion: 0.19
Nodes (9): normalizeFinnhubOandaCatalogEntry(), ForexCatalogEntry, pairKey(), reconcileForexCatalogs(), tradingViewBinding(), normalizeMassiveForexCatalogEntry(), parseMassiveForexTicker(), usesUsd() (+1 more)

### Community 65 - "Market Calendar Logic"
Cohesion: 0.16
Nodes (18): CLOSED_SESSION_DATES, dateKey(), EARLY_CLOSE_SESSION_DATES, isSupported(), isWeekend(), LocalDate, LocalDateTime, NEW_YORK_PARTS (+10 more)

### Community 66 - "Application Layouts"
Cohesion: 0.19
Nodes (13): Layout(), OnboardingPage(), Layout(), NotificationSettingsPage(), PreferencesSettingsPage(), VerifyEmailPage(), PreferencesForm(), getRequestSession (+5 more)

### Community 67 - "Dataset Split Types"
Cohesion: 0.19
Nodes (15): AnalysisDatasetFeatureVector, AnalysisDatasetRow, AnalysisDatasetSplit, AnalysisDatasetSplitRatios, dataset(), features(), row(), featureVector() (+7 more)

### Community 68 - "Provider Audit Serialization"
Cohesion: 0.16
Nodes (14): auditProviderSeries(), BacktestProviderAuditReport, buildProviderAuditReport(), dateKey(), median(), percentile(), ProviderSeriesAudit, THRESHOLDS (+6 more)

### Community 69 - "Email Branding Configuration"
Cohesion: 0.20
Nodes (14): getEmailEligibilityByEmail(), EmailBranding, getApplicationBaseUrl(), getEmailBranding(), getMarketingEmailBranding(), MarketingEmailBranding, ENV_KEYS, MarketNewsDeliveryFrequency (+6 more)

### Community 70 - "Email Rendering Tests"
Cohesion: 0.18
Nodes (12): escapeHtml(), createAlertJob(), createFixtures(), emailBranding, EmailFixture, marketingEmailBranding, RenderedEmail, renderAccountVerificationEmail() (+4 more)

### Community 71 - "Financial News Fetching"
Cohesion: 0.20
Nodes (15): articleKey(), buildFinnhubUrl(), fetchArticleList(), FinnhubCompanyProfile, getGeneralNews(), getNews(), isRawNewsArticle(), searchFinnhubStocks() (+7 more)

### Community 72 - "Market Data Intervals"
Cohesion: 0.16
Nodes (15): INTERVALS, MassiveAggregate, MassiveAggregatesPayload, MassiveBarsProvider, MassiveBarsProviderOptions, parseAggregate(), validateRequest(), MarketDataInterval (+7 more)

### Community 73 - "Dashboard Watchlist UI"
Cohesion: 0.15
Nodes (7): DashboardWatchlist(), DashboardWatchlistItem, StockLogo(), StockLogoProps, ScrollArea(), ScrollBar(), formatCurrencyValue()

### Community 74 - "Instrument Catalog Preparation"
Cohesion: 0.19
Nodes (17): applyChanges, bindingKey(), deactivateOnly, ExistingInstrument, matchingExistingInstruments(), normalizeCatalog(), omittedInstrumentFields(), OPTIONAL_INSTRUMENT_FIELDS (+9 more)

### Community 75 - "Combined Training Serialization"
Cohesion: 0.19
Nodes (12): normalizedSha256(), parseMetadata(), readDailySwingCombinedBroadTrainSource(), ROWS_MARKER, sha256File(), BENCHMARK_MARKER, normalizedSha256(), readFrozenBatchBenchmark() (+4 more)

### Community 76 - "Authentication Test Fixtures"
Cohesion: 0.18
Nodes (14): beginGoogleSignIn(), createTestAuth(), get(), JsonObject, post(), responseCookies(), SentVerification, signUp() (+6 more)

### Community 77 - "Preference Migration"
Cohesion: 0.17
Nodes (9): runMigration(), applyChanges, MigrationSummary, runMigration(), DEFAULT_MARKET_NEWS_CATEGORIES, createLegacyCommunicationPreferenceSeed(), LegacyCommunicationPreferenceSeed, LegacyUserProfileEmailPreference (+1 more)

### Community 78 - "Verification Email Limits"
Cohesion: 0.21
Nodes (12): VerificationEmailRateLimitDocument, verificationEmailRateLimitSchema, createRateLimitedVerificationEmailSender(), createVerificationEmailIdentifier(), evaluateVerificationEmailLimit(), MAX_VERIFICATION_EMAILS_PER_WINDOW, secondsUntil(), VERIFICATION_EMAIL_COOLDOWN_SECONDS (+4 more)

### Community 79 - "Daily News Preferences"
Cohesion: 0.21
Nodes (11): updateMarketNewsPreference(), EmailSubscriptionPreferenceSnapshot, MarketNewsCategory, validateMarketNewsPreferenceInput(), getLegacyDailyNewsEmailPreference(), setLegacyDailyNewsEmailPreference(), replaceOrInsertMarketNewsSubscription(), saveMarketNewsPreference() (+3 more)

### Community 80 - "Email Content Safety"
Cohesion: 0.26
Nodes (14): dashboardUrl(), formatPrice(), formatTimestamp(), renderAlertEmail(), controlledTag(), PARAGRAPH_ATTRIBUTES, parseSafeHttpUrl(), requireSafeEmailUrl() (+6 more)

### Community 81 - "Combined Fold Inventory"
Cohesion: 0.24
Nodes (14): DailySwingCombinedBroadEpisodeRow, buildDailySwingCombinedBroadFoldDataset(), episodeRow(), materializeDailySwingCombinedBroadFoldRows(), rowsBefore(), rowsBetween(), timestamp(), DAILY_SWING_COMBINED_BROAD_FINAL_EPISODE_SHA256 (+6 more)

### Community 82 - "Momentum V2 Integrity"
Cohesion: 0.26
Nodes (14): buildRiskControlledMomentumV2HistoryArtifact(), RISK_CONTROLLED_MOMENTUM_V2_HISTORY_POLICY, RISK_CONTROLLED_MOMENTUM_V2_HISTORY_VERSION, serializeBar(), serializeMarketData(), serializeRiskControlledMomentumV2HistoryArtifact(), bars(), fixture() (+6 more)

### Community 83 - "Commodity Catalog"
Cohesion: 0.23
Nodes (13): applyChanges, LegacyMetalInstrument, runMigration(), targetDefinition(), prepareCommodityCatalog(), CommoditySpotCatalogEntry, commoditySpotPricePrecision(), normalizeFinnhubOandaCommodityEntry() (+5 more)

### Community 84 - "Watchlist News UI"
Cohesion: 0.21
Nodes (9): WatchlistSearchParams, WatchlistAlerts(), WatchlistNews(), WatchlistNewsLoading(), WatchlistNewsSection(), WatchlistPageLoading(), WatchlistPagination(), WatchlistSearch() (+1 more)

### Community 85 - "Alert Delivery Jobs"
Cohesion: 0.19
Nodes (6): ALERT_EMAIL_DELIVERY_CRON, ALERT_EMAIL_DELIVERY_EVENT, ALERT_EMAIL_DELIVERY_FUNCTION_CONFIG, ALERT_MONITORING_CRON, ALERT_MONITORING_EVENT, ALERT_MONITORING_FUNCTION_CONFIG

### Community 86 - "Broad Universe Policy"
Cohesion: 0.24
Nodes (10): BROAD_DEVELOPMENT_CATEGORIES, BROAD_DEVELOPMENT_DATA_POLICY, BROAD_DEVELOPMENT_LIQUIDITY_POLICY, BROAD_DEVELOPMENT_SYMBOLS, BROAD_DEVELOPMENT_UNIVERSE_NAME, BROAD_DEVELOPMENT_UNIVERSE_VERSION, BroadDevelopmentCoverageEvaluation, BroadDevelopmentCoverageSnapshot (+2 more)

### Community 87 - "Canonical Instrument Identity"
Cohesion: 0.18
Nodes (13): buildCanonicalKey(), CANONICAL_KEY_MAX_LENGTH, CANONICAL_KEY_PATTERN, CanonicalInstrumentIdentity, CommodityIdentity, contractMonth(), CryptoIdentity, EquityIdentity (+5 more)

### Community 88 - "Market Symbol Fetching"
Cohesion: 0.26
Nodes (11): FinnhubEquitySymbol, listFinnhubCryptoSymbols(), listFinnhubOandaSymbols(), listFinnhubSymbols(), listFinnhubUsEquitySymbols(), fetchTickerPage(), listMassiveCryptoTickers(), listMassiveForexTickers() (+3 more)

### Community 89 - "Research Provider CLI"
Cohesion: 0.26
Nodes (14): dateArgument(), DEFAULT_ETF_SYMBOLS, delay(), ensureWritableDestination(), fetchBars(), fetchBarsWithRateLimitRetry(), instrument(), main() (+6 more)

### Community 90 - "Chart Data Adapters"
Cohesion: 0.13
Nodes (4): CountryList, CountryMap, CountryOption, react-select-country-list

### Community 91 - "Authentication UI Components"
Cohesion: 0.31
Nodes (6): AuthDivider(), AuthFormError(), FooterLink(), GoogleAuthButton(), InputField(), authClient

### Community 92 - "Episode Training Research"
Cohesion: 0.15
Nodes (14): 5,000-Episode Coverage Gate, Daily Swing Broad Episode Training v1, Episode-First Selection, Walk-Forward Model Selection, Daily Swing Episode Model v1 Preregistration, Episode Actionable Logistic Model, Independent Episode Split Policy, Rejected Episode Validation Result (+6 more)

### Community 93 - "Baseline Model Training"
Cohesion: 0.16
Nodes (12): BaselineLinearModel, BaselineTrainingConfiguration, CategoricalFeatureTransform, ClassificationMetrics, DAILY_SWING_BASELINE_MODEL_VERSION, DailySwingBaselineModelReport, NumericFeatureTransform, RegressionMetrics (+4 more)

### Community 94 - "Crypto Instrument Catalog"
Cohesion: 0.26
Nodes (10): CryptoCatalogEntry, currency(), normalizeFinnhubCoinbaseCatalogEntry(), normalizeMassiveCryptoCatalogEntry(), pairKey(), reconcileCoinbaseCryptoCatalogs(), isTradingViewCoinbaseSpotSymbolAvailable(), UNAVAILABLE_COINBASE_SPOT_SYMBOLS (+2 more)

### Community 95 - "News Delivery Leasing"
Cohesion: 0.18
Nodes (10): MarketNewsDeliveryLogDocument, marketNewsDeliveryLogSchema, MarketNewsDeliveryStatus, ActiveMarketNewsDeliveryLease, claimMarketNewsDelivery(), completeMarketNewsDelivery(), failMarketNewsDelivery(), isDuplicateKeyError() (+2 more)

### Community 96 - "Alert Evaluation Logic"
Cohesion: 0.26
Nodes (10): AlertEvaluationInput, AlertEvaluationResult, comparePriceValues(), DEFAULT_MAX_QUOTE_AGE_MS, evaluatePriceAlert(), ParsedDecimal, parsePositiveDecimal(), evaluate() (+2 more)

### Community 97 - "Momentum V3 Closure"
Cohesion: 0.32
Nodes (8): assertRiskControlledMomentumV3IsOpen(), RISK_CONTROLLED_MOMENTUM_V3_CLOSURE, RISK_CONTROLLED_MOMENTUM_V3_CLOSURE_STATUS, RISK_CONTROLLED_MOMENTUM_V3_CLOSURE_VERSION, RISK_CONTROLLED_MOMENTUM_V3_DEVELOPMENT_ID, RISK_CONTROLLED_MOMENTUM_V3_DEVELOPMENT_VERSION, RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL, main()

### Community 98 - "Momentum Benchmark Types"
Cohesion: 0.33
Nodes (11): RiskControlledMomentumBenchmarkHistory, RiskControlledMomentumSleeveId, bar(), JsonObject, marketBars(), object(), parseRiskControlledMomentumV3HistoryArtifact(), positive() (+3 more)

### Community 99 - "Email Template Registry"
Cohesion: 0.44
Nodes (7): INACTIVE_USER_REMINDER_EMAIL_TEMPLATE, NEWS_SUMMARY_EMAIL_TEMPLATE, STOCK_ALERT_LOWER_EMAIL_TEMPLATE, STOCK_ALERT_UPPER_EMAIL_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE, VOLUME_ALERT_EMAIL_TEMPLATE, WELCOME_EMAIL_TEMPLATE

### Community 100 - "Analysis Smoke Testing"
Cohesion: 0.36
Nodes (8): AnalysisPanelResponse, buildTransparentAnalysisSmokeFailure(), buildTransparentAnalysisSmokeSummary(), TRANSPARENT_ANALYSIS_SMOKE_VERSION, TransparentAnalysisSmokeFailure, TransparentAnalysisSmokeSummary, validateTransparentAnalysisSmokeArguments(), main()

### Community 101 - "TradingView Equity Sync"
Cohesion: 0.29
Nodes (6): applyChanges, EquityInstrument, run(), listResolvableTradingViewEquities(), normalizeTradingViewSymbol(), TradingViewScannerResponse

### Community 102 - "Dataset Export Scripts"
Cohesion: 0.36
Nodes (5): writeDailySwingSetupScanReport(), writeLargeJsonObjectWithArray(), writeText(), main(), main()

### Community 103 - "Symmetric Regime Script"
Cohesion: 0.31
Nodes (7): scanDailySwingSetupBatch(), parseTrainMarketBars(), readFrozenSymmetricTrainHistory(), validDate(), main(), readRejectedDevelopment(), scanSource()

### Community 104 - "Lockfile Dependencies"
Cohesion: 0.20
Nodes (9): name, overrides, brace-expansion@1.1.16, brace-expansion@2.1.2, brace-expansion@5.0.7, postcss, sharp, private (+1 more)

### Community 105 - "Full Dashboard Design"
Cohesion: 0.24
Nodes (10): Asset Class Tabs, Today's Financial News Feed, Index Snapshot Cards, Market Monitoring Workspace, Market Navigation, Market Summary, Market Time-Series Chart, Signalist Financial Dashboard (+2 more)

### Community 106 - "Combined Model Diagnostics"
Cohesion: 0.25
Nodes (9): Daily Swing Combined Model Development v1, L2 Logistic Candidate Family, Rejected Combined Logistic Development, Daily Swing Combined Strategy and Target Audit v1, Direction-by-Setup Nomination Boundary, Actionable-Success Target Compression Audit, Daily Swing Combined Train Diagnostics v1, Expected-Utility Decision Boundary (+1 more)

### Community 107 - "ETF Risk Control Research"
Cohesion: 0.31
Nodes (9): ETF Cross-Sectional Momentum Development v1 Result, Rejected Cross-Sectional Momentum Result, Capped 10% Volatility Overlay, ETF Risk-Controlled Momentum v2 Preregistration, Nineteen-Gate Decision Rule, ETF Risk-Controlled Momentum v2 Source and Protocol Design, Faber, A Quantitative Approach to Tactical Asset Allocation, Marmi et al., A Quantitative Approach to Faber's Tactical Asset Allocation (+1 more)

### Community 108 - "Signal Window Features"
Cohesion: 0.28
Nodes (8): buildDailySwingCombinedBroadDataset(), BASE_WINDOWS, build(), EXPANSION_WINDOWS, instrumentReport(), OBJECTIVE_FEATURES, SIGNAL_FEATURES, sourceReport()

### Community 109 - "Dashboard Preview Design"
Cohesion: 0.31
Nodes (9): Signalist Dashboard Preview, Today's Financial News, Market Navigation, Market Performance Chart, Market Summary, Stock Quote Cards, Today's Top Stocks, User Profile (+1 more)

### Community 110 - "Legal Document UI"
Cohesion: 0.29
Nodes (5): metadata, sections, LegalDocument(), LegalDocumentProps, LegalSection

### Community 111 - "Regime Strategy Research"
Cohesion: 0.25
Nodes (8): Completed-Bar SPY Risk Filter, Daily Swing Combined Strategy Redesign v1, Rejected Benchmark Risk Filter, Daily Swing Symmetric Regime Development v1, Rejected Symmetric Regime Result, Short Borrow Cost Stress, Symmetric Long-Short Candidate, Completed U.S. Equity Session Resolver

### Community 112 - "Strategy Research Reset"
Cohesion: 0.32
Nodes (8): Closed Daily Setup Strategy Family, Daily Swing Strategy Research Reset v1, ETF Cross-Sectional Momentum Research Question, Huang et al. 2020, Jegadeesh and Titman 1993, Kim, Tse, and Wald 2016, Marmi et al. 2012, Moskowitz, Ooi, and Pedersen 2012

### Community 113 - "Combined Model Protocol"
Cohesion: 0.36
Nodes (6): DAILY_SWING_BROAD_WALK_FORWARD_FOLDS, DAILY_SWING_COMBINED_BROAD_EPISODE_SHA256, DAILY_SWING_COMBINED_BROAD_MODEL_DEVELOPMENT_ID, DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL, DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL_VERSION, LOGISTIC_PENALTIES

### Community 114 - "BullWise Brand Assets"
Cohesion: 0.39
Nodes (8): Ascending Bar Chart, Bull and Rising Chart Emblem, Bull Wise Wordmark, Bullish Market Growth, BullWise Logo, Financial Analysis Brand Identity, Green Bull Silhouette, Upward Growth Arrow

### Community 115 - "Root Application Layout"
Cohesion: 0.33
Nodes (4): geistMono, geistSans, metadata, Toaster()

### Community 116 - "Product And Communication Docs"
Cohesion: 0.33
Nodes (7): Bull Wise Communication Policy, Consent and Centralized Eligibility, Delivery Suppression Order, Unsubscribe Token Lifecycle, Authentication Market Data and Workflow Stack, Bull Wise, Email Suppression and Key Rotation

### Community 117 - "Data Feasibility Research"
Cohesion: 0.38
Nodes (7): Alpaca Pre-2016 Equity Data Limit, ETF Risk-Controlled Momentum v2 Source-Feasibility Result, Source Infeasible Without Strategy Outcomes, ETF Risk-Controlled Momentum v3 Preregistration, Incomplete Flash Crash Valuation Data, Source Infeasible Without Complete Valuation Data, Tiingo EOD Source Substitution

### Community 118 - "Transparent Analysis Product"
Cohesion: 0.33
Nodes (7): AI Explanation Boundary, Allow-Listed Product Adapter, Deterministic Daily Market Context, Transparent Analysis Panel v1 Contract, First Operational Review Gate, Privacy-Preserving Operational Telemetry, Transparent Analysis Telemetry v1

### Community 119 - "Watchlist Mutations"
Cohesion: 0.73
Nodes (4): WatchlistButton(), addToWatchlist(), removeFromWatchlist(), revalidateWatchlistViews()

### Community 120 - "Future Strategy Research"
Cohesion: 0.33
Nodes (6): One-Shot Validation, Clean Non-Overlapping Development Source, Future Strategy Research Resumption Guide, Liquid ETF Daily Mean Reversion, Multi-Asset Time-Series Trend, Research Restart Sequence

### Community 121 - "Portfolio Research Designs"
Cohesion: 0.33
Nodes (6): Daily Swing v3 Portfolio Preregistration, Signal-Time Ranked Portfolio, ETF Cross-Sectional Momentum Development v1, Four-Sleeve 12-Minus-1 Momentum, Static Four-Sleeve Benchmark, Thirteen-Gate Decision Rule

### Community 122 - "Market Growth Icon"
Cohesion: 0.70
Nodes (5): Bull Silhouette, Bullish Market Growth, Bullwise Market Growth Icon, Rising Bar Chart, Upward Trend Arrow

### Community 124 - "Email Verification UI"
Cohesion: 0.70
Nodes (3): maskEmail(), verificationErrorMessage(), VerifyEmailCard()

### Community 125 - "Email Rendering Contract"
Cohesion: 0.67
Nodes (4): Email Client Rendering Checklist, Email Rendering Compatibility Contract, Real-Inbox Rendering Smoke Test, Price Alert Email Template

### Community 129 - "Email Logo Asset"
Cohesion: 1.00
Nodes (3): Bull and Rising Market Chart Motif, Bull Wise Email Logo, Bull Wise Wordmark

## Knowledge Gaps
- **635 isolated node(s):** `metadata`, `sections`, `MARKET_SUMMARY_WIDGET_CONFIG`, `WatchlistSearchParams`, `{ GET, POST, PUT }` (+630 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `connectToDatabase()` connect `Watchlist Data Flow` to `Application Layouts`, `Authentication Jobs And Tools`, `Alert Domain Infrastructure`, `Transparent Analysis API`, `Email Branding Configuration`, `Email Webhook Validation`, `Communication Preferences`, `Email Delivery Repositories`, `Authentication Test Fixtures`, `Preference Migration`, `Verification Email Limits`, `Data Provider Constructors`, `Popular Instrument Catalog`, `Daily News Preferences`, `Instrument Page Data`, `Analysis Telemetry Recording`, `News Delivery Leasing`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `AssetClass` connect `Equity Asset Catalog` to `Alert UI Models`, `Alert Domain Infrastructure`, `Daily Swing Strategy State`, `Instrument Catalog Preparation`, `Market Bar Providers`, `Popular Instrument Catalog`, `Provider Data Access`, `Notification Settings Filters`, `Watchlist Data Flow`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `EquitySecurityType` connect `Equity Asset Catalog` to `Alert UI Models`, `Analysis Domain Types`, `Market Data Intervals`, `Daily Swing Strategy State`, `Equity Catalog Filtering`, `Popular Instrument Catalog`, `Analysis Catalog Scheduling`, `Notification Settings Filters`, `Watchlist Data Flow`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `metadata`, `sections`, `MARKET_SUMMARY_WIDGET_CONFIG` to the rest of the system?**
  _635 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Analysis Research Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.031746031746031744 - nodes in this community are weakly interconnected._
- **Should `Avatar UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.07103825136612021 - nodes in this community are weakly interconnected._
- **Should `Analysis Domain Types` be split into smaller, more focused modules?**
  _Cohesion score 0.07231638418079096 - nodes in this community are weakly interconnected._