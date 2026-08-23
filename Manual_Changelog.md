# VCS Changelog — TRACE Expense Tracker

### v2.4.2 — Pending Recovery Improvements

The following work is **not yet implemented** and remains planned for v2.4.2.

#### Passkey / Face ID Recovery

* Review the complete passkey lifecycle:
  * Registration.
  * Login.
  * Disable.
  * Replacement.
  * Recovery.
  * Device migration.
* Require appropriate verification before disabling device protection.
* Prevent unauthorised disabling of the active passkey/device-lock method.
* Add a proper recovery mechanism for situations where the passkey is lost or unavailable.
* Define a recovery path that does not depend exclusively on the existing passkey.
* Support secure re-registration/replacement of a passkey after successful recovery.
* Ensure recovery does not expose or transfer device-specific authentication credentials through normal backup restoration.
* Ensure losing a device or passkey does not permanently lock the user out of their locally restored financial data.
* Review the interaction between PIN fallback, passkeys, backup passwords and device migration.
* Clearly separate:
  * Backup encryption password.
  * Device unlock PIN.
  * Passkey/WebAuthn credential.
  * Data-recovery mechanism.

## v2.4.2 — Phase 0 — Implemented

### Encrypted Backup & Recovery Foundation

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

### Automatic Backup — Phase 0

* Added automatic backup configuration.
* Added configurable automatic-backup intervals:
  * Every 6 hours.
  * Every 24 hours.
  * Every 3 days.
  * Every 7 days.
  * Every 30 days.
* Added configurable automatic-backup start/reference time.
* Added persisted automatic-backup settings.
* Added `lastAutoBackupSavedAt` tracking.
* Added automatic-backup-due detection.
* Added automatic backup generation when the PWA is opened after the configured interval.
* Added persistent pending-backup storage.
* Added a manual **Save Backup** step because iOS does not allow a PWA to silently write arbitrary files to the user's Files storage.
* Added automatic-backup status messaging.
* Added last-backup timestamp display.
* Added separate controls for enabling/disabling automatic backup and selecting its frequency.
* Added explicit **Save Backup Settings** behavior.
* Designed the automatic-backup flow around iOS PWA limitations rather than assuming background execution or silent filesystem access.

### Device-Specific Data Protection

* Changed restore behavior so device-local security settings are not blindly restored from another device.
* Preserved local device-lock settings during archive restore.
* Preserved local PIN-related data during restore.
* Preserved passkey-related data during restore.
* Prevented passkey credentials from being transferred through normal backup restoration.
* Prevented device-specific authentication configuration from locking the user out after restoring a backup on another device.
* Treated Google Sheets authentication credentials as device-local credentials rather than portable application data.
* Changed settings restoration to merge portable settings with preserved device-local settings.

### Data Partitions

* Maintained separate **Personal** and **Demo** data partitions.
* Added partition information to the archive manifest.
* Made backup and restore partition-aware.
* Prevented master deletion of the Demo partition.
* Added **Restore Demo Data** instead of destructive Demo deletion.
* Improved Demo data restoration.

### Settings

* Expanded Settings to include:
  * Backup and Recovery.
  * Automatic Backup.
  * Data Partitions.
  * Device Lock.
  * Google Sheets.
  * Accounts.
  * Transaction Defaults.
  * Appearance and Reporting.
* Added clearer backup/recovery status information.
* Added application/build information.
* Added TRACE branding/signature to the About section.