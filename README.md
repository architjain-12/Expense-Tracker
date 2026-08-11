# Personal Finance Tracker

A free-to-run, mobile-first expense tracker for a salaried individual in
India: Google Sheets as the database, a Google Apps Script Web App as the
(also free) backend/API, a React PWA for entry + reports, and an iOS
Shortcut for one-tap logging.

Read first: **`docs/ARCHITECTURE.md`** — explains the shape of the system
and the security tradeoff of the static-frontend + shared-token approach.

## Setup order

1. `google-apps-script/README.md` — deploy the backend (10 minutes).
2. `frontend/README.md` — run locally, then deploy free to GitHub Pages.
3. `ios-shortcut/IOS-SHORTCUT.md` — set up quick entry from your phone.

## Status

Phase 1 (this build): transactions, categories/subcategories, accounts,
monthly dashboard + category chart, web entry, Shortcut entry.

Phase 2 (not built yet, see `docs/ARCHITECTURE.md`): AI-assisted
categorization and natural-language reports, added as a small serverless
function alongside the same Apps Script API — no rearchitecture needed.

Also not built yet, same extension pattern each time: Budgets, Recurring
expenses, Subscriptions, Goals, Investments detail, Net Worth, Yearly
reports, Merchant management, in-app category editing (edit the Sheet
directly for now).
