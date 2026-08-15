# Phase 0 — Target Architecture & Migration Plan

Status: **DESIGN ONLY — v2.4.0 baseline**

This document defines the approved-direction architecture for the Expense Tracker. It does not change runtime behavior.

## 1. Product objective

Expense Tracker is a lifetime personal financial ledger designed to be:

- mobile-first;
- offline-first;
- transaction-first;
- private by default;
- recoverable after device loss;
- usable on PC primarily for read-only analysis/reporting;
- capable of supporting 2–5 independent users;
- deployable at ₹0 initially;
- evolvable to a private/server-backed multi-device system without rewriting the financial domain.

The highest architectural requirement is **financial data durability**: losing the device, browser storage, application, or repository must not imply losing the financial history.

## 2. Current v2.4.0 baseline

Current runtime architecture:

```text
React PWA
   |
Application/services
   |
Dexie
   |
IndexedDB
   |
+-------------------+
|                   |
Reports          syncQueue
                    |
              Google Apps Script
                    |
              Google Sheets
```

Current IndexedDB contains transactions, accounts, categories, recurring rules, review queue, budgets, investments, interest deposits, sync queue and settings.

The current code already has useful repository/service boundaries and a sync queue. These are retained as migration foundations.

Important baseline observations:

1. IndexedDB is currently the operational source of truth for the UI.
2. Google Sheets is currently both a synchronization/recovery mechanism and an external data store.
3. `syncQueue` is currently shaped around entity-level CREATE/UPDATE/DELETE operations and can become the basis of a future sync outbox.
4. Local passkey/PIN is a device-local lock, not server authentication.
5. Current JSON backup is application-oriented and unencrypted; it must evolve into a durable, independently recoverable archive.
6. Current JSON import must evolve to validate and safety-backup existing data before restore.
7. A browser/PWA cannot be assumed to wake itself at an exact scheduled time on iOS.
8. The current package metadata reports `2.3.0` even though this supplied codebase is the v2.4.0 baseline. Version metadata must be corrected during a future implementation phase, not silently changed during Phase 0.

## 3. Target architecture

```text
                         MOBILE / PRIMARY
                  +---------------------------+
                  |        React PWA           |
                  | transaction entry         |
                  | automation/review          |
                  | reports                    |
                  +-------------+-------------+
                                |
                           Local domain
                           services/API
                                |
                           IndexedDB
                         local operational DB
                                |
              +-----------------+------------------+
              |                 |                  |
              v                 v                  v
       Local backup       Sync outbox         Export/archive
              |                 |                  |
              v                 v                  v
       Device file       Optional private     Portable encrypted
       storage           server sync          archive
                              |                  |
                              v                  v
                         Spring Boot         Google Drive /
                              |               other storage
                         PostgreSQL
                              |
                              v
                    PC read-only PWA/client
```

The local database remains the primary working store. Network access is a synchronization/backup capability and must never be required to record a transaction.

## 4. Separation of concerns

Target application boundaries:

```text
UI
  -> Application services
      -> Domain/financial logic
          -> Repository interfaces
              -> IndexedDB adapter
              -> Future remote/sync adapter
```

React components must not become dependent on the future server API directly.

The domain must remain usable with no network.

## 5. Backup vs synchronization

These are separate subsystems.

### Backup
Purpose: recover from loss/corruption.

Properties:
- point-in-time snapshot;
- independently restorable;
- versioned;
- integrity checked;
- portable;
- optionally encrypted;
- does not depend on the server being online.

### Synchronization
Purpose: make the same dataset available across trusted devices.

Initial implementation:
- manual/eventual synchronization;
- mobile remains the only write-capable client;
- PC is read-only;
- no real-time infrastructure required.

## 6. Target backup topology

For the primary user, aim for independent copies:

```text
                 ACTIVE
               IndexedDB
                   |
       +-----------+-----------+
       |           |           |
       v           v           v
   Local file   Private DB   Cloud archive
   backup       PostgreSQL   encrypted
                               |
                            Google Drive

        Optional manual emergency copy:
        download / share / email / external disk
```

The remote PostgreSQL database is not the only backup.

## 7. Long-Term Financial Archive

A long-term archive must survive the Expense Tracker application itself.

Requirements:

- documented open data representation;
- UTF-8 JSON as canonical structured representation;
- CSV transaction representation for universal readability;
- explicit schema version;
- manifest;
- transaction/entity counts;
- timestamps;
- integrity checksum;
- standard authenticated encryption for encrypted archives;
- independently documented recovery procedure;
- recovery key independent of application authentication;
- no requirement for the original React application to decrypt or parse the archive.

The transaction dataset is the highest-priority survival layer.

## 8. Archive layers

Conceptually:

```text
ExpenseTracker-YYYY-MM-DD.etarchive
|
+-- manifest
+-- schema version
+-- transactions.json
+-- transactions.csv
+-- accounts.json
+-- categories.json
+-- recurring-rules.json
+-- investments.json
+-- deposits.json
+-- budgets.json
+-- settings/metadata.json
+-- checksums
```

For encrypted remote storage, the portable archive is encrypted as a complete container. The exact container/header format is specified separately in `BACKUP-FORMAT-SPEC.md`.

## 9. Backup schedule behavior

Because iOS/PWA background execution cannot be assumed, the application will use a best-effort schedule:

1. Store the configured backup interval/time.
2. On app open/resume, evaluate whether a backup is due.
3. If overdue, generate a backup and present the appropriate action.
4. Track local backup creation separately from remote upload success.
5. Never report a remote backup as successful when only a local export was created.

Future native/background capabilities may improve automation but are not a prerequisite for the architecture.

## 10. Restore safety

Restore must be transactional and defensive:

```text
Select archive
  -> inspect manifest
  -> validate format/schema
  -> verify checksum
  -> decrypt if required
  -> preview counts/date range
  -> create safety snapshot of current data
  -> restore
  -> verify restored counts/integrity
```

An import must never silently delete the current working dataset.

## 11. Authentication and security direction

Initial server model: **authenticated private server with normal database storage**.

This is deliberately simpler than end-to-end encrypted server storage.

The architecture must keep the data access boundary clean enough that stronger client-side encryption can be introduced later.

Local PIN/passkey remains a device-local convenience/security control until server authentication is introduced.

## 12. Multi-user model

Each user is independent.

Target conceptual model:

```text
User
  -> Personal workspace/data namespace
      -> transactions
      -> accounts
      -> categories
      -> budgets
      -> recurring rules
      -> investments
      -> deposits
      -> reports/settings
```

No cross-user reporting or data sharing is required.

Server-side data must be tenant/user scoped from the beginning when introduced.

## 13. Device model

Primary write device: iPhone/mobile PWA.

PC:
- read-only initially;
- reporting/analysis/visualization;
- manual sync;
- export/backup access;
- transaction recording is intentionally excluded from the initial synchronization model.

Future multi-device restoration:

```text
New device
  -> authenticate
  -> obtain latest server snapshot/changes
  -> rebuild IndexedDB
  -> verify
  -> continue offline
```

## 14. Cost strategy

Initial target: ₹0/month.

Development and first deployment should permit Spring Boot + PostgreSQL to run locally/on an available trusted machine.

The server interface must remain deployment-independent so it can later move to:
- a low-cost VPS;
- a self-hosted machine;
- another private environment.

Real-time sync is not a Phase 1 requirement.

## 15. Google Sheets role

Google Sheets should gradually stop being the authoritative data store.

During migration it remains useful for:
- existing v2 recovery;
- transitional sync;
- exports/reporting where useful.

Future authoritative persistence:

```text
IndexedDB <-> Sync API <-> PostgreSQL
```

Google Sheets becomes an optional integration/export rather than the database.

## 16. Migration roadmap

### v2.4.x
Finish and stabilize current financial functionality. No backend rewrite.

### v2.5
Backup and disaster recovery:
- portable archive;
- encryption/recovery key;
- local backup;
- cloud backup;
- validation/checksum;
- safe restore;
- backup health state.

### v2.6
Architectural hardening:
- repository interfaces;
- domain/application service boundaries;
- storage abstraction;
- stable IDs and timestamps;
- sync-ready metadata;
- no React-to-storage coupling.

### v3.0
Private backend:
- Spring Boot;
- PostgreSQL;
- authentication;
- user/tenant isolation;
- manual/eventual sync;
- server recovery snapshot.

### v3.1
Device recovery and synchronization:
- initial sync;
- incremental sync;
- outbox/inbox;
- idempotency;
- deletion/tombstone handling;
- recovery flow.

### v3.2
PC read-only reporting client.

### v3.3
Multi-user rollout for 2–5 independent users.

### Later
Optional automatic sync, native iOS capabilities, deeper Shortcuts integration, widgets/notifications, stronger client-side encryption and advanced wealth/tax features.

## 17. Non-goals

The following are explicitly not required now:

- native iOS rewrite;
- real-time synchronization;
- PC transaction editing;
- public/commercial multi-tenant SaaS;
- mandatory cloud hosting;
- replacing IndexedDB as the mobile working database;
- end-to-end encrypted server storage in the first backend release.

## 18. Phase 0 exit criteria

Phase 0 is complete when:

- target architecture is documented;
- backup and archive requirements are documented;
- sync responsibilities are separated from backup;
- future user/device model is documented;
- migration path is documented;
- current v2.4.0 implementation has been inspected against the target;
- no functional implementation changes have been made without explicit approval.
