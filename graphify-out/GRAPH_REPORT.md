# Graph Report - bullwise  (2026-09-15)

## Corpus Check
- 608 files · ~315,997 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3796 nodes · 9248 edges · 161 communities (154 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 114 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `78094919`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scripts
- transparent-analysis-ai-question-routing.ts
- technical-analysis.types.ts
- dependencies
- functions.ts
- market-data/finnhub.ts
- transparent-analysis-ai-selection-evaluation-v1-5.ts
- backtest-daily-swing-batch.ts
- symmetric-regime-history-source.ts
- fetch-backtest-batch.ts
- connectToDatabase
- email-delivery.ts
- Graphify Pipeline
- combined-broad-model-runner.ts
- transparent-analysis-ai-topic-routing-v3-evaluation.ts
- setup-scan.ts
- analysis-dataset.ts
- risk-controlled-momentum-v3-runner.ts
- combined-broad-train-diagnostic-runner.ts
- episode-dataset.test.ts
- fetch-backtest-history.ts
- transparent-analysis-ai-topic-routing-v3-durable-run.ts
- combined-broad-dataset.ts
- constants.ts
- backtest.ts
- combined-broad-strategy-target-audit-runner.ts
- processor.ts
- symmetric-regime-strategy-runner.ts
- onboarding/service.ts
- NotificationsForm.tsx
- DailyMarketAnalysisCard.tsx
- transparent-analysis-ai-topic-routing-v2-evaluation.ts
- global.d.ts
- compilerOptions
- transparent-analysis-ai-contract.ts
- combined-broad-strategy-redesign-runner.ts
- transparent-analysis-panel.types.ts
- email-suppression.ts
- unsubscribe-token.ts
- batch-diagnostics.ts
- cn
- email-rendering.ts
- broad-dataset.ts
- buildTransparentAnalysisAiInput
- equity-catalog.ts
- devDependencies
- transparent-analysis-ai-question-routing-evaluation.ts
- types/notifications.ts
- communication-policy.ts
- transparent-analysis-ai-provider.ts
- cross-sectional-momentum-runner.ts
- Transparent analysis AI fact-selection v1.5 preregistration
- baseline-model.ts
- components.json
- require-user.ts
- transparent-analysis-orchestrator.ts
- inngest/notifications.ts
- transparent-analysis-daily-observation.ts
- NotificationBell.tsx
- MarketBars
- transparent-analysis-ai-question-routing-prompt.test.ts
- RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL
- broad-episode-dataset.ts
- content-safety.ts
- canonical-key.ts
- us-equity-session.ts
- cross-sectional-momentum-source.ts
- mongoose.ts
- Transparent analysis AI latency observation v1 preregistration
- sync-instrument-catalog.ts
- Transparent analysis AI provider pacing v1 preregistration
- user-alerts.ts
- boosted-model.ts
- transparent-analysis-ai-topic-routing-v2.ts
- technical-analysis.ts
- transparent-analysis-ai-selection-acceptance-v1-fixtures.ts
- transparent-analysis-ai-topic-routing-v3-command.ts
- Transparent analysis AI explanation v1.3 preregistration
- MarketBar
- migrate-communication-preferences.ts
- transparent-analysis-ai-topic-routing-v3-fixtures.ts
- Q: Can you make the terms and privacy to be separate pages
- transparent-analysis-telemetry.ts
- transparent-analysis-ai-question-routing-fixtures.ts
- backtest.types.ts
- inngest-email-delivery-config.test.ts
- requireCompletedUser
- transparent-analysis-ai-evaluation.ts
- Q: Why does connectToDatabase() bridge 17 distinct communities?
- button.tsx
- CountryList
- transparent-analysis-ai-fixtures.ts
- Daily Swing Episode Model v1 Preregistration
- portfolio-backtest.ts
- objective-features.ts
- market-news-delivery.test.ts
- Transparent analysis AI explanation v1 preregistration
- UserDropdown.tsx
- utils.ts
- email-template.test.ts
- InAppNotificationsForm.tsx
- commodity-catalog.ts
- types.ts
- store.test.ts
- package.json
- Signalist Financial Dashboard
- Daily Swing Combined Train Diagnostics v1
- ETF Risk-Controlled Momentum v2 Source and Protocol Design
- setup-scan.types.ts
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
- transparent-analysis-ai-production.ts
- proxy.ts
- Bull and Rising Market Chart Motif
- store.ts
- Confirmed Breakout Filter
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- Star Icon
- Transparent analysis AI v1.6 acceptance v1 preregistration
- Transparent analysis AI explanation v1.4 preregistration
- analysis/run-tests.ts
- Transparent analysis AI explanation v1.2 preregistration
- Transparent analysis AI provider reliability v1 preregistration
- Transparent analysis AI topic-routing experiment v3
- inngest-monitoring-config.test.ts
- Transparent analysis grounded AI question routing v1
- transparent-analysis-service.ts
- Transparent analysis AI deterministic-overview ordering v1.6 preregistration
- types/instruments.ts
- watchlist/page.tsx
- OnboardingForm.tsx
- auth.actions.ts
- AlertDialogs.tsx
- email-client-compatibility.test.ts
- risk-controlled-momentum-v3-source.ts
- communication-eligibility.ts
- google-transparent-analysis-ai-provider.ts
- market-news-preference.ts
- In-app notifications
- requireUser
- settings/notifications/page.tsx

## God Nodes (most connected - your core abstractions)
1. `cn()` - 104 edges
2. `scripts` - 81 edges
3. `connectToDatabase()` - 65 edges
4. `MarketBars` - 40 edges
5. `buildTransparentAnalysisAiInput()` - 39 edges
6. `requireCompletedUser()` - 29 edges
7. `AnalysisPanelResponse` - 28 edges
8. `Button()` - 25 edges
9. `DailySwingAnalysisDataset` - 22 edges
10. `MarketBar` - 22 edges

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

## Communities (161 total, 7 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.02
Nodes (81): scripts, accept:transparent-analysis-ai-selection-v1-6, audit:analysis-broad-combined-strategy-target, audit:backtest-providers, backtest:daily-swing, backtest:daily-swing-batch, backtest:daily-swing-portfolio, backtest:daily-swing-v2-holdout (+73 more)

### Community 1 - "transparent-analysis-ai-question-routing.ts"
Cohesion: 0.11
Nodes (27): TransparentAnalysisAiFactorName, TransparentAnalysisAiLimitation, allFacts(), buildTransparentAnalysisAiQuestionRoutingInput(), hasExactKeys(), isRecord(), isUniqueStringArray(), LIMITATION_TEXT (+19 more)

### Community 2 - "technical-analysis.types.ts"
Cohesion: 0.09
Nodes (28): applyDailySwingV2Rules(), DAILY_SWING_V2_RULES, plan(), readyResult(), plan(), result(), AnalysisDataQuality, AnalysisSignal (+20 more)

### Community 3 - "dependencies"
Cohesion: 0.04
Nodes (47): @base-ui/react, better-auth, class-variance-authority, clsx, cmdk, country-flag-icons, inngest, lucide-react (+39 more)

### Community 4 - "functions.ts"
Cohesion: 0.10
Nodes (34): { GET, POST, PUT }, deliverAlertEmailOutbox(), BetterAuthUser, getVerifiedMarketNewsRecipient(), listMarketNewsRecipientIdsPage(), MarketNewsRecipientPage, PreferenceUserId, ActiveMarketNewsDeliveryLease (+26 more)

### Community 5 - "market-data/finnhub.ts"
Cohesion: 0.09
Nodes (32): articleKey(), buildFinnhubUrl(), getFinnhubApiKey(), fetchArticleList(), FinnhubCompanyProfile, getGeneralNews(), getNews(), isRawNewsArticle() (+24 more)

### Community 6 - "transparent-analysis-ai-selection-evaluation-v1-5.ts"
Cohesion: 0.13
Nodes (29): TransparentAnalysisAiExplanation, exactFactText(), factIdsSchema, hasExactKeys(), isRecord(), isUniqueStringArray(), renderedSelectionPreservesExactFacts(), renderTransparentAnalysisAiSelection() (+21 more)

### Community 7 - "backtest-daily-swing-batch.ts"
Cohesion: 0.10
Nodes (28): DailySwingBatchDiagnosticReport, analyzeDailySwingV2(), TechnicalAnalysisInstrument, DAILY_SWING_V2_CONFIRMATION_ID, DAILY_SWING_V2_CONFIRMATION_THRESHOLDS, DailySwingV2Confirmation, evaluateDailySwingV2Confirmation(), maximum() (+20 more)

### Community 8 - "symmetric-regime-history-source.ts"
Cohesion: 0.29
Nodes (7): DEFAULT_BACKTEST_CONFIGURATION, parseTrainMarketBars(), readFrozenSymmetricTrainHistory(), SerializedBatchHistory, SerializedMarketBar, SerializedMarketBars, validDate()

### Community 9 - "fetch-backtest-batch.ts"
Cohesion: 0.07
Nodes (38): normalizeMarketNumber(), AlpacaBar, AlpacaBarsPayload, AlpacaBarsProvider, AlpacaBarsProviderOptions, parseBar(), validateRequest(), INTERVALS (+30 more)

### Community 10 - "connectToDatabase"
Cohesion: 0.10
Nodes (36): WatchlistContent(), WatchlistButton(), connectToDatabase(), addToWatchlist(), removeFromWatchlist(), revalidateWatchlistViews(), mapWithConcurrency(), addToCurrentUserWatchlist() (+28 more)

### Community 11 - "email-delivery.ts"
Cohesion: 0.09
Nodes (18): ALERT_EMAIL_BATCH_SIZE, ALERT_EMAIL_LEASE_MS, ALERT_EMAIL_MAX_ATTEMPTS, AlertEmailDeliveryStore, AlertEmailDeliverySummary, AlertEmailJob, AlertEmailRecipient, AlertEmailRecipientDirectory (+10 more)

### Community 12 - "Graphify Pipeline"
Cohesion: 0.06
Nodes (39): Bullwise Analysis Research, Holdout Safeguards, Graphify Pipeline, Honest Graph Audit Trail, Graphify Add and Watch, Graphify Extra Exports, Edge Confidence Rubric, Semantic Extraction Specification (+31 more)

### Community 13 - "combined-broad-model-runner.ts"
Cohesion: 0.10
Nodes (34): auc(), evaluateClassificationMetrics(), DAILY_SWING_BROAD_WALK_FORWARD_FOLDS, DAILY_SWING_COMBINED_BROAD_FINAL_EPISODE_SHA256, DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_SHA256, DAILY_SWING_COMBINED_BROAD_FOLD_INVENTORY, DailySwingCombinedBroadFoldDataset, DailySwingCombinedBroadFoldPartitionId (+26 more)

### Community 14 - "transparent-analysis-ai-topic-routing-v3-evaluation.ts"
Cohesion: 0.21
Nodes (17): generateTransparentAnalysisAiTopicRoutingV2Answer(), assertFrozenState(), boundaryMetrics(), evaluateTransparentAnalysisAiTopicRoutingV3(), EvaluationRow, evaluationRows(), exactExpansion(), exactSelectionSatisfied() (+9 more)

### Community 15 - "setup-scan.ts"
Cohesion: 0.08
Nodes (34): buildBacktestSignalFeatures(), MINIMUM_ANALYSIS_BARS, percentageDistance(), requireFinite(), resolveBacktestConfiguration(), BROAD_DEVELOPMENT_CATEGORIES, BROAD_DEVELOPMENT_DATA_POLICY, BROAD_DEVELOPMENT_LIQUIDITY_POLICY (+26 more)

### Community 16 - "analysis-dataset.ts"
Cohesion: 0.13
Nodes (22): buildDailySwingAnalysisDataset(), BuildDatasetInput, CandidateRow, collectRows(), DatasetOutcomeReport, DEFAULT_ANALYSIS_DATASET_SPLIT_RATIOS, features(), normalizedSymbols() (+14 more)

### Community 17 - "risk-controlled-momentum-v3-runner.ts"
Cohesion: 0.14
Nodes (34): addTurnover(), candidateAt(), Costs, EquityPoint, evaluateGates(), executeTargets(), formationBars(), median() (+26 more)

### Community 18 - "combined-broad-train-diagnostic-runner.ts"
Cohesion: 0.09
Nodes (42): DailySwingCombinedBroadEpisodeRow, DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_VERSION, clip(), COMBINED_BROAD_CATEGORICAL_FEATURES, COMBINED_BROAD_NUMERIC_FEATURES, CombinedBroadFeatureEncoder, encodeCombinedBroadFeatureRows(), finite() (+34 more)

### Community 19 - "episode-dataset.test.ts"
Cohesion: 0.15
Nodes (21): features(), row(), sealedRow(), SHA, sourceDataset(), DAILY_SWING_EPISODE_DATASET_VERSION, DailySwingEpisodeTrainingDataset, EpisodeTrainingRow (+13 more)

### Community 20 - "fetch-backtest-history.ts"
Cohesion: 0.46
Nodes (7): dateArgument(), ensureWritableDestination(), fetchBars(), main(), option(), requireSymbol(), serializeBars()

### Community 21 - "transparent-analysis-ai-topic-routing-v3-durable-run.ts"
Cohesion: 0.09
Nodes (45): appendDurableLine(), assertConfig(), assertFiniteNonnegative(), assertManifest(), assertOperationalEvent(), assertOwnerOnlyDirectory(), assertOwnerOnlyFile(), assertResultShard() (+37 more)

### Community 22 - "combined-broad-dataset.ts"
Cohesion: 0.09
Nodes (40): DAILY_SWING_BROAD_SPLIT_BOUNDARIES, DAILY_SWING_BROAD_SPLIT_POLICY_VERSION, DailySwingBroadFeatureVector, selectEpisodeFirstBroadRows(), FrozenSource, requireSha256(), DAILY_SWING_BROAD_EXPANSION_SETUP_SCAN_SHA256, DAILY_SWING_COMBINED_BROAD_DATASET_VERSION (+32 more)

### Community 23 - "constants.ts"
Cohesion: 0.09
Nodes (24): Home(), MARKET_SUMMARY_WIDGET_CONFIG, StockAlertButton(), DASHBOARD_TOP_STORIES_WIDGET_CONFIG, DashboardNews(), InstrumentDashboard(), InstrumentDashboardProps, TradingViewWidget() (+16 more)

### Community 24 - "backtest.ts"
Cohesion: 0.09
Nodes (33): applySlippage(), buyAndHoldReturn(), calculateBaselines(), entryBasePrice(), groupMetrics(), isStopTouched(), isTargetTouched(), marketBarsThrough() (+25 more)

### Community 25 - "combined-broad-strategy-target-audit-runner.ts"
Cohesion: 0.12
Nodes (25): DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_ID, DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL, DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_VERSION, AuditRow, average(), buildCandidates(), buildCohorts(), COHORT_DEFINITIONS (+17 more)

### Community 26 - "processor.ts"
Cohesion: 0.07
Nodes (37): AlertEventItem, alertEventSchema, EmailDeliveryStatus, AlertItem, alertSchema, AlertEvaluationInput, AlertEvaluationReason, AlertEvaluationResult (+29 more)

### Community 27 - "symmetric-regime-strategy-runner.ts"
Cohesion: 0.11
Nodes (30): DailySwingBroadCandidateRow, scanDailySwingSetupBatch(), DailySwingInstrumentSetupScan, DailySwingSetupResearchPolicy, DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_ID, DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_PROTOCOL, DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_VERSION, assertFrozenConfiguration() (+22 more)

### Community 28 - "onboarding/service.ts"
Cohesion: 0.12
Nodes (22): allowedInvestmentExperiences, allowedInvestmentGoals, allowedPreferredIndustries, allowedPreferredMarkets, allowedRiskTolerances, CompleteOnboardingResult, createOnboardingDefaults(), getRecord() (+14 more)

### Community 29 - "NotificationsForm.tsx"
Cohesion: 0.29
Nodes (8): categoryLabels, frequencyOptions, NotificationsForm(), preferenceKey(), updateMarketNewsPreference(), MarketNewsPreferenceInput, MarketNewsPreferenceView, validateMarketNewsPreferenceInput()

### Community 30 - "DailyMarketAnalysisCard.tsx"
Cohesion: 0.10
Nodes (28): aiAnalysisEndpointForInstrument(), AiAnalysisOverview(), AiAnalysisState, aiAnalysisUnavailableMessage(), analysisEndpointForInstrument(), AnalysisLoadState, AvailableAnalysis(), DailyMarketAnalysisCard() (+20 more)

### Community 31 - "transparent-analysis-ai-topic-routing-v2-evaluation.ts"
Cohesion: 0.09
Nodes (33): boundaryMetrics(), evaluateTransparentAnalysisAiTopicRoutingV2(), exactExpansion(), exactSelectionSatisfied(), expectedSelectionSatisfied(), expectedTransparentAnalysisAiTopicRoutingV2Output(), GenerationResult, InvalidFixture (+25 more)

### Community 32 - "global.d.ts"
Cohesion: 0.07
Nodes (29): Alert, AlertData, AlertModalProps, AlertsListProps, CountrySelectProps, FinancialsData, FinnhubSearchResponse, FinnhubSearchResult (+21 more)

### Community 33 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 34 - "transparent-analysis-ai-contract.ts"
Cohesion: 0.23
Nodes (11): exactKeys(), FACTOR_STATES, isRecord(), isStringArray(), numericTokens(), TRANSPARENT_ANALYSIS_AI_EVALUATION_GATES, TransparentAnalysisAiCitedText, TransparentAnalysisAiValidationIssueCode (+3 more)

### Community 35 - "combined-broad-strategy-redesign-runner.ts"
Cohesion: 0.10
Nodes (29): DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_ID, DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL, DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_VERSION, average(), BenchmarkInput, benchmarkRiskAt(), cohortMetrics(), FoldId (+21 more)

### Community 36 - "transparent-analysis-panel.types.ts"
Cohesion: 0.13
Nodes (25): analysisPanelContext(), APPROVED_WARNING_MAP, approvedWarnings(), BuildAnalysisPanelInput, buildAnalysisPanelResponse(), buildUnavailableAnalysisPanelResponse(), ENGINE_UNAVAILABLE_REASON_MAP, isPartial() (+17 more)

### Community 37 - "email-suppression.ts"
Cohesion: 0.18
Nodes (20): POST(), BetterAuthUser, capturePermanentSmtpFailure(), EmailSuppressionRecordResult, findUserIdByEmail(), lowerPriorityReasons, recordEmailSuppressionByEmail(), createEmailEventWebhookSignature() (+12 more)

### Community 38 - "unsubscribe-token.ts"
Cohesion: 0.16
Nodes (20): POST(), unsubscribeFromDailyNews(), UnsubscribePage(), unsubscribeFromMarketNews(), addUtcMonths(), assertSigningSecret(), createDailyNewsUnsubscribeToken(), createDailyNewsUnsubscribeUrls() (+12 more)

### Community 39 - "batch-diagnostics.ts"
Cohesion: 0.11
Nodes (28): DailySwingBacktestDependencies, BacktestTradeExitReason, aggregateSummary(), average(), DailySwingBatchBacktestInput, instrumentSummary(), median(), runDailySwingBatchBacktest() (+20 more)

### Community 40 - "cn"
Cohesion: 0.09
Nodes (37): CountrySelect(), CountrySelectProps, Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage() (+29 more)

### Community 41 - "email-rendering.ts"
Cohesion: 0.17
Nodes (20): getEmailEligibilityByEmail(), requireSafeEmailUrl(), EmailBranding, getApplicationBaseUrl(), getEmailBranding(), getMarketingEmailBranding(), MarketingEmailBranding, ENV_KEYS (+12 more)

### Community 42 - "broad-dataset.ts"
Cohesion: 0.19
Nodes (18): applyDailySwingBroadSplitPolicy(), BASE_NULLABLE_FEATURES, baseFeatures(), buildDailySwingBroadDataset(), buildWalkForwardFolds(), collectDailySwingBroadRows(), labels(), OBJECTIVE_FEATURE_KEYS (+10 more)

### Community 43 - "buildTransparentAnalysisAiInput"
Cohesion: 0.09
Nodes (48): request(), buildTransparentAnalysisAiInput(), facts(), limitations(), TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES, TransparentAnalysisAiFact, boundaryMetrics(), boundaryResult() (+40 more)

### Community 44 - "equity-catalog.ts"
Cohesion: 0.14
Nodes (24): formatInstrumentType(), WatchlistInstrumentDetails(), applyChanges, EquityInstrument, listingKey(), run(), typeCounts(), entryKey() (+16 more)

### Community 45 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, @next/env, devDependencies, eslint, eslint-config-next, @next/env, tailwindcss (+17 more)

### Community 46 - "transparent-analysis-ai-question-routing-evaluation.ts"
Cohesion: 0.14
Nodes (22): boundaryMetrics(), containsAll(), containsOnly(), evaluateTransparentAnalysisAiQuestionRoutingV1(), exactRenderedText(), expectedSelectionSatisfied(), expectedTransparentAnalysisAiQuestionRoutingOutput(), GenerationFixture (+14 more)

### Community 47 - "types/notifications.ts"
Cohesion: 0.14
Nodes (13): main(), PreferenceRecord, schema, NotificationRecord, schema, deliverInboxNewsWorkflow(), InboxNewsRequest, NewsDeliveryDependencies (+5 more)

### Community 48 - "communication-policy.ts"
Cohesion: 0.13
Nodes (26): CommunicationPreferenceDocument, communicationPreferenceSchema, emailSubscriptionSchema, emailSuppressionSchema, subscriptionsValidationError(), validSubscriptions(), COMMUNICATION_PREFERENCE_SCHEMA_VERSION, EMAIL_CONSENT_SOURCES (+18 more)

### Community 49 - "transparent-analysis-ai-provider.ts"
Cohesion: 0.16
Nodes (17): TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES, latencySummary(), observeTransparentAnalysisAiLatency(), percentile(), TRANSPARENT_ANALYSIS_AI_LATENCY_OBSERVATION_VERSION, TransparentAnalysisAiLatencyGenerator, citedTextSchema, TRANSPARENT_ANALYSIS_AI_OUTPUT_SCHEMA (+9 more)

### Community 50 - "cross-sectional-momentum-runner.ts"
Cohesion: 0.16
Nodes (28): Costs, EquityPoint, evaluateMomentumDevelopmentGates(), executeTargets(), median(), metricSummary(), MomentumBar, momentumCandidateAt() (+20 more)

### Community 51 - "Transparent analysis AI fact-selection v1.5 preregistration"
Cohesion: 0.25
Nodes (7): Decision rule, Development result, Frozen architecture, Frozen gates, Frozen protocol, Purpose, Transparent analysis AI fact-selection v1.5 preregistration

### Community 52 - "baseline-model.ts"
Cohesion: 0.08
Nodes (44): DAILY_SWING_ANALYSIS_DATASET_VERSION, BASELINE_TRAINING_CONFIGURATION, binaryTarget(), CATEGORICAL_FEATURES, compareClassificationToConstantBaseline(), compareRegressionToConstantBaseline(), encodeBaselineFeatureRows(), EncodedBaselineRows (+36 more)

### Community 53 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 54 - "require-user.ts"
Cohesion: 0.24
Nodes (8): AccessControlError, assertCompletedUser(), assertVerifiedUser(), AuthenticatedUser, AuthenticationError, EmailVerificationRequiredError, OnboardingRequiredError, verifiedUser

### Community 55 - "transparent-analysis-orchestrator.ts"
Cohesion: 0.12
Nodes (26): AnalysisCatalogInstrument, classifyTransparentAnalysisOperationalFailure(), hasEnabledBarsBinding(), isEligibleBenchmark(), isEligibleTarget(), loadBenchmarkBars(), reportFailure(), benchmarkInstrument() (+18 more)

### Community 56 - "inngest/notifications.ts"
Cohesion: 0.18
Nodes (23): getMarketNewsPeriodKey(), deliverInboxNewsDigest, deliverInboxPriceAlerts, newsSchedule(), queueInboxNews, deliverAlertNotifications(), AnnouncementInput, assertSamePublication() (+15 more)

### Community 57 - "transparent-analysis-daily-observation.ts"
Cohesion: 0.12
Nodes (28): DAILY_CANDIDATES, increment(), incrementStringArray(), isRecordedDate(), isValidInstrumentRequest(), StoredTelemetryLine, summarizeTransparentAnalysisObservation(), TRANSPARENT_ANALYSIS_OBSERVATION_MINIMUM_DAYS (+20 more)

### Community 58 - "NotificationBell.tsx"
Cohesion: 0.22
Nodes (9): NOTIFICATIONS_CHANGED, Badge(), badgeVariants, Popover(), PopoverContent(), PopoverDescription(), PopoverHeader(), PopoverTitle() (+1 more)

### Community 59 - "MarketBars"
Cohesion: 0.09
Nodes (46): RISK_CONTROLLED_MOMENTUM_V2_DEVELOPMENT_ID, RISK_CONTROLLED_MOMENTUM_V2_DEVELOPMENT_VERSION, RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL, buildRiskControlledMomentumV2HistoryArtifact(), RISK_CONTROLLED_MOMENTUM_V2_HISTORY_POLICY, RISK_CONTROLLED_MOMENTUM_V2_HISTORY_VERSION, serializeBar(), serializeMarketData() (+38 more)

### Community 60 - "transparent-analysis-ai-question-routing-prompt.test.ts"
Cohesion: 0.25
Nodes (11): GOOGLE_TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_CANDIDATE, GoogleTransparentAnalysisAiQuestionRoutingProvider, TransparentAnalysisAiQuestionRoutingMeasuredGeneration, TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROMPT, TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROMPT_SHA256, TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROMPT_VERSION, TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROTOCOL, TransparentAnalysisAiQuestionRoutingProvider (+3 more)

### Community 61 - "RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL"
Cohesion: 0.42
Nodes (6): assertRiskControlledMomentumV3IsOpen(), RISK_CONTROLLED_MOMENTUM_V3_CLOSURE, RISK_CONTROLLED_MOMENTUM_V3_CLOSURE_STATUS, RISK_CONTROLLED_MOMENTUM_V3_CLOSURE_VERSION, RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL, main()

### Community 62 - "broad-episode-dataset.ts"
Cohesion: 0.17
Nodes (19): DAILY_SWING_BROAD_DATASET_VERSION, DailySwingBroadDataset, DailySwingBroadDatasetRow, buildDailySwingBroadEpisodeDataset(), finiteUtility(), requireSource(), rowsBefore(), rowsBetween() (+11 more)

### Community 63 - "content-safety.ts"
Cohesion: 0.26
Nodes (14): dashboardUrl(), formatPrice(), formatTimestamp(), renderAlertEmail(), controlledTag(), escapeHtml(), PARAGRAPH_ATTRIBUTES, parseSafeHttpUrl() (+6 more)

### Community 64 - "canonical-key.ts"
Cohesion: 0.11
Nodes (25): InstrumentPage(), getInstrumentByCanonicalKey(), isDuplicateKeyError(), normalizeFinnhubSymbol(), resolveFinnhubEquityCatalogInstrument(), resolveFinnhubEquityInstrument(), getWatchlistInstrumentIdsForUser(), CANONICAL_KEY_MAX_LENGTH (+17 more)

### Community 65 - "us-equity-session.ts"
Cohesion: 0.16
Nodes (18): CLOSED_SESSION_DATES, dateKey(), EARLY_CLOSE_SESSION_DATES, isSupported(), isWeekend(), LocalDate, LocalDateTime, NEW_YORK_PARTS (+10 more)

### Community 66 - "cross-sectional-momentum-source.ts"
Cohesion: 0.15
Nodes (17): ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_ID, ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL, ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_VERSION, writeMomentumDevelopmentReport(), MomentumBenchmarkHistory, MomentumSleeveId, MomentumSourceScan, assertMarketProvenance() (+9 more)

### Community 67 - "mongoose.ts"
Cohesion: 0.09
Nodes (20): runMigration(), applyChanges, EquityInstrument, run(), applyChanges, FinnhubProfile, getFinnhubProfile(), isDuplicateKeyError() (+12 more)

### Community 68 - "Transparent analysis AI latency observation v1 preregistration"
Cohesion: 0.33
Nodes (5): Frozen protocol, Interpretation boundary, Question, Recorded observation, Transparent analysis AI latency observation v1 preregistration

### Community 69 - "sync-instrument-catalog.ts"
Cohesion: 0.10
Nodes (38): applyChanges, bindingKey(), deactivateOnly, ExistingInstrument, matchingExistingInstruments(), normalizeCatalog(), omittedInstrumentFields(), OPTIONAL_INSTRUMENT_FIELDS (+30 more)

### Community 70 - "Transparent analysis AI provider pacing v1 preregistration"
Cohesion: 0.33
Nodes (5): Basis, Frozen gates, Frozen protocol, Recorded observation, Transparent analysis AI provider pacing v1 preregistration

### Community 71 - "user-alerts.ts"
Cohesion: 0.13
Nodes (25): AlertDetailsDialogState(), actionError(), createAlertAction(), deleteAlertAction(), sendTestAlertEmailAction(), setAlertStatusAction(), updateAlertAction(), deliverSpecificAlertEmail() (+17 more)

### Community 72 - "boosted-model.ts"
Cohesion: 0.15
Nodes (19): binaryTarget(), BOOSTED_DEVELOPMENT_THRESHOLDS, BOOSTED_TRAINING_CONFIGURATION, CandidateThresholds, fitStump(), minimum(), rawPredictions(), sigmoid() (+11 more)

### Community 73 - "transparent-analysis-ai-topic-routing-v2.ts"
Cohesion: 0.11
Nodes (28): buildTransparentAnalysisAiTopicRoutingV2Input(), expandTransparentAnalysisAiTopicRoutingV2(), FACTOR_ORDER, FACTORS_BY_TOPIC, hasExactKeys(), isRecord(), isUniqueTopicArray(), LIMITATION_TEXT (+20 more)

### Community 74 - "technical-analysis.ts"
Cohesion: 0.08
Nodes (49): momentumReturn(), annualizedRealizedVolatility(), averageTrueRangeSeries(), exponentialMovingAverageSeries(), macdSeries(), NumericBar, percentageReturn(), relativeStrengthIndexSeries() (+41 more)

### Community 75 - "transparent-analysis-ai-selection-acceptance-v1-fixtures.ts"
Cohesion: 0.16
Nodes (15): availablePanel(), boundaryPanel, context(), generationFixtures, generationSpecifications, momentumFacts(), MomentumState, participationFacts() (+7 more)

### Community 76 - "transparent-analysis-ai-topic-routing-v3-command.ts"
Cohesion: 0.10
Nodes (25): GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE, GoogleTransparentAnalysisAiFetchImplementation, GOOGLE_TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_CANDIDATE, GoogleTransparentAnalysisAiTopicRoutingV2Provider, TransparentAnalysisAiTopicRoutingV2MeasuredGeneration, TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROMPT, TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROMPT_SHA256, TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROMPT_VERSION (+17 more)

### Community 77 - "Transparent analysis AI explanation v1.3 preregistration"
Cohesion: 0.29
Nodes (6): Decision rule, Frozen gates, Frozen protocol, Purpose, Recorded development result, Transparent analysis AI explanation v1.3 preregistration

### Community 78 - "MarketBar"
Cohesion: 0.16
Nodes (15): auditProviderSeries(), BacktestProviderAuditReport, buildProviderAuditReport(), dateKey(), median(), percentile(), ProviderSeriesAudit, THRESHOLDS (+7 more)

### Community 79 - "migrate-communication-preferences.ts"
Cohesion: 0.26
Nodes (9): applyChanges, MigrationSummary, runMigration(), CommunicationPreferenceSnapshot, DEFAULT_MARKET_NEWS_CATEGORIES, createLegacyCommunicationPreferenceSeed(), LegacyCommunicationPreferenceSeed, LegacyUserProfileEmailPreference (+1 more)

### Community 80 - "transparent-analysis-ai-topic-routing-v3-fixtures.ts"
Cohesion: 0.12
Nodes (18): TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES, TransparentAnalysisAiTopicRoutingV2Route, fixtures, generation(), InvalidMutation, otherGenerationFixtures, singleTopicFixtures, topicQuestions (+10 more)

### Community 81 - "Q: Can you make the terms and privacy to be separate pages"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Can you make the terms and privacy to be separate pages, Source Nodes

### Community 82 - "transparent-analysis-telemetry.ts"
Cohesion: 0.08
Nodes (32): handleTransparentAnalysisAiProductionRequest(), json(), availablePanel, synthesis, TRANSPARENT_ANALYSIS_AI_RESPONSE_VERSION, TransparentAnalysisAiProductionRouteDependencies, TransparentAnalysisAiResponse, TransparentAnalysisAiProductionResult (+24 more)

### Community 83 - "transparent-analysis-ai-question-routing-fixtures.ts"
Cohesion: 0.14
Nodes (23): analysisDetailFixtures, BoundaryFixture, BoundaryFixtureBase, boundaryFixtures, clarifyFixtures, context(), contextFixtures, expected() (+15 more)

### Community 84 - "backtest.types.ts"
Cohesion: 0.09
Nodes (22): FROZEN_CONFIRMATION_SYMBOLS, at(), developmentReport(), FIRST_SIGNAL, instrumentReport(), SIGNAL_FEATURES, SIGNAL_QUALITY, trade() (+14 more)

### Community 85 - "inngest-email-delivery-config.test.ts"
Cohesion: 0.53
Nodes (3): ALERT_EMAIL_DELIVERY_CRON, ALERT_EMAIL_DELIVERY_EVENT, ALERT_EMAIL_DELIVERY_FUNCTION_CONFIG

### Community 86 - "requireCompletedUser"
Cohesion: 0.17
Nodes (17): NotificationPage(), NotificationsPage(), NotificationDetail(), announceNotificationChange(), NotificationChange, NotificationList(), Separator(), Skeleton() (+9 more)

### Community 87 - "transparent-analysis-ai-evaluation.ts"
Cohesion: 0.08
Nodes (34): TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_GATES, TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_PROTOCOL, TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_VERSION, TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2, TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2_SHA256, TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_GATES, TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_MINIMUM_COMPLETION_PERCENT, TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_PROTOCOL (+26 more)

### Community 88 - "Q: Why does connectToDatabase() bridge 17 distinct communities?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why does connectToDatabase() bridge 17 distinct communities?, Source Nodes

### Community 89 - "button.tsx"
Cohesion: 0.19
Nodes (10): AuthDivider(), AuthFormError(), FooterLink(), GoogleAuthButton(), InputField(), MultiSelectField(), Button(), buttonVariants (+2 more)

### Community 90 - "CountryList"
Cohesion: 0.13
Nodes (4): CountryList, CountryMap, CountryOption, react-select-country-list

### Community 91 - "transparent-analysis-ai-fixtures.ts"
Cohesion: 0.18
Nodes (11): availablePanel(), boundaryFixtures, context(), contextFixtures, MomentumState, ParticipationState, qualityFixtures, stateFixtures (+3 more)

### Community 92 - "Daily Swing Episode Model v1 Preregistration"
Cohesion: 0.15
Nodes (14): 5,000-Episode Coverage Gate, Daily Swing Broad Episode Training v1, Episode-First Selection, Walk-Forward Model Selection, Daily Swing Episode Model v1 Preregistration, Episode Actionable Logistic Model, Independent Episode Split Policy, Rejected Episode Validation Result (+6 more)

### Community 93 - "portfolio-backtest.ts"
Cohesion: 0.09
Nodes (30): activeAtOpen(), activeOpeningExposure(), Candidate, DEFAULT_CONFIGURATION, descendingNullable(), finitePositive(), latestMark(), PortfolioBacktestInput (+22 more)

### Community 94 - "objective-features.ts"
Cohesion: 0.27
Nodes (11): parseMarketBar(), buildDailySwingObjectiveFeatures(), BuildDailySwingObjectiveFeaturesInput, median(), nearestLevel(), parseBars(), percentileRank(), positiveDollarVolumes() (+3 more)

### Community 95 - "market-news-delivery.test.ts"
Cohesion: 0.20
Nodes (14): MarketNewsDeliveryLogDocument, marketNewsDeliveryLogSchema, MarketNewsDeliveryStatus, MARKET_NEWS_DELIVERY_EVENT, DAILY_MARKET_NEWS_CRON, DAILY_MARKET_NEWS_EVENT, DAILY_MARKET_NEWS_FUNCTION_CONFIG, MARKET_NEWS_DELIVERY_FUNCTION_CONFIG (+6 more)

### Community 96 - "Transparent analysis AI explanation v1 preregistration"
Cohesion: 0.20
Nodes (9): Authorized next step, Development results, Failure and caching contract, Frozen evaluation suite, Frozen input boundary, Frozen output boundary, Local candidate evaluation, Purpose (+1 more)

### Community 97 - "UserDropdown.tsx"
Cohesion: 0.12
Nodes (17): HeaderNavigation(), NavItems(), NotificationBell(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel() (+9 more)

### Community 98 - "utils.ts"
Cohesion: 0.16
Nodes (6): DashboardWatchlist(), DashboardWatchlistItem, StockLogo(), StockLogoProps, formatCurrencyValue(), ValidNewsArticle

### Community 99 - "email-template.test.ts"
Cohesion: 0.29
Nodes (10): NEWS_SUMMARY_EMAIL_PROMPT, PERSONALIZED_WELCOME_EMAIL_PROMPT, TRADINGVIEW_SYMBOL_MAPPING_PROMPT, INACTIVE_USER_REMINDER_EMAIL_TEMPLATE, NEWS_SUMMARY_EMAIL_TEMPLATE, STOCK_ALERT_LOWER_EMAIL_TEMPLATE, STOCK_ALERT_UPPER_EMAIL_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE (+2 more)

### Community 100 - "InAppNotificationsForm.tsx"
Cohesion: 0.20
Nodes (13): SelectField(), labels, Select(), SelectContent(), SelectGroup(), SelectItem(), SelectLabel(), SelectScrollDownButton() (+5 more)

### Community 101 - "commodity-catalog.ts"
Cohesion: 0.12
Nodes (25): applyChanges, LegacyMetalInstrument, runMigration(), targetDefinition(), buildCanonicalKey(), contractMonth(), segment(), CommoditySpotCatalogEntry (+17 more)

### Community 102 - "types.ts"
Cohesion: 0.09
Nodes (24): FakeProvider, invertBars(), invertPositiveDecimal(), invertQuote(), marketStateForCalendar(), FinnhubQuotePayload, FinnhubQuoteProvider, FinnhubQuoteProviderOptions (+16 more)

### Community 103 - "store.test.ts"
Cohesion: 0.22
Nodes (7): compare(), Filter, matches(), Row, rows, sort(), timestamp

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

### Community 108 - "setup-scan.types.ts"
Cohesion: 0.10
Nodes (26): instrumentReport(), OBJECTIVE_FEATURES, SIGNAL_FEATURES, sourceReport(), WINDOWS, DAILY_SWING_BROAD_SETUP_SCAN_SHA256, buildDailySwingCombinedBroadDataset(), BASE_WINDOWS (+18 more)

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
Cohesion: 0.11
Nodes (17): Authorization boundary and next checkpoint, Closed topic catalog, Decision and purpose, Decision rule, Deterministic expansion and rendering, Frozen development gates, Frozen fixtures and fake-evaluator implementation result, Frozen prompt and Google-adapter implementation result (+9 more)

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
Cohesion: 0.18
Nodes (10): Cache and quota protection, Defensive context: acceptance-generation-09, Finding, Implementation checkpoint result, Lightweight production observation, Mixed context: acceptance-generation-06, Overview selection and AI ordering product review, Presentation comparisons (+2 more)

### Community 125 - "Email Client Rendering Checklist"
Cohesion: 0.67
Nodes (4): Email Client Rendering Checklist, Email Rendering Compatibility Contract, Real-Inbox Rendering Smoke Test, Price Alert Email Template

### Community 127 - "transparent-analysis-ai-production.ts"
Cohesion: 0.07
Nodes (46): dynamic, POST(), runtime, AnalysisAiCacheDocument, analysisAiCacheSchema, AnalysisAiRateLimitDocument, analysisAiRateLimitSchema, ANALYSIS_AI_CACHE_TTL_MS (+38 more)

### Community 129 - "Bull and Rising Market Chart Motif"
Cohesion: 1.00
Nodes (3): Bull and Rising Market Chart Motif, Bull Wise Email Logo, Bull Wise Wordmark

### Community 130 - "store.ts"
Cohesion: 0.19
Nodes (19): GET(), GET(), notificationHttpError(), selectDigestArticles(), decodeCursor(), DEFAULT_IN_APP_NEWS, encodeCursor(), internalDestination() (+11 more)

### Community 138 - "Transparent analysis AI v1.6 acceptance v1 preregistration"
Cohesion: 0.22
Nodes (8): Acceptance result, Frozen candidate, Frozen gates, One-shot decision rule, Ordering value and limitations, Prerequisite and purpose, Sealed acceptance fixtures, Transparent analysis AI v1.6 acceptance v1 preregistration

### Community 139 - "Transparent analysis AI explanation v1.4 preregistration"
Cohesion: 0.29
Nodes (6): Decision rule, Development result, Frozen gates, Frozen protocol, Purpose, Transparent analysis AI explanation v1.4 preregistration

### Community 140 - "analysis/run-tests.ts"
Cohesion: 0.07
Nodes (45): AnalysisDatasetFeatureVector, AnalysisDatasetLabels, AnalysisDatasetRow, AnalysisDatasetSplit, AnalysisDatasetSplitSummary, DailySwingAnalysisDataset, dataset(), features() (+37 more)

### Community 141 - "Transparent analysis AI explanation v1.2 preregistration"
Cohesion: 0.29
Nodes (6): Frozen gates and decision rule, Frozen hypothesis and change, Frozen protocol, Purpose, Recorded development result, Transparent analysis AI explanation v1.2 preregistration

### Community 142 - "Transparent analysis AI provider reliability v1 preregistration"
Cohesion: 0.33
Nodes (5): Frozen protocol, Interpretation, Question, Recorded observation, Transparent analysis AI provider reliability v1 preregistration

### Community 143 - "Transparent analysis AI topic-routing experiment v3"
Cohesion: 0.12
Nodes (15): Authorization boundary and next checkpoint, Decision and purpose, Durable evaluator and finalizer implementation result, Durable one-shot execution protocol, Final product decision, Frozen automated and manual gates, Frozen interruption and recovery rule, Frozen product behavior (+7 more)

### Community 144 - "inngest-monitoring-config.test.ts"
Cohesion: 0.70
Nodes (3): ALERT_MONITORING_CRON, ALERT_MONITORING_EVENT, ALERT_MONITORING_FUNCTION_CONFIG

### Community 146 - "Transparent analysis grounded AI question routing v1"
Cohesion: 0.13
Nodes (14): Decision and purpose, Decision rule and authorized next step, Development fixtures, Explicit interaction contract, Fixture and fake-evaluator implementation result, Frozen development evaluation result, Frozen development gates, Frozen prompt and Google-adapter implementation result (+6 more)

### Community 147 - "transparent-analysis-service.ts"
Cohesion: 0.24
Nodes (13): dynamic, GET(), runtime, orchestrateTransparentAnalysis(), response(), getMarketDataService(), getTransparentAnalysisPanel(), toAnalysisInstrument() (+5 more)

### Community 148 - "Transparent analysis AI deterministic-overview ordering v1.6 preregistration"
Cohesion: 0.22
Nodes (8): Decision rule, Development result, Frozen deterministic overview, Frozen gates, Frozen protocol, Frozen rendering and failure behavior, Purpose, Transparent analysis AI deterministic-overview ordering v1.6 preregistration

### Community 149 - "types/instruments.ts"
Cohesion: 0.08
Nodes (41): ASSET_FILTERS, SearchCommand(), SECURITY_TYPE_FILTERS, INSTRUMENT_TYPES_BY_ASSET_CLASS, InstrumentContract, instrumentContractSchema, InstrumentItem, instrumentSchema (+33 more)

### Community 150 - "watchlist/page.tsx"
Cohesion: 0.17
Nodes (11): WatchlistSearchParams, WatchlistAlerts(), WatchlistNews(), WatchlistNewsLoading(), WatchlistNewsSection(), WatchlistPageLoading(), WatchlistPagination(), WatchlistSearch() (+3 more)

### Community 151 - "OnboardingForm.tsx"
Cohesion: 0.13
Nodes (20): CountrySelectField(), defaultValues, OnboardingForm(), stepFields, stepLabels, cachedSchemaIsCurrent, cachedUserProfile, UserProfileDocument (+12 more)

### Community 152 - "auth.actions.ts"
Cohesion: 0.06
Nodes (46): handler(), SignInPage(), SignUpPage(), VerifyEmailPage(), maskEmail(), verificationErrorMessage(), VerifyEmailCard(), VerificationEmailRateLimitDocument (+38 more)

### Community 154 - "AlertDialogs.tsx"
Cohesion: 0.11
Nodes (21): AlertDetailsDialog(), AlertDetailsDialogProps, CreateAlertDialog(), CreateAlertDialogProps, CreateAlertDialogState(), instrumentKey(), suggestedThreshold(), Dialog() (+13 more)

### Community 155 - "email-client-compatibility.test.ts"
Cohesion: 0.15
Nodes (5): createAlertJob(), emailBranding, EmailFixture, marketingEmailBranding, RenderedEmail

### Community 158 - "risk-controlled-momentum-v3-source.ts"
Cohesion: 0.33
Nodes (11): RiskControlledMomentumBenchmarkHistory, RiskControlledMomentumSleeveId, bar(), JsonObject, marketBars(), object(), parseRiskControlledMomentumV3HistoryArtifact(), positive() (+3 more)

### Community 159 - "communication-eligibility.ts"
Cohesion: 0.20
Nodes (9): BetterAuthUser, getEmailEligibility(), getPreference(), EmailEligibilityRequest, EmailEligibilityResult, evaluateEmailEligibility(), hasAuditableConsent(), streamForMessage() (+1 more)

### Community 161 - "google-transparent-analysis-ai-provider.ts"
Cohesion: 0.12
Nodes (21): geminiCompatibleSchema(), GeminiResponse, GoogleTransparentAnalysisAiEvaluationRequest, GoogleTransparentAnalysisAiProvider, GoogleTransparentAnalysisAiProviderError, GoogleTransparentAnalysisAiProviderFailureCategory, httpFailureCategory(), outputText() (+13 more)

### Community 163 - "market-news-preference.ts"
Cohesion: 0.33
Nodes (7): COMMUNICATION_POLICY_VERSION, EmailSubscriptionPreferenceSnapshot, replaceOrInsertMarketNewsSubscription(), saveMarketNewsPreference(), MarketNewsPreferenceWriteRepository, saveMarketNewsPreferenceWorkflow(), now

### Community 164 - "In-app notifications"
Cohesion: 0.33
Nodes (5): Announcements, Enable after deployment, In-app notifications, Interfaces and verification, News

### Community 167 - "requireUser"
Cohesion: 0.23
Nodes (10): Layout(), OnboardingPage(), Layout(), PreferencesSettingsPage(), Header(), PreferencesForm(), getRequestSession, requireUser() (+2 more)

### Community 169 - "settings/notifications/page.tsx"
Cohesion: 0.50
Nodes (4): NotificationSettingsPage(), InAppNotificationsForm(), defaultView(), getMarketNewsPreference()

## Knowledge Gaps
- **938 isolated node(s):** `metadata`, `sections`, `metadata`, `sections`, `MARKET_SUMMARY_WIDGET_CONFIG` (+933 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `connectToDatabase()` connect `connectToDatabase` to `store.ts`, `functions.ts`, `email-delivery.ts`, `transparent-analysis-service.ts`, `types/instruments.ts`, `OnboardingForm.tsx`, `auth.actions.ts`, `processor.ts`, `communication-eligibility.ts`, `market-news-preference.ts`, `email-suppression.ts`, `requireUser`, `email-rendering.ts`, `settings/notifications/page.tsx`, `inngest/notifications.ts`, `canonical-key.ts`, `mongoose.ts`, `user-alerts.ts`, `requireCompletedUser`, `transparent-analysis-ai-production.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `EquitySecurityType` connect `equity-catalog.ts` to `global.d.ts`, `technical-analysis.types.ts`, `connectToDatabase`, `technical-analysis.ts`, `fetch-backtest-history.ts`, `types/instruments.ts`, `transparent-analysis-orchestrator.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `AssetClass` connect `types/instruments.ts` to `global.d.ts`, `technical-analysis.types.ts`, `sync-instrument-catalog.ts`, `types.ts`, `AlertDialogs.tsx`, `fetch-backtest-batch.ts`, `connectToDatabase`, `processor.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `metadata`, `sections`, `metadata` to the rest of the system?**
  _938 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.024691358024691357 - nodes in this community are weakly interconnected._
- **Should `transparent-analysis-ai-question-routing.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10685483870967742 - nodes in this community are weakly interconnected._
- **Should `technical-analysis.types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08907563025210084 - nodes in this community are weakly interconnected._