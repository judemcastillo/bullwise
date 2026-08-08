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
| `NEXT_PUBLIC_BASE_URL` | Optional | Public origin used in alert-email links. It falls back to `BETTER_AUTH_URL`. Because it is browser-visible, never store a secret here. |
| `GEMINI_API_KEY` | Feature-specific | Required by the Inngest welcome-email and daily-news AI steps. |
| `INNGEST_DEV` | Local Inngest only | Set to `1` when using the local Inngest Dev Server. Remove it in cloud deployments. |
| `INNGEST_EVENT_KEY` | Inngest Cloud | Allows the application to publish events to Inngest Cloud. Not required by the local Dev Server. |
| `INNGEST_SIGNING_KEY` | Inngest Cloud | Authenticates requests between Inngest Cloud and `/api/inngest`. Not required by the local Dev Server. |

`NODE_ENV` is read by the application but is managed automatically by Next.js.
Do not add it to `.env` unless you have a specific tooling requirement.

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

## Production checklist

- Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_BASE_URL` to the HTTPS application
  origin.
- Add the matching Google OAuth callback URL.
- Store every credential in the deployment platform's secret manager.
- Configure separate MongoDB, Google, Finnhub, Gemini, email, and Inngest
  credentials for each environment where practical.
- Run `npm test`, `npm run lint`, `npm audit`, and `npm run build` before
  deployment.
