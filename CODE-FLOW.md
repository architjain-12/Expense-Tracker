# How the React code connects — beginner guide

You do not need to know React to follow this project.

## 1. Start with `src/main.tsx`

This is the browser entry point.

```text
index.html
   ↓
src/main.tsx
   ↓
src/app/App.tsx
```

`main.tsx` mounts React into the `<div id="root">` in `index.html`.

It also registers the PWA service worker.

## 2. `src/app/App.tsx`

This sets up routing.

```text
/                → Home
/transactions    → Transactions
/add             → Add Transaction
/review          → Review Queue
/stats           → Statistics
/categories      → Categories
/recurring       → Recurring Payments
/budgets         → Budgets
/investments     → Investments
/options         → Options
/settings        → Settings
```

It also runs startup work:

```text
ensureSeedData()
processDueRecurringTransactions()
restoreFromGoogleSheetsIfEmpty()
```

## 3. `src/components/Layout.tsx`

This creates the navigation around every page.

Desktop:

```text
Sidebar
   ↓
Page content
```

Mobile:

```text
Page content
   ↓
Fixed five-button navigation
```

The five mobile buttons are:

```text
Home | Transactions | + | Stats | Options
```

## 4. A page

Example:

```text
src/pages/AddTransaction.tsx
```

It displays form fields and calls a service when Save is pressed.

It should NOT directly contain complex IndexedDB logic.

## 5. Services

Example:

```text
src/services/transactionService.ts
```

This is where business rules live.

When the Add Transaction page calls:

```text
createTransaction(...)
```

that service creates the object and writes it into IndexedDB.

## 6. IndexedDB

`src/db/database.ts` defines the tables.

Dexie creates a browser database called:

```text
ExpenseTrackerDB
```

Important tables:

```text
transactions
categories
accounts
recurringRules
reviewQueue
budgets
investments
syncQueue
settings
```

## 7. Live UI updates

The hooks in `src/hooks/useDb.ts` use Dexie's `useLiveQuery`.

Example:

```text
IndexedDB changes
      ↓
useTransactions()
      ↓
Component rerenders
```

This is why you usually do not need to call a manual refresh after saving a transaction.

## 8. Repository layer

`src/db/repositories.ts` contains simple database access functions.

It keeps storage code separate from React UI.

That makes it possible to replace IndexedDB later if needed.

## 9. Sync

Local changes create `syncQueue` items.

```text
Transaction saved
      ↓
IndexedDB transaction
      ↓
syncQueue item
      ↓
Google Sheets sync later
```

This is why offline operation works.

## 10. Automation

The iOS Shortcut creates NDJSON.

```text
iOS Shortcut
      ↓
transaction-queue.ndjson
      ↓
Review → Sync Automation
      ↓
automationService.ts
      ↓
reviewQueue
      ↓
Record
      ↓
transactionService.ts
      ↓
transactions
```

## 11. Recurring transactions

`recurringService.ts` checks active recurring rules whenever the app starts/resumes.

```text
Recurring rule due
      ↓
createTransaction()
      ↓
source = RECURRING
      ↓
normal transaction
```

The UI shows a `↻` marker for that transaction.

## 12. Why `crypto.randomUUID()` was replaced

Some local development contexts do not expose `crypto.randomUUID()`.

The project now uses:

```text
src/utils/id.ts
```

which falls back to `crypto.getRandomValues()` or a timestamp/random value.

This makes local development more forgiving.

## 13. Google Sheets restore

The restore path is:

```text
Settings
   ↓
Restore from Sheets
   ↓
googleSheetsService.ts
   ↓
Google Apps Script
   ↓
Google Sheets
   ↓
IndexedDB
```

If a valid Google Sheets connection already exists, the app can also attempt a restore automatically when the local transaction table is empty.

## 14. Device lock

`src/services/authService.ts` contains the local lock helpers.

`AppLockGuard.tsx` checks the setting before showing the application.

The two options are:

```text
PIN
or
Passkey / platform authenticator
```

The passkey path is intended as a device-local convenience lock. Full identity authentication would require a server to verify WebAuthn assertions.
