---
type: "query"
date: "2026-08-31T07:47:06.782327+00:00"
question: "Can you make the terms and privacy to be separate pages"
contributor: "graphify"
outcome: "useful"
source_nodes: ["TermsPage()", "PrivacyPage()", "sign-up/page.tsx", "LegalDocument.tsx"]
---

# Q: Can you make the terms and privacy to be separate pages

## Answer

Expanded from original query via graph vocab: [terms, privacy, legal, page, route, footer, policy]. The combined TermsPage was split so TermsPage serves only Terms of Use at /terms and PrivacyPage serves the Privacy Policy at /privacy. The sign-up links now target those separate routes, while both pages reuse LegalDocument.

## Outcome

- Signal: useful

## Source Nodes

- TermsPage()
- PrivacyPage()
- sign-up/page.tsx
- LegalDocument.tsx