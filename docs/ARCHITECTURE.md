# Personal Finance Tracker — Architecture

## Why this shape

You need: zero hosting cost, your financial data staying private, fast entry from
an iPhone Shortcut, and a real reporting UI. The full enterprise version (Spring
Boot + Microsoft Graph + Excel) does all of this but requires an always-on server
and a Microsoft 365 account you don't have. This version gets the same properties
using infrastructure Google already hosts for free.

## Phase 1 — Browser + Google Sheets, no server you manage

```
┌─────────────┐      HTTPS POST/GET       ┌──────────────────────┐
│  iOS Shortcut│ ────────────────────────▶│                      │
└─────────────┘                            │  Google Apps Script  │
                                            │      Web App         │──▶ Google Sheet
┌─────────────┐      HTTPS (fetch)         │  (doGet / doPost)     │    (your data)
│ React PWA    │ ────────────────────────▶│                      │
│ (GitHub Pages)│                           └──────────────────────┘
└─────────────┘
```

- **Data store**: a Google Sheet in your Drive, with tables for Transactions,
  Categories, Subcategories, Accounts.
- **API layer**: a Google Apps Script bound to that Sheet, deployed as a Web App.
  This *is* your backend — Google runs it for free, indefinitely, at personal-use
  volume. It exposes a small JSON REST-ish API (`doGet`/`doPost`).
- **Frontend**: React + TypeScript + Vite PWA, static-hosted free on GitHub Pages.
  Calls the Apps Script URL directly via `fetch`.
- **iOS Shortcut**: a "Get Contents of URL" action that POSTs JSON straight to
  the same Apps Script URL. No OAuth dance needed on the phone.

### Security model (and its real limit)

- The Apps Script Web App is deployed "Execute as: Me / Access: Anyone" so it's
  callable without a Google login prompt (required for Shortcuts to work
  headlessly). Access is instead gated by a long random `API_TOKEN` you generate
  once, stored in Apps Script's **Script Properties** (server-side, never
  visible), and required on every request.
- **The caveat**: your static frontend must also hold this token client-side to
  send it, so it's technically extractable from your deployed GitHub Pages JS
  bundle by anyone who finds the exact URL. This isn't bank-grade auth — it's
  "your data isn't discoverable or public," not "cryptographically locked."
- Mitigations, pick what fits:
  1. Don't publicize the GitHub Pages URL; GitHub Pages URLs aren't indexed or
     linked anywhere.
  2. Rotate the token periodically (one line change in Script Properties).
  3. Optionally host the frontend instead on Cloudflare Pages or Vercel with
     password protection (both free tiers support this) instead of public
     GitHub Pages — closes the gap almost entirely.
  4. Worst case if the token leaks: someone can read/write your *expense sheet*,
     not your Google account, email, or anything else — the script only touches
     one Sheet and only does the actions you've coded.

If you later decide this isn't good enough, the fix is a Google sign-in (GIS)
flow in the browser instead of a static token — flagged as a possible Phase 1.5,
not built by default here since it adds real complexity for a solo-user app.

## Phase 2 — Add AI, still serverless

```
React PWA ──▶ Apps Script (same as above, all CRUD + reports)
    │
    └──▶ Cloudflare Worker (free tier) ──▶ AI provider (Claude/OpenAI API)
              (holds the AI API key)          │
                                               ▼
                                     returns suggested category/
                                     analysis text to the PWA,
                                     which writes back via Apps Script
```

- Only the AI key needs a real secret-holding layer, so only *that* piece gets
  a serverless function (Cloudflare Workers free tier: 100k requests/day, no
  credit card required).
- AI never talks to the Sheet directly — it goes through the same Apps Script
  API as everything else, so it can't do anything a normal transaction write
  couldn't already do. Matches the original spec's "AI must use controlled
  tools, never touch storage directly" principle.

## Data model

Same stable-ID design as the original spec — category/subcategory **names are
never used as keys**, only `categoryId` / `subcategoryId`. Renaming "Food" to
"Food & Dining" later doesn't touch a single transaction row.

Sheets (tables), each with a header row:

- `Transactions` — transactionId, date, type, categoryId, subcategoryId,
  amount, currency, accountId, merchantName, description, needWant,
  essentialDiscretionary, fixedVariable, tags, notes, source, createdAt
- `Categories` — categoryId, displayName, nature, active, sortOrder
- `Subcategories` — subcategoryId, categoryId, displayName, active, sortOrder
- `Accounts` — accountId, displayName, type, active

Categories are seeded from the India-relevant list in your original doc
(Housing, Food & Dining, Transportation, Shopping, Health, Personal,
Entertainment, Travel, Family, Financial, Investments, Income, Miscellaneous)
by the one-time `setup()` function in `Code.gs` — fully editable afterward from
the Sheet or, later, from a Settings screen in the app.

## What's built now vs. what's next

Built in this pass (a real, usable slice — not every screen from the original
spec, which would be a multi-week build):

- Apps Script backend: categories/subcategories, transaction CRUD, monthly
  summary aggregation
- React PWA: Add Transaction (fast entry form), Transactions list with
  filtering, Dashboard with monthly summary + category breakdown chart
- iOS Shortcut setup instructions

Not built yet, straightforward to add on this same foundation later: Budgets,
Recurring/Subscriptions, Goals, Investments, Net Worth, Merchants,
multi-account reconciliation, yearly reports, AI layer. Each is the same
pattern — a new sheet/tab, a new Apps Script action, a new React feature
folder — so the architecture doesn't change to add them.
