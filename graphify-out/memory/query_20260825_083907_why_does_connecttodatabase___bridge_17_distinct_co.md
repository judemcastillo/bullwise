---
type: "query"
date: "2026-08-25T08:39:07.654162+00:00"
question: "Why does connectToDatabase() bridge 17 distinct communities?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["connectToDatabase()", "addToCurrentUserWatchlist()", "getInstrumentByCanonicalKey()", "createAuth()", "getEmailEligibility()", "claimMarketNewsDelivery()", "getSpyAnalysisBenchmark()"]
---

# Q: Why does connectToDatabase() bridge 17 distinct communities?

## Answer

Expanded from original query via graph vocabulary: [connect, database, repository, data]. connectToDatabase() at database/mongoose.ts L18 has degree 50: 33 extracted call edges, 16 extracted import edges, and one extracted containment edge. Its direct neighbors occupy 18 communities, meaning its own Watchlist Data Flow community plus 17 others. It is the shared persistence gateway used by business-specific modules for watchlists, instruments, authentication and onboarding, alerts, email preferences and delivery, verification throttling, user profiles, and transparent analysis. Community clustering groups callers by business responsibility, while this common database boundary cuts across those groups. Its placement in Watchlist Data Flow reflects its densest local neighborhood, not exclusive ownership by watchlists.

## Outcome

- Signal: useful

## Source Nodes

- connectToDatabase()
- addToCurrentUserWatchlist()
- getInstrumentByCanonicalKey()
- createAuth()
- getEmailEligibility()
- claimMarketNewsDelivery()
- getSpyAnalysisBenchmark()