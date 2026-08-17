# Expense Tracker — Long-Term Backup Format Specification

Status: **Phase 0 design specification**
Format family: **ETAR-1** (Expense Tracker Archive Format v1)

## Purpose

ETAR exists so that financial history remains recoverable even if the Expense Tracker application, source code, framework, browser, database implementation or hosting environment no longer exists.

A future implementation must never require the original application to understand the financial data.

## Design principles

1. Open/documented representation.
2. Human-readable after decryption.
3. Stable versioning.
4. Standard cryptographic primitives.
5. Integrity verification.
6. Transaction data is the highest-priority recovery layer.
7. The recovery credential is independent of application login.
8. Old archive versions remain decryptable/convertible.

## Canonical data

Canonical structured data is UTF-8 JSON.

A transaction must retain, at minimum, stable identity, date/time, amount, currency, transaction type, account identity, classification, source and audit timestamps. The exact schema will be frozen before v2.5 implementation.

A CSV representation of transactions is also required for long-term portability.

## Archive manifest

The archive manifest should identify:

- format family/version;
- archive creation time;
- application/schema version that created it;
- user/workspace identifier where applicable;
- dataset/entity counts;
- covered date range;
- encryption mode;
- checksum information;
- creation/tool information.

The manifest must not expose sensitive financial records unnecessarily.

## Encryption direction

Encrypted archives should use a standard authenticated encryption design.

Initial direction:

- AES-256-GCM for authenticated encryption;
- Argon2id is the target password KDF for the frozen long-term format;
- cryptographically random salt;
- cryptographically random nonce/IV;
- parameters recorded in the archive header/manifest as required for future recovery.

### v2.4.1 browser implementation note

The first Phase 0 implementation uses the browser-native **PBKDF2-HMAC-SHA-256** KDF because Web Crypto does not provide Argon2id and the supplied v2.4.1 project does not currently bundle an Argon2 WASM implementation. The archive records the KDF and parameters explicitly.

This is an implementation profile, not a claim that the long-term ETAR-1 cryptographic profile is frozen. Before the archive format is declared final for lifetime storage, the KDF profile should be upgraded to Argon2id (or a separately versioned profile should be formally retained) and interoperability tests should be added.

## Recovery key

The application should generate/provision a dedicated backup recovery secret.

It must be possible to decrypt an archive without the original application authentication system.

The user must be encouraged to store the recovery secret outside the application, for example in a password manager and/or an offline physical backup.

The application must not depend on recovering the key from IndexedDB after device loss.

## Integrity

Archives must contain cryptographic integrity information. The implementation should use SHA-256 checksums for archive components or the canonical payload as appropriate.

Verification must detect:

- incomplete downloads;
- corruption;
- unexpected modification;
- malformed archive structure.

## Restore compatibility

The restore engine must support:

- current format;
- explicitly supported older format versions;
- migration of old schema versions into the current domain model.

Format migrations must be one-way and deterministic. Original archive files must never be modified in place.

## Recommended archive contents

```text
manifest.json
transactions.json
transactions.csv
accounts.json
categories.json
recurring-rules.json
review-queue.json
budgets.json
investments.json
deposits.json
settings.json
metadata.json
checksums.json
```

The exact final list can evolve, but transactions must remain independently extractable.

## Long-term recovery scenario

A person in the future should be able to:

1. Obtain the archive file.
2. Obtain the recovery secret.
3. Read this specification.
4. Use any standard implementation of the documented cryptographic algorithms.
5. Decrypt the archive.
6. Open `transactions.json` or `transactions.csv` with common software.
7. Rebuild a database/application independently.

No Expense Tracker executable, JavaScript bundle, React version, browser or PostgreSQL instance should be required for this recovery path.

## Archive retention policy

The eventual backup manager should support separate policies for:

- recent daily recovery backups;
- weekly backups;
- monthly/annual long-term archives.

Retention must never silently delete the only long-term archive of a financial period.

## Compatibility rule

Once ETAR-1 is released for real financial data, its decryption and transaction extraction semantics must be treated as a compatibility contract.
