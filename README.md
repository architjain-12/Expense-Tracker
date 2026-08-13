# Expense Tracker PWA

A mobile-first, local-first personal finance web app built with React + TypeScript + IndexedDB (Dexie). Google Sheets is an optional reporting/backup layer.

## Architecture

```text
React UI
  ↓
Application/services
  ↓
IndexedDB (Dexie) — local source of truth
  ├── Transactions
  ├── Accounts
  ├── Categories/Subcategories
  ├── Budgets
  ├── Recurring rules
  ├── Investments
  ├── Interest accounts + projected income
  └── Saved reports
       ↓ optional
Google Apps Script → Google Sheets

Future:
React → repository/data provider → Spring Boot → PostgreSQL
```

## Main features

- Fast transaction recording from the bottom `+` button.
- Current-month transaction ledger with arrow month navigation, filters and date grouping.
- Categories and optional subcategories, including quick creation from Add Transaction.
- Default account and classification defaults.
- Recurring payments with edit/delete, multiple frequencies and automatic-entry markers.
- Budget progress and estimated recurring dues on Home.
- Investments shown in the main ledger plus investment reporting.
- Income reporting including recorded interest income.
- Stats with monthly/yearly modes, vertical pie/line charts, multi-select filters and saved reports.
- FD/RD/savings interest calculator and projected interest income for planning.
- Face ID/WebAuthn or PIN local app lock.
- Light/dark/system theme.
- JSON restore backup plus CSV and Excel-compatible `.xls` reporting export.
- Clear/reset IndexedDB from Settings.
- Optional Google Sheets sync/restore.

## Local development

```bash
npm ci
npm run dev
```

Open the Vite URL shown in the terminal.

Build:

```bash
npm run build
```

If npm reports a missing native optional dependency after moving `node_modules` between machines, delete `node_modules` and run `npm ci` again.

## Google Sheets setup

1. Create a Google Sheet.
2. Open **Extensions → Apps Script**.
3. Copy `google-apps-script/Code.gs` into the Apps Script project.
4. Set `SHEET_ID` to the ID from the Google Sheet URL.
5. Set `SYNC_TOKEN` to a long random secret.
6. Deploy as **Web app**, execute as you, and allow the required access.
7. Copy the `/exec` URL into the app under **Options → Settings → Google Sheets**.
8. Enter the same token and press **Save connection**.
9. Press **Sync** to upload local queued changes or **Fetch from Sheet** to restore data.

The script creates/uses these sheets automatically:

`Transactions`, `Accounts`, `Categories`, `RecurringRules`, `Budgets`, `Investments`, `InterestAccounts`, `ProjectedIncome`, `SavedReports`.

## Data model / future backend

Do not treat Google Sheets as the transactional database. IndexedDB remains the local source of truth. The app's services/repositories are deliberately kept separate from the UI so a future Spring Boot/PostgreSQL provider can be added without rewriting the screens.

## Backup note

JSON is the complete restore format. CSV and Excel-compatible `.xls` are intended for reporting. A browser/PWA cannot reliably wake itself up at an arbitrary time and silently write to iOS Files, so scheduled native backup is intentionally not faked into the web app.
