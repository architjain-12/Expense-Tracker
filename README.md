# Expense Tracker PWA

A dark, mobile-first personal expense tracker designed for iPhone Safari/Chrome and responsive desktop use.

## Final architecture

```text
React PWA
   ↓
Dexie / IndexedDB  ← primary local database
   ├── Transactions
   ├── Categories / Subcategories
   ├── Accounts
   ├── Review Queue
   ├── Recurring Rules
   ├── Budgets
   ├── Investments
   └── Settings

Optional sync/reporting:
IndexedDB → Google Apps Script → private Google Sheets

Automation:
iOS Shortcut → iCloud NDJSON → Sync Automation → Review Queue
```

The application does not require a running Spring Boot server or hosted database for daily use.

## What is implemented

- Transaction-first Home screen
- Fast expense/income entry with current date/time
- Default account selection that waits for IndexedDB to load correctly
- Full category + optional subcategory hierarchy
- Category/subcategory customization and archiving
- Frequently used categories first
- Merchant and note suggestions (top five historical matches)
- Current-month transaction screen by default
- Month switching
- Filtering by category, subcategory and account
- Dedicated Stats screen with filtered charts
- Clickable Home category pie chart → filtered transaction view
- Review Queue for iOS Shortcut automation
- NDJSON automation importer with duplicate protection
- Recurring subscriptions / EMI / RD / rent and other scheduled transactions
- Recurring transaction `↻` UI indicator
- Investment activity tracking
- Optional budgets
- Daily/monthly/category/account analytics
- JSON backup/restore
- Google Sheets sync and smart restore
- Empty-local-database recovery prompt
- Local device lock with PIN or WebAuthn/passkey where supported
- Responsive dark mobile-web and desktop UI
- GitHub Pages deployment workflow

## Important privacy model

The public GitHub Pages site contains application code only. Personal transaction data and runtime Google Sheets configuration are stored locally in IndexedDB.

A local device lock can prevent accidental entry on a device, including passkey/device authentication where supported.

The passkey feature is a **local device lock**, not a server-backed identity system. Full account authentication would require a trusted server to verify WebAuthn assertions.

## React beginner guide

Read these files in order:

1. `docs/CODE-FLOW.md`
2. `docs/ARCHITECTURE.md`
3. `docs/SETUP.md`

The essential flow is:

```text
Button / form
    ↓
React page
    ↓
Service
    ↓
Dexie repository/database
    ↓
IndexedDB
    ↓
useLiveQuery
    ↓
React rerenders
```

For example:

```text
AddTransaction.tsx
    ↓
createTransaction()
    ↓
db.transactions.put()
    ↓
IndexedDB
    ↓
useTransactions()
    ↓
TransactionList
```

## Setup

```bash
npm install
npm run dev
```

Then open the URL printed by Vite.

Production build:

```bash
npm run build
```

## Google Sheets

The React source never contains the personal Apps Script URL/token.

Configure them at runtime under:

```text
Options → Settings → Google Sheets
```

The Apps Script implementation is under:

```text
google-apps-script/Code.gs
google-apps-script/README.md
```

## iOS Shortcut automation

The intended V1 automation path is:

```text
Bank notification
    ↓
iOS Shortcut
    ↓
transaction-queue.ndjson in iCloud Drive
    ↓
Expense Tracker → Review → Sync Automation
    ↓
Review Queue
    ↓
Record / Discard
```

See the included Shortcut instructions in `docs/SETUP.md` and `docs/MOBILE-MOCKUPS.md`.


## Build troubleshooting

The project uses TypeScript declaration packages for React and Node. If a fresh clone reports errors such as `Cannot find a declaration file for module 'react'` or `Cannot find name 'process'`, make sure `npm install` has completed successfully. The project now uses `loadEnv()` in `vite.config.ts` rather than `process.env`.

Run:

```bash
npm install
npm run build
```

Do not use `vite build` alone to bypass TypeScript checks; the intended build is `tsc -b && vite build`.
