
# VCS Changelog — TRACE Expense Tracker

## v2.4.1 — Phase 0

### Transaction Page — Manual Changes

* Updated Transaction page layout and spacing.
* Added collapsible transaction filters to maximize transaction-list space.
* Added transaction search and filter controls.
* Added monthly summary showing **Income, Budget, and Spent**.
* Changed Budget summary to show **Remaining / Overall Budget**.
* Added low-budget warning styling when remaining budget falls below **30%**.
* Reused existing Homepage monthly budget calculation logic.
* Fixed incorrect `useBudgets()` usage that could result in `NaN`.
* Added numeric handling for transaction amounts and budget values.
* Added remaining-budget and remaining-percentage calculations.
* Added Transaction-specific budget styling without modifying shared `.text-danger` behavior.
* Preserved existing global CSS and shared page styling.

### Recurring Engine — Manual Changes

* Updated recurring transaction processing logic.
* Corrected recurring transaction due-date calculation.
* Fixed recurring transactions being recorded more than once.
* Corrected recurring transaction handling for the current month.
* Improved estimated dues calculation from scheduled recurring transactions.
* Ensured recurring transactions appear in the review queue on their due date.
* Improved handling of recurring transaction dates and next-occurrence calculation.
* Corrected **bi-weekly recurring logic** to account for the appropriate day of the week.
* Improved recurring transaction categorization so generated transactions retain their category.
* Updated recurring transaction processing to prevent duplicate generated transactions.
* Improved handling of past-due recurring schedules so historical occurrences are not incorrectly generated.
* Ensured recurring transaction edits/deletions are reflected correctly in future processing.

### Phase 0 — Encrypted Backup & Recovery

* Introduced the **ETAR-1 encrypted archive format** for local backups.
* Added encrypted `.etarchive` backup export.
* Added AES-256-GCM encryption for backup contents.
* Added PBKDF2-SHA-256 password-based key derivation.
* Added per-backup random salt and IV.
* Added SHA-256 payload integrity checksum.
* Added archive manifest containing:

  * Archive format/version.
  * Application version.
  * Partition.
  * Entity counts.
  * Transaction date range.
  * Encryption metadata.
  * Integrity checksum.
* Added encrypted archive restore functionality.
* Added archive format and schema validation before restore.
* Added password/decryption validation.
* Added integrity verification before importing data.
* Added legacy JSON backup restore support.
* Added CSV transaction export.
* Added Excel-compatible transaction export.
* Added iPhone-compatible backup sharing through the Web Share API.
* Added desktop download fallback for backup files.
* Added `.etarchive` file selection support on iOS.
* Improved restore diagnostics and error reporting for mobile browsers.
* Added restore status messages during:

  * File selection.
  * File reading.
  * Archive validation.
  * Decryption.
  * Restore.
* Added safety-archive infrastructure for pre-restore protection.

### Backup — Device-Specific Data Protection

* Changed restore behavior so device-local security settings are **not blindly restored from another device**.
* Preserved local device lock settings during archive restore.
* Preserved local PIN-related data during restore.
* Preserved passkey-related data during restore.
* Prevented passkey credentials from being transferred through normal backup restoration.
* Prevented device-specific authentication configuration from locking the user out after restoring a backup on another device.
* Treated Google Sheets authentication credentials as device-local credentials rather than portable application data.
* Changed settings restoration to merge portable settings with preserved device-local settings.

### Data Partition

* Maintained separate **Personal** and **Demo** data partitions.
* Prevented master deletion of the Demo partition.
* Added **Restore Demo Data** instead of allowing destructive deletion of Demo data.
* Improved partition-aware backup creation.
* Added partition information to the archive manifest.
* Ensured backup/restore respects the active partition.

### Automatic Backup — Phase 0

* Added automatic backup configuration.
* Added configurable backup intervals:

  * Every 6 hours.
  * Every 24 hours.
  * Every 3 days.
  * Every 7 days.
  * Every 30 days.
* Added configurable automatic-backup start time/reference time.
* Added persisted automatic-backup settings.
* Added `lastAutoBackupSavedAt` tracking.
* Added detection of whether an automatic backup is due.
* Added automatic backup generation when the PWA is opened after the configured interval.
* Added persistent pending-backup storage so a generated backup is not lost if the UI state changes.
* Added a manual **Save backup** step because iOS does not allow a PWA to silently write arbitrary files into the user's Files storage.
* Added automatic-backup status messaging.
* Added last-backup timestamp display.
* Added separate controls for enabling/disabling automatic backup and selecting its frequency.
* Added explicit **Save backup settings** behavior so changing automatic-backup settings does not unintentionally reset them.
* Designed the automatic-backup flow around iOS PWA limitations rather than assuming background execution or silent filesystem access.

### Settings

* Expanded Settings to include:

  * Backup and recovery.
  * Automatic backup.
  * Data partitions.
  * Device lock.
  * Google Sheets.
  * Accounts.
  * Transaction defaults.
  * Appearance and reporting.
* Added clearer backup/recovery status messages.
* Added application/build information to Settings.
* Added TRACE branding/signature to the About section.

---

# v2.4.0

### Homepage / Budget

* Redesigned Homepage budget presentation.
* Added budget progress visualization.
* Added monthly spending summary.
* Added remaining-budget calculation.
* Added estimated savings calculation.
* Incorporated estimated recurring dues into the remaining-budget calculation.
* Removed Income as a primary Homepage metric.
* Changed the primary budget metric to represent the amount remaining after spending and estimated dues.
* Added budget warning behavior when spending approaches the budget threshold.
* Improved handling of monthly budget values.

### Transactions

* Continued the local-first transaction workflow.
* Improved transaction recording and categorization.
* Improved review-queue handling.
* Improved recurring transaction integration with the transaction list.
* Added/maintained support for transaction sources such as manual entry and automation/import flows.

### Statistics & Reporting

* Expanded Stats functionality.
* Added yearly reporting.
* Added trend charts.
* Added vertical line charts for spending trends.
* Added category filtering.
* Added multi-category selection.
* Added saved filters.
* Added collapsible/minimal filtering UI.
* Added reporting support for monthly and yearly views.
* Added net cash-flow reporting.
* Added savings reporting.
* Added estimated-dues reporting.
* Added reporting-year selection.
* Added support for Indian financial year reporting and calendar-year reporting.
* Improved category-based chart presentation.
* Improved pie-chart labels/hover information.

### Recurring Payments

* Added/editable recurring payment management.
* Added deletion of recurring payment rules.
* Improved recurring payment scheduling.
* Added support for recurring payment frequencies including:

  * Weekly.
  * Bi-weekly.
  * Monthly.
  * Quarterly.
  * Yearly.
* Improved estimated recurring dues.
* Added recurring-payment review workflow.
* Improved treatment of recurring transactions scheduled for the current month.
* Improved handling of recurring payments with past due dates.

### Accounts

* Expanded account management.
* Added support for multiple accounts.
* Added account types including:

  * Bank account.
  * Credit card.
  * Cash.
  * Wallet.
  * Investment.
  * Other.
* Added primary/default account support.
* Added credit-card statement day.
* Added credit-card payment due day.
* Improved account selection for transactions.

### Demo Data

* Added isolated Demo partition.
* Added demo dataset for testing/showcasing.
* Added ability to switch between Personal and Demo data.
* Added ability to restore Demo data to its original dataset.
* Prevented destructive master deletion of Demo data.

---

# v2.3

### Transaction Management

* Improved transaction entry workflow.
* Removed the Add Transaction button from the top-level transaction page where it was unnecessary.
* Improved transaction list presentation.
* Added/maintained monthly transaction views.

### Budget

* Added budget/remaining-budget visualization.
* Improved monthly budget calculations.
* Added budget progress indication.
* Improved remaining-budget presentation.

### Recurring Transactions

* Added editable recurring payments.
* Added deletable recurring payments.
* Added recurring-payment scheduling.
* Added current-month recurring-payment processing.
* Prevented historical recurring payments from being incorrectly regenerated.
* Improved recurring-payment due-date handling.
* Added recurring payments to the review workflow.

### Statistics

* Added multi-select category filtering.
* Added trend/line charts.
* Added yearly statistics.
* Improved statistics filtering.
* Added support for saved filters.
* Improved statistics presentation for mobile screens.

### UI / UX

* Improved mobile-first layout.
* Improved page spacing and information hierarchy.
* Avoided swipe-based navigation.
* Improved chart presentation and filtering controls.

---

# Earlier Releases / Foundation

### Local-First Architecture

* Established React + Vite PWA architecture.
* Established IndexedDB as the primary local data store.
* Designed the application around an offline/local-first model.
* Avoided requiring a dedicated application backend for normal operation.
* Added Google Sheets integration as an optional cloud sync/backup mechanism.
* Added Google Apps Script integration for synchronization.
* Designed the application primarily for iPhone/mobile-browser usage.
* Added PWA installation support.
* Configured GitHub Pages deployment.
* Added Vite base-path handling for GitHub Pages.
* Added PWA manifest and service-worker configuration.
* Added application version/build information.

### Google Sheets Sync

* Added Google Sheets synchronization.
* Added Apps Script endpoint configuration.
* Added sync token configuration.
* Added local storage of runtime sync configuration.
* Added manual sync.
* Added restore from Google Sheets.
* Added sync queue support.
* Added eventual-sync architecture rather than requiring real-time synchronization.

### Authentication / Device Lock

* Added local PIN-based device lock.
* Added WebAuthn/passkey support.
* Added Face ID/passkey support on compatible iOS devices.
* Added lock-method tracking.
* Added device-local authentication configuration.
* Added fallback PIN concept.
* Identified and addressed the distinction between:

  * Portable application data.
  * Device-specific authentication data.
  * Passkey credentials.
* Prevented backup restoration from blindly transferring device authentication credentials.

### Financial Features

* Added transaction categorization.
* Added categories and subcategories.
* Added Needs/Wants classification.
* Added Essential/Discretionary classification.
* Added Fixed/Variable classification.
* Added budgets.
* Added recurring payments.
* Added investments.
* Added FD/RD/interest-deposit tracking infrastructure.
* Added projected interest calculations.
* Added support for advanced financial reporting/tax-related calculations.

### Mobile / PWA

* Optimized the application for mobile browser usage.
* Added PWA support for iOS Safari/Chrome.
* Added offline-first behavior.
* Designed around IndexedDB persistence.
* Added responsive mobile UI.
* Added support for iOS file sharing through the native Share Sheet where supported.

---

# Post-v2.4.1 / Subsequent Releases

These should be kept as **planned/future-release entries**, rather than claiming they are already implemented.

## v2.4.2 — Planned

### Backup & Recovery Hardening

* Replace temporary hard-coded backup password with user-managed recovery password.
* Add secure backup-password creation/change flow.
* Add password confirmation during backup creation.
* Add recovery-password guidance without storing the password inside the application.
* Complete safety-archive handling before restore.
* Add stronger validation for incompatible archive versions.
* Add archive migration/versioning strategy.
* Improve recovery UX on iOS.
* Add clearer distinction between:

  * Backup generated.
  * Backup pending save.
  * Backup successfully handed to iOS Share Sheet.
  * Backup actually saved by the user.

### Automatic Backup

* Finalize automatic-backup persistence.
* Verify automatic backup across:

  * iPhone Safari.
  * Installed PWA.
  * Desktop browsers.
  * App reopen after long intervals.
* Verify pending backup survives page reload.
* Verify changing frequency does not unintentionally reset backup state.
* Verify custom backup start time.
* Add manual "Run backup now" functionality.
* Improve backup-due status presentation.

### Authentication

* Review complete passkey lifecycle:

  * Registration.
  * Login.
  * Disable.
  * Replacement.
  * Recovery.
  * Device migration.
* Require appropriate verification before disabling device protection.
* Add a proper passkey recovery mechanism.
* Ensure losing a device/passkey does not permanently lock the user out of their data.

---

# Future Phase — Backup Architecture

### Long-Term Recovery

* Define a stable, documented ETAR archive specification.
* Ensure archives remain recoverable independently of the current application version.
* Support archive schema migrations.
* Maintain backward compatibility with older ETAR archives.
* Document the archive format for long-term recovery.
* Ensure a backup created today can be recovered years later even after major application changes.
* Separate portable financial data from device-specific configuration permanently.

### Data Portability

* Portable:

  * Transactions.
  * Accounts.
  * Categories.
  * Recurring rules.
  * Budgets.
  * Investments.
  * Interest deposits.
  * Portable application preferences.

* Device-local:

  * PIN hashes.
  * Passkey credential identifiers/configuration.
  * Device lock state.
  * Device authentication configuration.
  * Local credentials/tokens where appropriate.
  * Pending local filesystem operations.

---