# Detailed setup guide

## 1. Install Node.js

Install Node.js LTS.

Verify:

```bash
node --version
npm --version
```

## 2. Install the project

```bash
cd expense-tracker
npm install
npm run dev
```

Open the URL printed by Vite.

> Development environments may report that `crypto.randomUUID` is unavailable. This project intentionally uses `src/utils/id.ts`, which falls back to `crypto.getRandomValues()` and a timestamp/random ID, so local development does not depend on `crypto.randomUUID()`.

## 3. Understand the first screen

The application starts with Home.

Primary action:

```text
Home → + Add Transaction
```

The app stores the transaction in IndexedDB before any cloud operation.

## 4. Categories and subcategories

Open:

```text
Options → Categories
```

A top-level category is created by leaving `Parent category` empty.

A subcategory is created by selecting its parent.

The initial category tree contains:

- Housing: Rent, Maintenance/Society Fees, Electricity, Water, Gas, Internet, Mobile, Repairs
- Food & Dining: Groceries, Restaurants, Cafes, Office, Food Delivery, Snacks
- Transportation: Fuel, Metro/Public Transport, Taxi/Ride Sharing, Parking, Toll, Vehicle Maintenance
- Shopping: Clothing, Electronics, Online Shopping, Gifts, Other Shopping
- Health: Doctor, Pharmacy, Diagnostics, Health Insurance, Fitness
- Personal: Personal Care, Salon/Grooming, Hobbies, Education/Courses
- Entertainment: Movies, Streaming, Events, Sports/Recreation
- Travel: Flights, Hotels, Local Transport, Travel Food, Activities
- Family: Parents, Children, Family Support, Family Events
- Financial: Bank Charges, Credit Card Fees, Loan Interest, Taxes, EMI
- Investments: Stocks, Mutual Funds, SIP, Fixed Deposits, Gold, Retirement/PF
- Income: Salary, Bonus, Freelance, Interest, Dividends, Refund, Other Income
- Miscellaneous: Uncategorized, Other

## 5. Transaction entry

The fastest path is:

```text
Add Transaction
→ amount
→ account
→ category
→ optional subcategory
→ Record
```

The app defaults the account from Settings.

Date/time defaults to the current date and time.

Merchant and notes use up to five historical suggestions.

Needs/Wants, Essential/Discretionary and Fixed/Variable are not required on the add screen; defaults can be configured under:

```text
Options → Settings → Transaction defaults
```

## 6. Transactions and Stats

Transactions default to the current full month.

Use filters for:

- month
- all / expense / income / recurring
- category
- subcategory
- account
- merchant/note search

For analytics:

```text
Options → Statistics
```

or the `Stats` bottom navigation item.

The Home pie chart is clickable. Selecting a category opens the transaction list filtered to that category and month.

## 7. Recurring payments

Open:

```text
Options → Recurring Payments
```

Create rules for:

- subscriptions
- EMI
- RD
- rent
- insurance
- SIP
- other scheduled payments

The browser does not need to be open at the exact due time. On app start/resume, due rules are processed and normal transactions are generated.

Recurring transactions carry:

```text
source = RECURRING
recurringRuleId = rule id
```

and display a `↻` marker.

## 8. Budgets

Open:

```text
Options → Budgets
```

Budgets are optional and do not clutter Home when unused.

## 9. Investments

Open:

```text
Options → Investments
```

Track:

- Stocks
- Mutual Funds
- SIP
- Fixed Deposits
- Gold
- Retirement/PF
- other investment activity

Investments are intentionally separate from everyday expenses.

## 10. iOS Shortcut automation

Create an iCloud Drive folder:

```text
iCloud Drive/
└── ExpenseTracker/
    └── Automation/
        └── transaction-queue.ndjson
```

The Shortcut appends one JSON object per line.

Example:

```text
{"externalId":"demo-1","source":"IOS_SHORTCUT","type":"EXPENSE","amount":649,"currency":"INR","merchant":"Netflix","accountHint":"HDFC Credit Card","transactionDateTime":"2026-08-12T00:05:00+05:30","rawMessage":"INR 649 spent at Netflix"}
```

Then in the PWA:

```text
Options → Review Queue
→ Sync Automation
→ choose transaction-queue.ndjson
```

New records enter the Review Queue and do not affect normal reports until recorded.

## 11. Google Sheets setup

See:

```text
google-apps-script/README.md
```

Create a private Google Spreadsheet.

Deploy the Apps Script as a Web App.

Enter the deployed URL and token under:

```text
Options → Settings → Google Sheets
```

The app supports:

- incremental transaction sync
- category/account/rule/budget/investment sync
- Google Sheet restore
- smart restore on an empty local database when a valid connection already exists

If the local database is empty and no connection is configured, Home provides a recovery prompt that takes you to the Google Sheets settings.

## 12. Backup and recovery

Use:

```text
Options → Settings → Backup & recovery
```

Export JSON regularly.

If IndexedDB is cleared:

1. Open the app.
2. If Google Sheets was configured, the app attempts a silent restore.
3. If it was not configured, Home shows a recovery prompt.
4. Enter the Apps Script URL and token.
5. Press `Restore from Sheets`.

## 13. Device lock

Open:

```text
Options → Settings → Device lock
```

You can use:

- PIN
- Passkey / platform authenticator

On supported iPhones, a passkey may use Face ID, device passcode, or a password-manager passkey.

This is a local lock for the browser/PWA data. It is not a server-backed login system.

## 14. iPhone web-zoom fix

On iPhone Safari, inputs below 16px can trigger automatic zoom.

The mobile stylesheet therefore uses at least 16px for normal form controls while keeping the large amount field intentionally larger.

## 15. GitHub Pages

Push the repository to GitHub.

Enable:

```text
Repository → Settings → Pages → Source: GitHub Actions
```

The included workflow builds and deploys the Vite app.

## 16. Final production checks

Before using real financial data, test:

- add/edit/delete
- category/subcategory selection
- category customization
- default account
- automation import
- duplicate automation import
- recurring generation
- budgets
- investment records
- stats filters
- Home category drill-down
- JSON backup/restore
- Google Sheets sync
- Google Sheets restore
- offline operation
- iPhone Safari
- desktop Chrome
- PWA reopening after device restart
