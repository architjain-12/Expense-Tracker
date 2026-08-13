# Architecture at a glance

```text
                    React PWA
                       |
                Application Layer
                       |
                    Dexie.js
                       |
                   IndexedDB
                       |
       +---------------+----------------+
       |                                |
  Local reports                   Sync Queue
       |                                |
       |                        Google Apps Script
       |                                |
       |                         Google Sheets
       |
     Recharts
```

## Offline principle

Every important user action writes locally first. A network/cloud failure must not block recording.

## Automation principle

iOS Shortcut cannot directly write to IndexedDB while the web app is closed. The shortcut therefore appends records to an iCloud Drive NDJSON inbox. The user opens the web app and chooses **Sync Automation**, which imports the file into IndexedDB's Review Queue.

## Recurring principle

Recurring rules generate normal transactions. They differ only by metadata (`source=RECURRING`, `recurringRuleId`). This keeps reporting simple because recurring entries are ordinary transactions.

## Future backend

If later required:

```text
React → local IndexedDB → Spring Boot → PostgreSQL
```

The UI does not need to be redesigned because repository/service boundaries already exist.
