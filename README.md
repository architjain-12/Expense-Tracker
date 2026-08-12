# Expense Tracker PWA

A **mobile-first, offline-first personal expense tracker** built around React, TypeScript and IndexedDB. Google Sheets is an optional cloud reporting/backup layer. iOS Shortcuts can create an NDJSON automation inbox in iCloud Drive, which the app imports into a review queue.

The project is intentionally beginner-friendly: the code is separated so you can follow the flow from a button click to the database.

---

## 1. What you are getting

### Core app

- Dark responsive PWA
- Home screen focused on transaction recording
- Fast expense/income entry
- Current-month transaction list
- Search and filtering
- Transaction details
- Edit/delete
- Accounts
- Categories
- Frequent-category ordering
- Merchant suggestions
- Notes suggestions
- Review queue
- Recurring payments
- Current-month and six-month reports
- JSON backup/restore
- Offline operation through IndexedDB

### Automation design

- iOS Shortcut writes bank notification transactions to an NDJSON file in iCloud Drive.
- The web app has **Sync Automation** to import that file.
- Imported records stay in the Review Queue until you press **Record**.

### Cloud design

- Google Apps Script web app receives sync requests.
- Google Sheets stores a cloud-accessible transaction copy for reporting.
- Credentials are entered at runtime rather than committed to GitHub.

---

## 2. What React is doing here

Think of React as the **screen layer**.

```text
User taps button
      ↓
React component
      ↓
Service / business logic
      ↓
Repository / Dexie
      ↓
IndexedDB
```

For example, adding a transaction:

```text
AddTransaction.tsx
      ↓
createTransaction()
      ↓
db.transactions.put(...)
      ↓
IndexedDB
```

When the database changes:

```text
IndexedDB
   ↓
useLiveQuery()
   ↓
React component rerenders
   ↓
You see the new transaction
```

That is the most important React concept in this project.

---

## 3. What each folder does

### `src/pages/`

A page is a full screen.

Examples:

- `Home.tsx` → home page
- `Transactions.tsx` → transaction list
- `AddTransaction.tsx` → add form
- `ReviewQueue.tsx` → automation review
- `Reports.tsx` → analytics
- `Settings.tsx` → configuration

### `src/components/`

Reusable visual pieces.

Examples:

- `Layout.tsx` → navigation and page shell
- `TransactionList.tsx` → transaction list used by multiple pages
- `MetricCard.tsx` → metric card

### `src/db/`

IndexedDB/Dexie configuration.

- `database.ts` → database and table definitions
- `seed.ts` → initial demo accounts/categories
- `repositories.ts` → reusable database functions

### `src/services/`

Business logic.

- `transactionService.ts` → create/update/delete rules
- `automationService.ts` → import iOS NDJSON
- `recurringService.ts` → generate recurring transactions
- `reportingService.ts` → calculate analytics
- `googleSheetsService.ts` → cloud synchronization

### `src/hooks/`

React hooks that read live database data.

`useLiveQuery()` means the UI automatically reacts when IndexedDB changes.

### `src/types/`

TypeScript definitions for transaction/account/category/etc.

### `src/styles/`

The dark responsive design system.

---

## 4. Local setup

### Prerequisites

Install Node.js LTS.

Then verify:

```bash
node --version
npm --version
```

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run dev
```

Vite will print a local URL such as:

```text
http://localhost:5173/
```

Open it in your browser.

---

## 5. First thing to test

Open the app and go through this flow:

```text
Home
 ↓
Add Transaction
 ↓
Enter amount
 ↓
Select category
 ↓
Record
 ↓
Transactions
```

The transaction should appear immediately even with the network disconnected.

That proves IndexedDB is working.

---

## 6. How data is stored

The browser stores an IndexedDB database called:

```text
ExpenseTrackerDB
```

Tables include:

```text
transactions
accounts
categories
recurringRules
reviewQueue
budgets
syncQueue
settings
```

You can inspect IndexedDB from browser developer tools.

---

## 7. iPhone installation

For local testing you can open the application from a machine on the same network if the dev server is exposed.

For the production version:

1. Push the project to GitHub.
2. Enable GitHub Pages.
3. Use the included GitHub Actions workflow.
4. Open the resulting HTTPS URL in Safari.
5. Share → Add to Home Screen.

The application can then operate as a PWA.

---

## 8. iOS Shortcut automation

The application expects a newline-delimited JSON file like:

```text
transaction-queue.ndjson
```

Each line is one object:

```json
{"externalId":"abc123","source":"IOS_SHORTCUT","type":"EXPENSE","amount":649,"currency":"INR","merchant":"Netflix","accountHint":"HDFC Credit Card","transactionDateTime":"2026-08-12T00:05:00+05:30","rawMessage":"INR 649 spent at Netflix"}
```

Store it in:

```text
iCloud Drive/
  ExpenseTracker/
    Automation/
      transaction-queue.ndjson
```

Then open the app:

```text
Review → Sync Automation
```

Choose the file.

The app imports new records into the Review Queue.

Nothing is recorded until you press **Record**.

---

## 9. Recurring payments

Go to:

```text
More → Recurring Payments
```

Create a rule such as:

```text
Netflix
₹649
Monthly
12th
HDFC Credit Card
```

The app checks due rules when it starts/resumes.

The generated transaction has:

```text
source = RECURRING
recurringRuleId = <rule id>
```

The UI shows a small `↻` marker.

Important: a browser/PWA cannot be relied on to execute JavaScript at exactly midnight while fully closed. The recurring engine therefore catches up whenever the app starts/resumes.

---

## 10. Google Sheets setup

See:

```text
google-apps-script/README.md
```

High-level flow:

```text
React
 ↓
IndexedDB
 ↓
Sync Queue
 ↓
Google Apps Script
 ↓
Google Sheets
```

Google Sheets is not the local application database.

---

## 11. Google Sheets credentials

Do not put your personal values in:

```text
src/
.env committed to Git
Code.gs in Git
```

Enter personal Google Sheets configuration at runtime.

Treat a client-side sync token as a credential, not as a secure vault item. IndexedDB prevents accidental publication in the repository, but it does not protect against malicious same-origin JavaScript.

---

## 12. GitHub Pages deployment

The included workflow is:

```text
.github/workflows/deploy.yml
```

It does:

```text
Push to main
 ↓
Install dependencies
 ↓
Build
 ↓
Copy index.html → 404.html
 ↓
Upload Pages artifact
 ↓
Deploy
```

The repository-name base path is passed automatically as:

```text
VITE_BASE_PATH=/<repository-name>/
```

---

## 13. Beginner React flow example

### Add Transaction page

`AddTransaction.tsx` contains the form.

When you press Record:

```text
onClick={save}
   ↓
save()
   ↓
createTransaction(...)
```

`createTransaction()` lives in:

```text
src/services/transactionService.ts
```

It validates the amount, creates a UUID, builds the transaction object and stores it in:

```text
src/db/database.ts
```

using Dexie:

```text
db.transactions.put(transaction)
```

It also creates a sync queue item.

Then the Home/Transactions screens use:

```text
src/hooks/useDb.ts
```

which uses `useLiveQuery()`.

So the new record automatically appears in the UI.

---

## 14. How the pages connect

```text
main.tsx
   ↓
App.tsx
   ↓
Layout.tsx
   ↓
React Router
   ├── Home.tsx
   ├── Transactions.tsx
   ├── AddTransaction.tsx
   ├── ReviewQueue.tsx
   ├── Reports.tsx
   ├── Recurring.tsx
   └── Settings.tsx
```

And data flows independently:

```text
Pages
 ↓
Hooks / Services
 ↓
Repositories / Dexie
 ↓
IndexedDB
```

---

## 15. How reporting works

The current version calculates reports directly from IndexedDB.

Example:

```text
transactions
 ↓
reportingService.ts
 ↓
calculateSummary()
 ↓
Reports.tsx
 ↓
Recharts
```

So reports do not require Spring Boot or Google Sheets.

---

## 16. Backup

Settings provides:

```text
Export JSON backup
Restore JSON backup
```

The backup contains the local data tables.

Keep periodic backups while the application is being developed.

---

## 17. Current milestone

This repository implements the first functional milestone:

- local-first IndexedDB database
- dark responsive UI
- Home
- Add Transaction
- Transactions
- transaction details
- edit/delete
- Review Queue
- NDJSON automation import
- recurring payment rules
- reports
- settings
- JSON backup/restore
- PWA configuration
- Google Sheets service abstraction
- GitHub Pages workflow

Google Apps Script needs to be deployed/configured separately before cloud sync becomes operational.

---

## 18. Next development milestones

Recommended order:

1. Run and test local transaction flow.
2. Test on iPhone Safari.
3. Add actual iOS Shortcut NDJSON generation.
4. Configure Google Apps Script and Sheets.
5. Test cloud sync.
6. Expand Reports.
7. Add category/subcategory management screens.
8. Improve recurring payment editing and missed-occurrence rules.
9. Add import/export CSV/Excel.
10. Add AI categorization later.
