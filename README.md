# Bull Wise

Bull Wise is a Next.js stock dashboard with authenticated watchlists, Finnhub
market data, price alerts, Google OAuth, email verification, and Inngest
background workflows.

## Local setup

Requirements:

- Node.js 20.19 or newer and npm
- A MongoDB database
- Credentials for the enabled external services listed below

Install dependencies and create your local environment file:

```bash
npm install
cp .env.example .env
```

Replace every placeholder needed by the features you intend to run. Never put
real credentials in `.env.example`; `.env` and other local environment files
are ignored by Git, while `.env.example` is intentionally tracked.

Generate a high-entropy Better Auth secret with:

```bash
openssl rand -base64 32
```

Start the application:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Requirement | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Required | MongoDB connection string used by application data and Better Auth. |
| `BETTER_AUTH_SECRET` | Required | At least 32 high-entropy characters used to sign and encrypt authentication data. |
| `BETTER_AUTH_URL` | Required | Canonical application origin, such as `http://localhost:3000` locally or the HTTPS production origin. |
| `GOOGLE_CLIENT_ID` | Required | Google OAuth web client identifier. |
| `GOOGLE_CLIENT_SECRET` | Required | Google OAuth web client secret. |
| `FINNHUB_API_KEY` | Required | Server-only key for stock profiles, quotes, search, and news. |
| `NODEMAILER_EMAIL` | Required | Gmail address used to send verification, welcome, news, and alert emails. |
| `NODEMAILER_PASSWORD` | Required | Gmail app password for `NODEMAILER_EMAIL`; do not use the account password. |
| `NEXT_PUBLIC_BASE_URL` | Optional | Public origin used in email links. It falls back to `BETTER_AUTH_URL`. Because it is browser-visible, never store a secret here. |
| `EMAIL_MARKETING_POSTAL_ADDRESS` | Market news email | Legitimate postal address included in optional Daily and Weekly News footers. News sends fail closed when it is missing or still set to the example placeholder. |
| `EMAIL_EVENT_WEBHOOK_SECRET` | Email event ingestion | At least 32 bytes used to authenticate hard-bounce and complaint events posted by a trusted provider adapter. |
| `EMAIL_UNSUBSCRIBE_ACTIVE_KEY_ID` | Production email | Identifier of the key used to sign newly issued unsubscribe tokens. Configure it together with `EMAIL_UNSUBSCRIBE_KEYS`. |
| `EMAIL_UNSUBSCRIBE_KEYS` | Production email | JSON object mapping active and retained key identifiers to high-entropy signing secrets. Each secret must contain at least 32 bytes. |
| `EMAIL_UNSUBSCRIBE_SECRET` | Local fallback | Optional single-key fallback for local development. It falls back to `BETTER_AUTH_SECRET`; production should use the rotatable keyring. |
| `GEMINI_API_KEY` | Feature-specific | Required by the Inngest welcome-email and daily-news AI steps. |
| `INNGEST_DEV` | Local Inngest only | Set to `1` when using the local Inngest Dev Server. Remove it in cloud deployments. |
| `INNGEST_EVENT_KEY` | Inngest Cloud | Allows the application to publish events to Inngest Cloud. Not required by the local Dev Server. |
| `INNGEST_SIGNING_KEY` | Inngest Cloud | Authenticates requests between Inngest Cloud and `/api/inngest`. Not required by the local Dev Server. |

`NODE_ENV` is read by the application but is managed automatically by Next.js.
Do not add it to `.env` unless you have a specific tooling requirement.

### Unsubscribe signing-key rotation

Unsubscribe tokens expire 24 calendar months after issuance. Rotate the active
signing key every 12 months:

1. Generate a new secret with `openssl rand -base64 32` and add it to
   `EMAIL_UNSUBSCRIBE_KEYS` under a new key identifier.
2. Set `EMAIL_UNSUBSCRIBE_ACTIVE_KEY_ID` to the new identifier and deploy both
   configuration changes together.
3. Retain the previous key in `EMAIL_UNSUBSCRIBE_KEYS` for at least 24 months
   after it last signed a token. Removing it revokes every remaining token that
   references it.

The keyring and all signing secrets are server-only configuration. Never prefix
them with `NEXT_PUBLIC_` or commit their real values.

When moving an environment from the single-key fallback to the keyring, retain
the existing fallback secret under the `default` key identifier until its last
version 1 token expires. A pre-launch environment may instead invalidate those
test links and start with only the new production key.

### Bounce and complaint suppression

The application suppresses verification, welcome, alert, Daily News, and
Weekly News delivery after a hard bounce or complaint. Permanent recipient
errors returned synchronously by Gmail SMTP, such as enhanced `5.1.x` errors,
are recorded automatically. Temporary `4.x` errors, mailbox-full responses,
and sender-policy failures are not treated as hard bounces.

Trusted provider adapters can post recipient-level events to
`POST /api/email/events`. Sign the exact raw request body with
`EMAIL_EVENT_WEBHOOK_SECRET`:

```text
X-Bullwise-Email-Timestamp: <current Unix timestamp in seconds>
X-Bullwise-Email-Signature: v1=<HMAC-SHA256(timestamp + "." + rawBody)>
```

The endpoint accepts JSON with this shape:

```json
{
  "eventId": "provider-event-id",
  "type": "hard_bounce",
  "email": "recipient@example.com",
  "provider": "provider-name",
  "occurredAt": "2026-08-11T12:00:00.000Z"
}
```

`type` may be `hard_bounce` or `complaint`. Requests expire after five minutes,
payloads are limited to 64 KiB, duplicate/older events are harmless, and a
complaint cannot be downgraded by a later hard-bounce event.

Gmail's Feedback Loop provides aggregate campaign spam-rate reporting rather
than the recipient-level complaint event needed for automatic individual
suppression. Keep complaint ingestion configured for a trusted adapter or a
future transactional provider; do not infer individual complainants from
aggregate Postmaster data.

### Google OAuth

Create a Google OAuth web application and configure this authorized redirect
URI for local development:

```text
http://localhost:3000/api/auth/callback/google
```

For deployments, replace the origin with the exact production origin used by
`BETTER_AUTH_URL`. See the
[Better Auth Google setup](https://better-auth.com/docs/authentication/google).

### Inngest

The application exposes its functions at `/api/inngest`. Local development can
use the Inngest Dev Server with `INNGEST_DEV=1` and no event or signing keys.
After the Next.js development server is running, start Inngest in another
terminal:

```bash
npx --ignore-scripts=false inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

Cloud deployments need both `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`; the
SDK reads them automatically. See the
[Inngest local-development guide](https://www.inngest.com/docs/local-development),
[event-key documentation](https://www.inngest.com/docs/events/creating-an-event-key),
and [signing-key documentation](https://www.inngest.com/docs/platform/signing-keys).

## Validation commands

```bash
npm run test:db  # Ping MongoDB using MONGODB_URI
npm test         # Run all application tests
npm run lint     # Run ESLint
npm run build    # Type-check and create the production build
```

The production build downloads the configured Geist fonts, so the build
environment needs outbound access to Google Fonts.

Email-template changes also require the automated suite plus the
[real-inbox Gmail, Outlook, and Apple Mail checklist](docs/email-client-rendering-checklist.md).

## Production checklist

- Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_BASE_URL` to the HTTPS application
  origin.
- Set `EMAIL_MARKETING_POSTAL_ADDRESS` to the legitimate postal address for
  the sender before enabling Daily or Weekly News delivery.
- Generate `EMAIL_EVENT_WEBHOOK_SECRET` and configure the trusted provider
  adapter before enabling `/api/email/events` in production.
- Add the matching Google OAuth callback URL.
- Store every credential in the deployment platform's secret manager.
- Configure separate MongoDB, Google, Finnhub, Gemini, email, and Inngest
  credentials for each environment where practical.
- Run `npm test`, `npm run lint`, `npm audit`, and `npm run build` before
  deployment.
