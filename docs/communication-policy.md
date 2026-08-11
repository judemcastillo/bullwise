# Bull Wise Communication Policy

Policy version: `2026-01`

Status: approved engineering baseline for the communication-preferences rollout.
This document defines product and delivery behavior; it is not a substitute for
jurisdiction-specific legal review.

## Communication classes

| Message | Class | Preference behavior |
| --- | --- | --- |
| Email verification and account security | Required transactional | Not controlled by marketing preferences. Delivery suppression still applies. |
| Price alerts created by a user | User-requested transactional | Controlled by the individual alert, not by a news subscription. Delivery suppression still applies. |
| Market-news summaries | Optional | Requires recorded consent and an enabled frequency. |
| Product announcements | Optional | Requires consent separate from market news. |
| Inactive-user reminders | Optional | Must use an optional communication stream before being enabled. |

Optional-email preferences must never enable, disable, or otherwise change
transactional price alerts.

## Consent

- Optional email is off until the user takes an affirmative opt-in action.
- Account creation, email verification, and acceptance of the Terms do not count
  as consent to optional email.
- Every opt-in records its source, timestamp, and the communication-policy version
  shown to the user.
- Supported consent sources are onboarding, notification settings, the preference
  center, and an imported consent record whose provenance has been verified.
- Re-subscribing creates a new consent timestamp. Previous unsubscribe and consent
  activity should remain available through application audit records when that
  history is implemented.
- Administrators must not silently convert an unknown or unsubscribed preference
  into subscribed.

## Optional-email controls

Market-news frequency may be `daily`, `weekly`, or `off`.

Market-news categories are:

- Watchlist news
- General market news
- Earnings
- Economic news

Product announcements are a separate stream and are not enabled by market-news
consent.

## Unsubscribe behavior

- Each optional message contains a public unsubscribe link and standards-based
  one-click unsubscribe headers.
- Unsubscribe does not require an authenticated session.
- A category or stream unsubscribe takes effect immediately for future delivery
  eligibility checks.
- The preference center provides an authenticated way to re-subscribe.
- Email verification, security messages, and requested price alerts are not
  disabled by a market-news unsubscribe.
- A message already accepted by the email provider cannot be recalled.

## Delivery suppression

Eligibility is evaluated in this order:

1. Deleted account
2. Provider complaint
3. Hard bounce
4. Optional stream subscription state
5. Frequency and category selection

Deleted, complained, and hard-bounced recipients are suppressed from all email
until a future, explicitly reviewed recovery policy says otherwise. An optional
global unsubscribe can be added later and must take precedence over individual
optional streams.

## Unsubscribe-token lifecycle

- Tokens are limited to the `unsubscribe` purpose and cannot authorize other
  account mutations.
- Version 1 tokens include a format version, signing-key identifier, user
  identifier, communication stream, issued-at time, expiration time, and HMAC
  signature.
- Tokens expire 24 calendar months after issuance. Verification allows no more
  than five minutes of future clock skew and never extends the expiration time.
- The active signing key rotates every 12 months.
- Retired verification keys remain available for at least 24 months after their
  final token issuance.
- A compromised key may be revoked immediately through an incident-response
  procedure, even if this invalidates links signed by that key.
- Raw email addresses are not stored in unsubscribe tokens.
- Legacy unversioned tokens are rejected. This pre-launch upgrade invalidates
  links created by local development builds before the version 1 rollout.

## Existing-user migration

The existing `dailyNewsEmailEnabled` flag does not prove when, where, or under
which policy a user consented. Migration therefore follows these rules:

- `dailyNewsEmailEnabled: false` becomes an unsubscribed market-news preference.
- `dailyNewsEmailEnabled: true` or a missing flag becomes `unknown`, with frequency
  `off`, unless a separately verified consent record can be imported.
- A missing historical unsubscribe timestamp uses the migration time as the
  conservative effective timestamp and is labeled as a legacy migration.
- Migration never invents consent metadata.
- The migration is dry-run by default, idempotent, and does not overwrite an
  existing communication-preferences document.

The live market-news jobs use this model as their only recipient eligibility
source. Daily and weekly schedules page through subscribed preference records,
fan out opaque user IDs, and re-check centralized eligibility immediately before
delivery. They do not read the legacy `dailyNewsEmailEnabled` field.

The legacy field remains temporarily dual-written as rollback data, but it no
longer controls delivery. Weekly subscribers are handled by the weekly schedule
and cannot be selected by the daily schedule.

Run the migration in dry-run mode first:

```bash
npm run migrate:communication-preferences
```

After reviewing the counts and taking an appropriate database backup, apply it
explicitly:

```bash
npm run migrate:communication-preferences -- --apply
```

## Operational guarantees

The dedicated-preferences delivery path guarantees that:

- Every optional send uses the centralized eligibility service.
- Eligibility is checked again as close as practical to provider submission.
- Bounce and complaint webhooks eventually write centralized suppression state.
- Recipient processing is paginated, fanned out in bounded batches, and delivered
  with function-level concurrency limits.
- Generated HTML is sanitized before email delivery.
- Consent, unsubscribe, suppression, and provider-delivery changes are observable
  and auditable.
