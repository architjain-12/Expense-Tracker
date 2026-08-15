# Phase 0 — v2.4.0 Baseline Inspection

## Supplied source

`Expense-Tracker-v2.4.0(2).zip`

## Confirmed implementation areas

- React + TypeScript + Vite PWA
- Dexie/IndexedDB
- repository layer in `src/db/repositories.ts`
- financial services in `src/services/`
- Google Apps Script / Google Sheets integration
- sync queue
- local PIN/passkey lock
- automation NDJSON import
- recurring transaction generation
- reports/statistics/investments/deposits
- personal/demo IndexedDB partitions

## Current persistence entities

`transactions`, `accounts`, `categories`, `recurringRules`, `reviewQueue`, `budgets`, `investments`, `interestDeposits`, `syncQueue`, `settings`.

## Current architectural strengths

- Local-first transaction path.
- Existing repository/service separation.
- Existing sync queue provides a useful starting point for future outbox semantics.
- Stable IDs and created/updated timestamps are already present on major entities.
- Soft deletion exists on transactions.
- Google Sheets recovery already exists as a transitional mechanism.

## Current gaps relevant to Phase 0 target

- No private server/PostgreSQL implementation.
- Google Sheets remains the current remote store.
- Backup is currently direct JSON export/import rather than a durable archive format.
- Backup is not currently encrypted.
- Restore does not yet implement the required safety snapshot/validation workflow.
- Current scheduling is necessarily foreground/open-app driven.
- Current local authentication is not server authentication.
- Sync model is not yet designed for multi-device server synchronization/conflict semantics.
- PC is not yet explicitly separated as a read-only client at the architectural level.

## Version metadata observation

The supplied `package.json` reports version `2.3.0`. This is inconsistent with the supplied v2.4.0 project label. This is recorded only as a Phase 0 finding and should be corrected during an approved implementation change.

## Phase 0 implementation rule

No runtime source files were intentionally modified as part of this Phase 0 baseline/design work.
