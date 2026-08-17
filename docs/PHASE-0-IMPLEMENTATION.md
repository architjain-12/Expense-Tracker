# Phase 0 — v2.4.1 Initial Implementation

## Implemented in this build

### 1. Encrypted local archive
- New `.etarchive` backup format based on the ETAR-1 design.
- AES-256-GCM authenticated encryption.
- Random salt and IV for every archive.
- Recovery password is independent of the app PIN/passkey.
- SHA-256 checksum over the canonical plaintext payload.
- Entity counts and transaction date range are recorded in the manifest.
- Transactions include a CSV representation inside the archive payload.
- Backup includes all current IndexedDB stores, including the sync queue.

### 2. Safe restore
- Archive format and encryption parameters are validated before restore.
- Integrity is checked before database mutation.
- A separate encrypted safety archive is generated before restore.
- Restore is performed inside one IndexedDB transaction.
- Existing v2.4.1 JSON backups remain importable through a legacy compatibility path.

### 3. Budget history
- Budgets are effective-period records.
- Changing a current budget closes the previous active record at the end of the previous period and creates a new record starting in the current period.
- Historical months are not rewritten.
- Overall and category budgets can coexist.
- Home and Transactions resolve the effective current budget.

### 4. Demo partition
- Demo no longer exposes Master Delete.
- Demo has Restore Demo Data, which resets it to the deterministic seed.
- Demo now covers twelve months with varied spending across multiple categories.
- Demo includes investment activity, recurring rules and monthly overall/category budget history.

## Known Phase 0 follow-up
- Replace the interim browser PBKDF2 profile with final Argon2id, or formally version the PBKDF2 profile if retained.
- Add automated cross-version archive fixtures and restore tests.
- Add backup retention policies and optional cloud archive destinations.
- Add explicit backup-due/last-backup state.
- Build an independent reference restore utility that does not depend on the React application.
