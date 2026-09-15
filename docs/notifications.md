# In-app notifications

The header bell and `/notifications` share an inbox backed by MongoDB. The existing shadcn/ui components provide the controls. Read state persists per recipient; opening the popover does not mark anything read. Opening an item does. “Mark all as read” uses a server-captured cutoff so later arrivals stay unread.

## Enable after deployment

Run against the intended deployment database:

```sh
npm run notifications:initialize
```

This creates the notification, preference, alert-delivery, and announcement indexes before setting the durable activation timestamp. Rerunning preserves that timestamp. Inngest producers remain disabled until initialization; the UI can be deployed first. Preference writes return a retryable message until initialization completes. Register/sync the updated `/api/inngest` functions with the deployment's existing Inngest setup.

No historical data is backfilled. New market alert events include a pending inbox delivery marker. A minute-by-minute worker picks up events created at or after activation and deduplicates on event ID. Email status has no effect on in-app delivery. Development-test events are excluded. Read notifications have no automatic expiry.

## News

In-app news defaults to a daily digest of general-market and watchlist stories, independent of email consent or suppression. `/settings/notifications` offers off/daily/weekly and category controls. Daily delivery runs at 12:00 UTC; weekly runs Monday at 12:00 UTC, matching the existing email schedule.

The independent recipient queue pages through verified users with completed onboarding. Each delivery rechecks current in-app preferences. Digests use up to six unique HTTP(S) article links, ordered newest first, with no extra AI generation. Earnings and economic-news categories use headline/category keyword filtering; watchlist news uses company-related stories. An empty result creates no notification. Provider retrieval currently follows the existing `getNews` behavior, which logs retrieval failures and can return an empty result.

## Announcements

Create a JSON file, for example:

```json
{
  "key": "watchlist-release-2026-09",
  "title": "Watchlist improvements",
  "body": "Your updated watchlist is ready.",
  "destination": "/watchlist"
}
```

Preview the content and recipient count:

```sh
npm run notifications:announce -- --file /path/to/announcement.json
```

Publish explicitly:

```sh
npm run notifications:announce -- --file /path/to/announcement.json --publish
```

Publishing snapshots the eligible audience in a MongoDB transaction, then delivers in batches of 100. It requires a replica set or sharded cluster, as does the existing alert-trigger transaction. If delivery fails, rerun the same command and file: it resumes the frozen audience and cannot duplicate inbox items. A key cannot be reused with changed content. Users who join after the snapshot do not receive that announcement. Very large audiences must fit the database's transaction duration for the initial snapshot; an interrupted snapshot rolls back and publishes nothing.

Only plain text and an optional local app path are accepted. No email or browser-push message is sent.

## Interfaces and verification

- `GET /api/notifications?cursor=…`: newest-first pages of 20 with opaque date/ID cursors.
- `GET /api/notifications/count`: unread count.
- Server actions in `lib/actions/inbox.actions.ts`: mark one/all read and save in-app news preferences.
- `/notifications/[id]`: owner-scoped detail view; another user's ID returns not found.

All user-facing reads and writes resolve identity from the authenticated, verified, onboarded session. HTTP responses are private and uncached. The bell refreshes counts on mount, focus, visibility return, and every minute while visible; opening it reloads the latest list. Read changes synchronize mounted inbox views in the same window.

```sh
npm run test:notifications
```

Tests cover recipient isolation, pagination under new arrivals, read cutoffs, safe content, retries, announcement preview/resume, and email-independent news preferences. Persistence tests use isolated model adapters, not a live MongoDB instance. Inngest logs expose step failures/retries and source delivery statuses; alert errors log event IDs without notification content.
