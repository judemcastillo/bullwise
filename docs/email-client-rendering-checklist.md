# Email client rendering checklist

The automated email suite validates the compatibility contract used by the
actively sent verification, welcome, price-alert, Daily News, and Weekly News
messages. It checks table layout, inline critical styles, responsive rules,
dark-mode metadata, image fallbacks, safe absolute links, Gmail message size,
Outlook conditional settings and buttons, Apple Mail metadata, and unresolved
template placeholders.

Run it with:

```bash
npm run test:email
```

Automated HTML assertions cannot reproduce the proprietary rendering engines
inside Gmail, Outlook, or Apple Mail. Complete this smoke test before a template
release and after any material template or generated-content change.

## Prerequisites

- Use a non-production Bull Wise environment with an HTTPS public application
  URL. Inbox clients cannot load images from `localhost`.
- Configure the test sender and a legitimate
  `EMAIL_MARKETING_POSTAL_ADDRESS`.
- Use dedicated Gmail, Outlook, and Apple/iCloud test inboxes.
- Subscribe only the test accounts to Daily or Weekly News.

## Messages to deliver

Send each active message type to every test inbox:

1. Sign up to receive the verification email.
2. Complete onboarding to receive the welcome email.
3. Create a price alert and use **Send test email** in development.
4. Select Daily News, then invoke **Queue daily market news** in the Inngest
   development server.
5. Select Weekly News, then invoke **Queue weekly market news**.

Do not invoke a scheduled news function against production recipients as a
rendering test.

## Client matrix

| Client | Surfaces to check | Client-specific checks |
| --- | --- | --- |
| Gmail | Web and one mobile app | Message is not clipped, images load, mobile padding applies, buttons remain readable, and the unsubscribe UI or headers are available for news. |
| Outlook | Windows desktop and Outlook on the web | Container and buttons remain aligned, backgrounds and text retain usable contrast, images keep their intended dimensions, and no layout depends on flexbox or grid. |
| Apple Mail | macOS and iOS | Message width is not reformatted, dark mode remains readable, links retain contrast, and images scale without overflowing. |

For every message, also verify:

- Subject and visible message type are correct.
- Plain-text content is present when HTML is disabled.
- Logo, dashboard preview, and every link use the expected production origin.
- Buttons work and are large enough to tap on mobile.
- No raw placeholders such as `{{name}}` remain.
- No content is cut off around 320 px viewport width.
- Daily and Weekly News show the postal address and working unsubscribe link.
- Unsubscribing does not require authentication and suppresses the next
  scheduled news delivery.

For news messages, inspect the raw message source and confirm these headers are
present:

```text
List-Unsubscribe: <https://...>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

Record the date, client/version, operating system, message types, and any
screenshots in the release notes or issue tracker. A passing automated suite is
required, but it does not replace this real-inbox check.
