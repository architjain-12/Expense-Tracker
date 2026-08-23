import Dexie, {
  type Table
} from 'dexie';

import { db } from '../db/database';
import { newId } from '../utils/id';

/**
 * ============================================================
 * TRACE EXPENSE TRACKER
 * Global Application Security Service
 * ============================================================
 *
 * Authentication/security state is NOT stored in the active
 * Personal/Demo partition database.
 *
 * Partition databases:
 *
 *   ExpenseTrackerDB-personal
 *   ExpenseTrackerDB-demo
 *
 * Global security database:
 *
 *   ExpenseTrackerSecurityDB
 *
 * This prevents:
 *
 *   - partition switching from changing authentication
 *   - backup restore from overwriting authentication
 *   - Demo restore from changing Personal security
 *   - passkey credentials being transferred through ETAR
 *
 * Recovery:
 *
 *   Recovery secret
 *        ↓
 *   verify recovery secret
 *        ↓
 *   invalidate old authentication
 *        ↓
 *   establish new PIN/passkey
 *
 * Passkey credentials are never exported or restored.
 * ============================================================
 */

const SECURITY_DB_NAME = 'ExpenseTrackerSecurityDB';
const SECURITY_DB_VERSION = 1;

const SECURITY_RECORD_ID = 'application-security';

const PBKDF2_ITERATIONS = 600_000;

const MIN_RECOVERY_SECRET_LENGTH = 12;


/* ============================================================
 * Types
 * ============================================================
 */

type LockMethod =
  | 'PIN'
  | 'PASSKEY'
  | 'PIN_AND_PASSKEY';

interface SecurityCredential {
  id: string;
  credentialId: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  active: boolean;
}

interface SecurityRecord {
  id: string;

  lockEnabled: boolean;

  lockMethod?: LockMethod;

  pinHash?: string;
  pinSalt?: string;

  passkeys: SecurityCredential[];

  recoveryHash?: string;
  recoverySalt?: string;

  securityGeneration: number;

  recoveryConfigured: boolean;

  createdAt: string;
  updatedAt: string;
}


/* ============================================================
 * Global Security Database
 * ============================================================
 */

class SecurityDatabase extends Dexie {
  security!: Table<SecurityRecord, string>;

  constructor() {
    super(SECURITY_DB_NAME);

    this.version(SECURITY_DB_VERSION).stores({
      security: 'id'
    });
  }
}

const securityDb = new SecurityDatabase();


/* ============================================================
 * Encoding helpers
 * ============================================================
 */

function bytesToBase64Url(
  bytes: Uint8Array
): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}


function base64UrlToBytes(
  value: string
): Uint8Array {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(
      Math.ceil(value.length / 4) * 4,
      '='
    );

  const binary = atob(padded);

  return Uint8Array.from(
    binary,
    char => char.charCodeAt(0)
  );
}


/* ============================================================
 * Secure random bytes
 * ============================================================
 */

function randomBytes(
  length = 32
): Uint8Array {
  if (
    !globalThis.crypto?.getRandomValues
  ) {
    throw new Error(
      'Secure random number generation is unavailable in this browser.'
    );
  }

  const bytes =
    new Uint8Array(length);

  globalThis.crypto.getRandomValues(
    bytes
  );

  return bytes;
}


/* ============================================================
 * Constant-time comparison
 * ============================================================
 */

function timingSafeEqual(
  a: Uint8Array,
  b: Uint8Array
): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}


/* ============================================================
 * SHA-256 compatibility helper
 * ============================================================
 *
 * Existing callers may still import hashPin().
 *
 * New PIN/recovery authentication MUST use PBKDF2 below.
 * ============================================================
 */
/*
 * ============================================================
 * PIN
 * ============================================================
 */

export async function hashPin(pin: string): Promise<string> {
  const normalized = pin.trim();

  if (!normalized) {
    throw new Error('PIN is required.');
  }

  const data = new TextEncoder().encode(normalized);

  const digest = await crypto.subtle.digest(
    'SHA-256',
    data
  );

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/*
 * ============================================================
 * RECOVERY CODE
 * ============================================================
 *
 * The recovery code is:
 *
 * - generated locally
 * - never sent to a server
 * - never stored in plaintext
 * - stored only as SHA-256 hash
 *
 * The plaintext is returned ONLY when the code is generated.
 */

const RECOVERY_CODE_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const RECOVERY_CODE_LENGTH = 16;

function generateRandomRecoveryCode(): string {
  const random = new Uint32Array(
    RECOVERY_CODE_LENGTH
  );

  crypto.getRandomValues(random);

  let code = '';

  for (let i = 0; i < random.length; i++) {
    code +=
      RECOVERY_CODE_ALPHABET[
        random[i] % RECOVERY_CODE_ALPHABET.length
      ];
  }

  /*
   * Display in four groups of four:
   *
   * ABCD-EFGH-IJKL-MNOP
   */
  return code.match(/.{1,4}/g)?.join('-') ?? code;
}
async function hashRecoveryCode(
  recoveryCode: string
): Promise<string> {
  const normalized = recoveryCode
    .replace(/-/g, '')
    .trim()
    .toUpperCase();

  if (!normalized) {
    throw new Error(
      'Recovery code is required.'
    );
  }

  const data =
    new TextEncoder().encode(normalized);

  const digest =
    await crypto.subtle.digest(
      'SHA-256',
      data
    );

  return Array.from(
    new Uint8Array(digest)
  )
    .map(byte =>
      byte.toString(16).padStart(2, '0')
    )
    .join('');
}
/**
 * Generate a brand-new recovery code.
 *
 * IMPORTANT:
 * The returned plaintext code must be shown to the
 * user exactly once and saved somewhere secure.
 */
export async function generateRecoveryCode(): Promise<string> {
  const recoveryCode =
    generateRandomRecoveryCode();

  const recoveryCodeHash =
    await hashRecoveryCode(recoveryCode);

  await db.settings.update('app', {
    recoveryCodeHash,
    recoveryCodeCreatedAt:
      new Date().toISOString(),
  });

  return recoveryCode;
}
/**
 * Returns whether a recovery code has already
 * been configured for this partition.
 */
export async function hasRecoveryCode(): Promise<boolean> {
  const settings =
    await db.settings.get('app');

  return Boolean(
    settings?.recoveryCodeHash
  );
}
/**
 * Verify the supplied recovery code and, if valid,
 * permanently disable the device lock for the
 * current partition.
 *
 * The recovery code itself is never stored.
 */
export async function emergencyDisableLock(
  suppliedRecoveryCode: string
): Promise<void> {
  const settings =
    await db.settings.get('app');

  if (!settings) {
    throw new Error(
      'Application settings are not available.'
    );
  }

  if (!settings.recoveryCodeHash) {
    throw new Error(
      'No recovery code has been configured for this device.'
    );
  }

  const suppliedHash =
    await hashRecoveryCode(
      suppliedRecoveryCode
    );

  if (
    suppliedHash !==
    settings.recoveryCodeHash
  ) {
    throw new Error(
      'Incorrect recovery code.'
    );
  }

  /*
   * Recovery is intentionally local to the
   * currently active partition.
   *
   * No transaction/account/category data is touched.
   */
  await db.settings.update('app', {
    lockEnabled: false,
  });
}
/**
 * Generate a new recovery code.
 *
 * Used when the user intentionally rotates their
 * recovery code.
 */
export async function rotateRecoveryCode(): Promise<string> {
  return generateRecoveryCode();
}


/*
 * ============================================================
 * PASSKEY / FACE ID
 * ============================================================
 *
 * Keep your existing implementation here if you already
 * have passkey registration code.
 *
 * This implementation is the verification function used
 * by AppLockGuard.
 */

export async function verifyLocalPasskey(
  credentialId?: string
): Promise<boolean> {
  const security =
    await getSecurityRecord();

  if (!security.passkeys?.length) {
    return false;
  }

  /*
   * Determine which active passkeys can be used.
   */
  const activePasskeys =
    security.passkeys.filter(
      passkey =>
        passkey.active &&
        Boolean(passkey.credentialId)
    );

  if (!activePasskeys.length) {
    return false;
  }

  /*
   * If a credentialId was supplied, make sure it belongs
   * to one of our active passkeys.
   *
   * If no credentialId was supplied, allow WebAuthn to
   * discover an available credential.
   */
  if (credentialId) {
    const matchingPasskey =
      activePasskeys.find(
        passkey =>
          passkey.credentialId === credentialId
      );

    if (!matchingPasskey) {
      return false;
    }
  }

  try {
    const credential =
      await navigator.credentials.get({
        publicKey: {
          challenge:
            crypto.getRandomValues(
              new Uint8Array(32)
            ),

          /*
           * If we know the credential ID, restrict
           * authentication to that credential.
           *
           * Otherwise provide all active credentials
           * so the platform can select/discover one.
           */
          allowCredentials:
            credentialId
              ? [
                  {
                    id:
                    toWebAuthnBufferSource(
                      base64UrlToUint8Array(
                        credentialId
                      )
                    ),
                    type: 'public-key',
                  },
                ]
              : activePasskeys.map(
                  passkey => ({
                    id:
                      toWebAuthnBufferSource(
                        base64UrlToUint8Array(
                          passkey.credentialId
                        )
                      ),
                    type: 'public-key',
                  })
                ),

          userVerification:
            'required',

          timeout: 60000,
        },
      });

    if (
      !credential ||
      credential.type !== 'public-key'
    ) {
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      'PASSKEY VERIFICATION FAILED:',
      error
    );

    return false;
  }
}


function base64UrlToUint8Array(
  value: string
): Uint8Array {
  const padding =
    '='.repeat(
      (4 - (value.length % 4)) % 4
    );

  const base64 =
    (value + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

  const binary =
    atob(base64);

  const output =
    new Uint8Array(binary.length);

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    output[i] =
      binary.charCodeAt(i);
  }

  return output;
}
function toWebAuthnBufferSource(
  bytes: Uint8Array
): ArrayBuffer {
  return bytes.slice().buffer;
}
/* ============================================================
 * PBKDF2
 * ============================================================
 */

async function deriveVerifier(
  secret: string,
  salt: Uint8Array
): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      'Secure cryptography is unavailable in this browser.'
    );
  }

  const keyMaterial =
    await globalThis.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      'PBKDF2',
      false,
      ['deriveBits']
    );

  const derived =
    await globalThis.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: toWebAuthnBufferSource(salt),
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

  return bytesToBase64Url(
    new Uint8Array(derived)
  );
}


async function createVerifier(
  secret: string
): Promise<{
  hash: string;
  salt: string;
}> {
  const salt =
    randomBytes(32);

  const hash =
    await deriveVerifier(
      secret,
      salt
    );

  return {
    hash,
    salt: bytesToBase64Url(salt)
  };
}


async function verifyVerifier(
  secret: string,
  hash: string,
  salt: string
): Promise<boolean> {
  try {
    const calculated =
      await deriveVerifier(
        secret,
        base64UrlToBytes(salt)
      );

    return timingSafeEqual(
      new TextEncoder().encode(
        calculated
      ),
      new TextEncoder().encode(
        hash
      )
    );
  } catch {
    return false;
  }
}


/* ============================================================
 * Security record
 * ============================================================
 */

async function getSecurityRecord():
  Promise<SecurityRecord> {
  const existing =
    await securityDb.security.get(
      SECURITY_RECORD_ID
    );

  if (existing) {
    return existing;
  }

  const now =
    new Date().toISOString();

  const initial:
    SecurityRecord = {
      id:
        SECURITY_RECORD_ID,

      lockEnabled:
        false,

      passkeys:
        [],

      securityGeneration:
        1,

      recoveryConfigured:
        false,

      createdAt:
        now,

      updatedAt:
        now
    };

  await securityDb.security.put(
    initial
  );

  return initial;
}


async function saveSecurityRecord(
  record: SecurityRecord
): Promise<void> {
  await securityDb.security.put({
    ...record,
    updatedAt:
      new Date().toISOString()
  });
}


/* ============================================================
 * WebAuthn availability
 * ============================================================
 */

export function webAuthnAvailable():
  boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'PublicKeyCredential' in window &&
    !!navigator.credentials
  );
}


/* ============================================================
 * Register Passkey
 * ============================================================
 */

export async function registerLocalPasskey(
  name = 'This device'
): Promise<string> {
  if (!webAuthnAvailable()) {
    throw new Error(
      'Face ID/passkey is not available here. Open the app over HTTPS or use a PIN.'
    );
  }

  const challenge =
    randomBytes(32);

  const userId =
    randomBytes(16);

  const credential =
    await navigator.credentials.create({
      publicKey: {
        challenge:
          challenge.buffer as ArrayBuffer,

        rp: {
          name:
            'TRACE Expense Tracker',

          id:
            window.location.hostname
        },

        user: {
          id:
            userId.buffer as ArrayBuffer,

          name:
            'local-user',

          displayName:
            'TRACE Expense Tracker'
        },

        pubKeyCredParams: [
          {
            type:
              'public-key',

            alg:
              -7
          },
          {
            type:
              'public-key',

            alg:
              -257
          }
        ],

        authenticatorSelection: {
          authenticatorAttachment:
            'platform',

          residentKey:
            'required',

          userVerification:
            'required'
        },

        timeout:
          60000,

        attestation:
          'none'
      }
    });

  if (!credential) {
    throw new Error(
      'Face ID/passkey registration was cancelled.'
    );
  }

  const publicKeyCredential =
    credential as PublicKeyCredential;

  const credentialId =
    bytesToBase64Url(
      new Uint8Array(
        publicKeyCredential.rawId
      )
    );

  const security =
    await getSecurityRecord();

  const existing =
    security.passkeys.find(
      passkey =>
        passkey.active &&
        passkey.credentialId ===
          credentialId
    );

  if (existing) {
    return credentialId;
  }

  security.passkeys.push({
    id:
      newId(),

    credentialId,

    name,

    createdAt:
      new Date().toISOString(),

    active:
      true
  });

  await saveSecurityRecord(
    security
  );

  return credentialId;
}



/* ============================================================
 * PIN
 * ============================================================
 */

function validatePin(
  pin: string
): void {
  if (!/^\d{4,8}$/.test(pin)) {
    throw new Error(
      'PIN must contain 4–8 digits.'
    );
  }
}


export async function setLocalPin(
  pin: string
): Promise<void> {
  validatePin(pin);

  const security =
    await getSecurityRecord();

  const verifier =
    await createVerifier(pin);

  security.pinHash =
    verifier.hash;

  security.pinSalt =
    verifier.salt;

  security.lockEnabled =
    true;

  security.lockMethod =
    security.passkeys.some(
      passkey =>
        passkey.active
    )
      ? 'PIN_AND_PASSKEY'
      : 'PIN';

  await saveSecurityRecord(
    security
  );
}


export async function verifyLocalPin(
  pin: string
): Promise<boolean> {
  const security =
    await getSecurityRecord();

  if (
    !security.pinHash ||
    !security.pinSalt
  ) {
    return false;
  }

  return verifyVerifier(
    pin,
    security.pinHash,
    security.pinSalt
  );
}


/* ============================================================
 * Recovery Secret
 * ============================================================
 */

export async function setRecoverySecret(
  recoverySecret: string
): Promise<void> {
  if (
    recoverySecret.length <
    MIN_RECOVERY_SECRET_LENGTH
  ) {
    throw new Error(
      `Recovery password must contain at least ${MIN_RECOVERY_SECRET_LENGTH} characters.`
    );
  }

  const security =
    await getSecurityRecord();

  const verifier =
    await createVerifier(
      recoverySecret
    );

  security.recoveryHash =
    verifier.hash;

  security.recoverySalt =
    verifier.salt;

  security.recoveryConfigured =
    true;

  await saveSecurityRecord(
    security
  );
}


export async function isRecoveryConfigured():
  Promise<boolean> {
  const security =
    await getSecurityRecord();

  return security.recoveryConfigured;
}


export async function verifyRecoverySecret(
  recoverySecret: string
): Promise<boolean> {
  const security =
    await getSecurityRecord();

  if (
    !security.recoveryConfigured ||
    !security.recoveryHash ||
    !security.recoverySalt
  ) {
    return false;
  }

  return verifyVerifier(
    recoverySecret,
    security.recoveryHash,
    security.recoverySalt
  );
}


/* ============================================================
 * Application Authentication
 * ============================================================
 */

export async function authenticateWithPin(
  pin: string
): Promise<boolean> {
  const security =
    await getSecurityRecord();

  if (!security.lockEnabled) {
    return true;
  }

  if (
    security.lockMethod !== 'PIN' &&
    security.lockMethod !==
      'PIN_AND_PASSKEY'
  ) {
    return false;
  }

  return verifyLocalPin(pin);
}


export async function authenticateWithPasskey(
  credentialId?: string
): Promise<boolean> {
  const security =
    await getSecurityRecord();

  if (!security.lockEnabled) {
    return true;
  }

  if (
    security.lockMethod !==
      'PASSKEY' &&
    security.lockMethod !==
      'PIN_AND_PASSKEY'
  ) {
    return false;
  }

  return verifyLocalPasskey(
    credentialId
  );
}


export async function authenticateApplication(
  credentialId?: string
): Promise<boolean> {
  const security =
    await getSecurityRecord();

  if (!security.lockEnabled) {
    return true;
  }

  if (
    security.lockMethod ===
      'PASSKEY'
  ) {
    return authenticateWithPasskey(
      credentialId
    );
  }

  /*
   * For PIN_AND_PASSKEY the UI must
   * explicitly choose PIN or passkey.
   */
  return false;
}


/* ============================================================
 * Disable Lock
 * ============================================================
 */

export async function disableLock(
  authentication:
    | {
        type:
          'PIN';

        value:
          string;
      }
    | {
        type:
          'PASSKEY';

        credentialId?:
          string;
      }
): Promise<boolean> {
  const security =
    await getSecurityRecord();

  if (!security.lockEnabled) {
    return true;
  }

  const authenticated =
    authentication.type === 'PIN'
      ? await authenticateWithPin(
          authentication.value
        )
      : await authenticateWithPasskey(
          authentication.credentialId
        );

  if (!authenticated) {
    return false;
  }

  security.lockEnabled =
    false;

  security.lockMethod =
    undefined;

  security.pinHash =
    undefined;

  security.pinSalt =
    undefined;

  await saveSecurityRecord(
    security
  );

  return true;
}


/* ============================================================
 * Enable Passkey
 * ============================================================
 */

export async function enablePasskey(
  name = 'This device'
): Promise<string> {
  const credentialId =
    await registerLocalPasskey(
      name
    );

  const security =
    await getSecurityRecord();

  security.lockEnabled =
    true;

  security.lockMethod =
    security.pinHash
      ? 'PIN_AND_PASSKEY'
      : 'PASSKEY';

  await saveSecurityRecord(
    security
  );

  return credentialId;
}


/* ============================================================
 * Remove Passkey
 * ============================================================
 */

export async function removePasskey(
  credentialId: string,
  authentication:
    | {
        type:
          'PIN';

        value:
          string;
      }
    | {
        type:
          'PASSKEY';

        credentialId?:
          string;
      }
): Promise<boolean> {
  const security =
    await getSecurityRecord();

  const authenticated =
    authentication.type === 'PIN'
      ? await authenticateWithPin(
          authentication.value
        )
      : await authenticateWithPasskey(
          authentication.credentialId
        );

  if (!authenticated) {
    return false;
  }

  const target =
    security.passkeys.find(
      passkey =>
        passkey.active &&
        passkey.credentialId ===
          credentialId
    );

  if (!target) {
    return false;
  }

  target.active =
    false;

  const activePasskeys =
    security.passkeys.filter(
      passkey =>
        passkey.active
    );

  if (
    activePasskeys.length === 0 &&
    !security.pinHash
  ) {
    security.lockEnabled =
      false;

    security.lockMethod =
      undefined;
  }

  await saveSecurityRecord(
    security
  );

  return true;
}


/* ============================================================
 * Replace Passkey
 * ============================================================
 */

export async function replacePasskey(
  authentication:
    | {
        type:
          'PIN';

        value:
          string;
      }
    | {
        type:
          'PASSKEY';

        credentialId?:
          string;
      },
  name =
    'This device'
): Promise<string | null> {
  const authenticated =
    authentication.type === 'PIN'
      ? await authenticateWithPin(
          authentication.value
        )
      : await authenticateWithPasskey(
          authentication.credentialId
        );

  if (!authenticated) {
    return null;
  }

  const newCredentialId =
    await registerLocalPasskey(
      name
    );

  const security =
    await getSecurityRecord();

  for (
    const passkey
    of security.passkeys
  ) {
    if (
      passkey.credentialId !==
      newCredentialId
    ) {
      passkey.active =
        false;
    }
  }

  security.lockEnabled =
    true;

  security.lockMethod =
    security.pinHash
      ? 'PIN_AND_PASSKEY'
      : 'PASSKEY';

  await saveSecurityRecord(
    security
  );

  return newCredentialId;
}


/* ============================================================
 * Recovery
 * ============================================================
 */

export async function recoverApplicationAccess(
  recoverySecret: string
): Promise<boolean> {
  const security =
    await getSecurityRecord();

  if (
    !security.recoveryConfigured ||
    !security.recoveryHash ||
    !security.recoverySalt
  ) {
    throw new Error(
      'Recovery has not been configured.'
    );
  }

  const valid =
    await verifyVerifier(
      recoverySecret,
      security.recoveryHash,
      security.recoverySalt
    );

  if (!valid) {
    return false;
  }

  security.lockEnabled =
    false;

  security.lockMethod =
    undefined;

  security.pinHash =
    undefined;

  security.pinSalt =
    undefined;

  /*
   * Invalidate all application references
   * to existing passkeys.
   *
   * The actual credentials remain inside
   * the operating system authenticator.
   */
  for (
    const passkey
    of security.passkeys
  ) {
    passkey.active =
      false;
  }

  security.securityGeneration +=
    1;

  await saveSecurityRecord(
    security
  );

  return true;
}


export async function recoverAndSetPin(
  recoverySecret: string,
  newPin: string
): Promise<boolean> {
  const recovered =
    await recoverApplicationAccess(
      recoverySecret
    );

  if (!recovered) {
    return false;
  }

  await setLocalPin(
    newPin
  );

  return true;
}


export async function recoverAndSetPasskey(
  recoverySecret: string,
  name =
    'Recovered device'
): Promise<string | null> {
  const recovered =
    await recoverApplicationAccess(
      recoverySecret
    );

  if (!recovered) {
    return null;
  }

  return enablePasskey(
    name
  );
}


/* ============================================================
 * Passkey inspection
 * ============================================================
 */

export async function getActivePasskeyCredentialId():
  Promise<string | undefined> {
  const security =
    await getSecurityRecord();

  return security.passkeys.find(
    passkey =>
      passkey.active
  )?.credentialId;
}


/* ============================================================
 * Security State
 * ============================================================
 */

export async function getSecurityState():
  Promise<{
    lockEnabled:
      boolean;

    lockMethod?:
      LockMethod;

    recoveryConfigured:
      boolean;

    passkeys:
      Array<{
        id:
          string;

        name:
          string;

        credentialId:
          string;

        createdAt:
          string;

        lastUsedAt?:
          string;

        active:
          boolean;
      }>;

    securityGeneration:
      number;
  }> {
  const security =
    await getSecurityRecord();

  return {
    lockEnabled:
      security.lockEnabled,

    lockMethod:
      security.lockMethod,

    recoveryConfigured:
      security.recoveryConfigured,

    passkeys:
      security.passkeys.map(
        passkey => ({
          ...passkey
        })
      ),

    securityGeneration:
      security.securityGeneration
  };
}


/* ============================================================
 * Legacy v2.4.1 Migration
 * ============================================================
 */

export async function migrateLegacySecurity():
  Promise<void> {
  const existing =
    await securityDb.security.get(
      SECURITY_RECORD_ID
    );

  if (existing) {
    return;
  }

  const settings =
    await db.settings.get('app');

  if (!settings) {
    await getSecurityRecord();

    return;
  }

  const now =
    new Date().toISOString();

  const legacyCredential =
    settings.passkeyCredentialId;

  const migratedPasskeys:
    SecurityCredential[] =
      legacyCredential
        ? [
            {
              id:
                newId(),

              credentialId:
                legacyCredential,

              name:
                'Existing device',

              createdAt:
                now,

              active:
                true
            }
          ]
        : [];

  const record:
    SecurityRecord = {
      id:
        SECURITY_RECORD_ID,

      /*
       * Legacy PIN hashes cannot safely be
       * converted into the new PBKDF2
       * representation.
       *
       * Therefore the old PIN is intentionally
       * not migrated.
       */
      lockEnabled:
        !!legacyCredential &&
        settings.lockMethod ===
          'PASSKEY',

      lockMethod:
        legacyCredential &&
        settings.lockMethod ===
          'PASSKEY'
          ? 'PASSKEY'
          : undefined,

      passkeys:
        migratedPasskeys,

      securityGeneration:
        1,

      recoveryConfigured:
        false,

      createdAt:
        now,

      updatedAt:
        now
    };

  await securityDb.security.put(
    record
  );

  /*
   * Remove authentication state from
   * the partition settings.
   */
  await db.settings.put({
    ...settings,

    lockEnabled:
      undefined,

    lockMethod:
      undefined,

    localPinHash:
      undefined,

    passkeyCredentialId:
      undefined
  });
}


/* ============================================================
 * Lock state helper
 * ============================================================
 */

export async function isLockEnabled():
  Promise<boolean> {
  const security =
    await getSecurityRecord();

  return security.lockEnabled;
}


/* ============================================================
 * Testing helper
 * ============================================================
 */

export function closeSecurityDatabase():
  void {
  securityDb.close();
}

