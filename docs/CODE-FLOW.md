# React code flow for a beginner

You do not need to understand React before running this project. Use this mental model:

```text
A screen is a Component.
A button click calls a Service.
A Service changes IndexedDB.
A Hook watches IndexedDB.
React redraws the screen.
```

## Example: Add a transaction

```text
User taps "Record"
        |
        v
AddTransaction.tsx
        |
        | save()
        v
transactionService.ts
        |
        | createTransaction()
        v
Dexie database.ts
        |
        | db.transactions.put(...)
        v
IndexedDB
        |
        | database changed
        v
useLiveQuery() in useDb.ts
        |
        v
React rerenders
        |
        v
Transaction appears on screen
```

## Example: Review Queue

```text
iOS Shortcut creates NDJSON
        |
        v
User opens React app
        |
        v
ReviewQueue.tsx
        |
        | choose file
        v
automationService.ts
        |
        | parse each line
        v
IndexedDB.reviewQueue
        |
        v
Review Queue screen updates
```

## Example: Recurring payment

```text
App starts
    |
    v
App.tsx Bootstrap
    |
    v
processDueRecurringTransactions()
    |
    v
recurringRules table
    |
    | rule is due
    v
createTransaction()
    |
    v
transactions table
```

## Example: Google Sheets sync

```text
Settings → Sync Now
        |
        v
googleSheetsService.ts
        |
        v
syncQueue table
        |
        v
HTTP POST
        |
        v
Google Apps Script
        |
        v
Google Sheets
```

## What React means in this project

React's main job is deciding **what the screen looks like** based on current data and user actions.

It is not the database.
It is not the Google Sheets server.
It is not the iOS Shortcut.

Those responsibilities are intentionally separated.
