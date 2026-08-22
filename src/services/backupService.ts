import { db } from '../db/database';
import type { AppSettings } from '../types/models';

export const ETAR_FORMAT = 'ETAR-1';
export const ETAR_SCHEMA_VERSION = 1;
const KDF_ITERATIONS = 310000;

const DEVICE_SECURITY_SETTINGS = new Set([
  'lockEnabled',
  'lockMethod',
  'pinHash',
  'pinSalt',
  'pin',
  'passkey',
  'passkeyCredential',
  'credentialId',
  'webauthnCredential',
  'failedAttempts',
  'lockoutUntil',
]);

const NON_PORTABLE_SETTINGS = [
  'demoPinHash',
  'lockEnabled',
  'lockMethod',
  'passkeyCredentialId',
  'localPinHash',
  'googleSheetsToken',
] as const;

function sanitizeSettingsForBackup(
  settings: AppSettings[]
): AppSettings[] {
  return settings.map(setting => {
    const portable: AppSettings = {
      id: 'app',
      currency: setting.currency,
      defaultAccountId: setting.defaultAccountId,
      defaultNeedWant: setting.defaultNeedWant,
      defaultEssentialDiscretionary:
        setting.defaultEssentialDiscretionary,
      defaultFixedVariable: setting.defaultFixedVariable,
      theme: setting.theme,
      reportingYear: setting.reportingYear,
      googleSheetsEndpoint: setting.googleSheetsEndpoint,
      googleSheetsEnabled: setting.googleSheetsEnabled,
    };

    return portable;
  });
}

type Snapshot = {
  transactions: unknown[];
  accounts: unknown[];
  categories: unknown[];
  recurringRules: unknown[];
  reviewQueue: unknown[];
  budgets: unknown[];
  investments: unknown[];
  interestDeposits: unknown[];
  syncQueue: unknown[];
  settings: AppSettings[];
};

export type ArchiveManifest = {
  format: typeof ETAR_FORMAT;
  schemaVersion: number;
  createdAt: string;
  applicationVersion?: string;
  partition: string;
  encrypted: true;
  kdf: 'PBKDF2-SHA-256';
  entityCounts: Record<string, number>;
  transactionDateRange?: { from: string; to: string };
  checksum: string;
  storageMode?: 'shared' | 'downloaded';
};

function toBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

  function utf8(value: string): Uint8Array { return new TextEncoder().encode(value); }
function text(bytes: ArrayBuffer): string { return new TextDecoder().decode(bytes); }

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', toBufferSource(utf8(value)));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    'raw',
    toBufferSource(utf8(password)),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: toBufferSource(salt), iterations: KDF_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function snapshot(): Promise<Snapshot> {
  const settings = await db.settings.toArray();
  return {
    transactions: await db.transactions.toArray(),
    accounts: await db.accounts.toArray(),
    categories: await db.categories.toArray(),
    recurringRules: await db.recurringRules.toArray(),
    reviewQueue: await db.reviewQueue.toArray(),
    budgets: await db.budgets.toArray(),
    investments: await db.investments.toArray(),
    interestDeposits: await db.interestDeposits.toArray(),
    syncQueue: [], //await db.syncQueue.toArray(),
    settings: sanitizeSettingsForBackup(settings)
  };
}

function transactionDateRange(transactions: unknown[]): ArchiveManifest['transactionDateRange'] {
  const dates = transactions.map(t => (t as { transactionDateTime?: string }).transactionDateTime).filter(Boolean).sort();
  return dates.length ? { from: dates[0]!, to: dates[dates.length - 1]! } : undefined;
}

function makePayload(data: Snapshot): string {
  return JSON.stringify({
    archiveDataVersion: 1,
    exportedAt: new Date().toISOString(),
    ...data,
    transactionsCsv: makeTransactionCsv(data.transactions),
  });
}

function makeTransactionCsv(rows: unknown[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const header = ['Date','Type','Amount','Currency','Account','Category','Subcategory','Merchant','Notes','Source','CreatedAt','UpdatedAt'];
  const body = rows.map(row => {
    const t = row as Record<string, unknown>;
    return [t.transactionDateTime,t.type,t.amount,'INR',t.accountId,t.categoryId,t.subcategoryId,t.merchant,t.notes,t.source,t.createdAt,t.updatedAt].map(esc).join(',');
  });
  return [header.join(','), ...body].join('\n');
}

export async function shareArchiveFile(file: File): Promise<'shared' | 'downloaded'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const shareFile = new File(
      [await file.arrayBuffer()],
      file.name,
      { type: 'text/plain' }
    );

    if (
      typeof navigator.canShare !== 'function' ||
      !navigator.canShare({ files: [shareFile] })
    ) {
      throw new Error(
        'This iPhone/browser does not support sharing backup files from this PWA.'
      );
    }

    try {
      // IMPORTANT: this function must be called directly from the
      // "Save backup to Files" button click.
      //Debug
      console.log('Web Share:', typeof navigator.share === 'function');
      console.log('Can Share:', typeof navigator.canShare === 'function');
      console.log('File:', {
        name: shareFile.name,
        type: shareFile.type,
        size: shareFile.size,
      });

      if (typeof navigator.canShare === 'function') {
        console.log(
          'Can share file:',
          navigator.canShare({ files: [shareFile] })
        );
      }
      //end debug
      await navigator.share({
        files: [shareFile],
      });

      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Backup sharing was cancelled. The backup was not saved.');
      }

      throw error instanceof Error
        ? new Error(`Could not open iPhone Share Sheet: ${error.message}`)
        : new Error('Could not open iPhone Share Sheet.');
    }
  }

  // Desktop fallback
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');

  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return 'downloaded';
}

export async function createEncryptedArchive(password: string, applicationVersion: string, partition: string, filenamePrefix = 'expense-tracker-backup'): Promise<ArchiveManifest & { archiveFile: File }> {
  if (!password || password.length < 8) throw new Error('Backup password must be at least 8 characters.');
  const data = await snapshot();
  const payload = makePayload(data);
  const checksum = await sha256(payload);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, toBufferSource(utf8(payload)));
  const manifest: ArchiveManifest = {
    format: ETAR_FORMAT, schemaVersion: ETAR_SCHEMA_VERSION, createdAt: new Date().toISOString(), applicationVersion,
    partition, encrypted: true, kdf: 'PBKDF2-SHA-256',
    entityCounts: Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'syncQueue').map(([key, value]) => [key, value.length])),
    transactionDateRange: transactionDateRange(data.transactions), checksum,
  };
  const archive = JSON.stringify({
    manifest,
    encryption: { algorithm: 'AES-256-GCM', kdf: manifest.kdf, iterations: KDF_ITERATIONS, salt: bytesToBase64(salt), iv: bytesToBase64(iv) },
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  }, null, 2);
  const filename = `${filenamePrefix}-${new Date().toISOString().slice(0,10)}.etarchive`;
  const archiveFile = new File(
    [archive],
    filename,
    { type: 'text/plain' }
  );
  return { ...manifest, storageMode: undefined, archiveFile };
}

function validateSnapshot(data: unknown): asserts data is Snapshot {
  if (!data || typeof data !== 'object') throw new Error('Backup payload is not an object.');
  const required = ['transactions','accounts','categories','recurringRules','reviewQueue','budgets','investments','interestDeposits','syncQueue','settings'];
  for (const key of required) if (!Array.isArray((data as Record<string, unknown>)[key])) throw new Error(`Backup is missing or has invalid data: ${key}.`);
}

export async function restoreEncryptedArchive(
  file: File,
  password: string
): Promise<ArchiveManifest> {
  if (!password) {
    throw new Error('Backup password is required.');
  }

  let envelope: {
    manifest?: ArchiveManifest;
    encryption?: {
      algorithm: string;
      kdf: string;
      iterations: number;
      salt: string;
      iv: string;
    };
    ciphertext?: string;
  };

  try {
    envelope = JSON.parse(await file.text());
  } catch {
    throw new Error('The selected file is not a valid Expense Tracker archive.');
  }

  if (
    envelope.manifest?.format !== ETAR_FORMAT ||
    envelope.manifest.schemaVersion !== ETAR_SCHEMA_VERSION
  ) {
    throw new Error(
      'Unsupported or invalid Expense Tracker archive format.'
    );
  }

  if (
    !envelope.encryption ||
    envelope.encryption.algorithm !== 'AES-256-GCM' ||
    envelope.encryption.kdf !== 'PBKDF2-SHA-256'
  ) {
    throw new Error('Unsupported archive encryption parameters.');
  }

  if (!envelope.encryption.salt || !envelope.encryption.iv) {
    throw new Error('Backup encryption metadata is incomplete.');
  }

  if (!envelope.ciphertext) {
    throw new Error('Backup ciphertext is missing.');
  }

  let salt: Uint8Array;
  let iv: Uint8Array;
  let ciphertext: Uint8Array;

  try {
    salt = base64ToBytes(envelope.encryption.salt);
    iv = base64ToBytes(envelope.encryption.iv);
    ciphertext = base64ToBytes(envelope.ciphertext);
  } catch {
    throw new Error('Backup contains invalid encrypted data.');
  }

  if (salt.byteLength !== 16) {
    throw new Error('Invalid backup salt.');
  }

  if (iv.byteLength !== 12) {
    throw new Error('Invalid backup initialization vector.');
  }

  if (ciphertext.byteLength === 0) {
    throw new Error('Backup ciphertext is empty.');
  }

  const key = await deriveKey(password, salt);

  let plaintext: string;

  try {
    const clear = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: toBufferSource(iv),
      },
      key,
      toBufferSource(ciphertext)
    );
  
    plaintext = text(clear);
  } catch (error) {
    console.error('AES-GCM decrypt failed:', error);
  
    if (error instanceof Error) {
      throw new Error(
        `AES-GCM decrypt failed [${error.name}]: ${error.message || 'No message'}`
      );
    }
  
    throw new Error(`AES-GCM decrypt failed: ${String(error)}`);
  }

  let data: Snapshot & {
    archiveDataVersion?: number;
    exportedAt?: string;
    transactionsCsv?: string;
  };

  try {
    data = JSON.parse(plaintext);
  } catch {
    throw new Error(
      'Backup was decrypted, but its contents are not valid JSON.'
    );
  }

  const checksum = await sha256(plaintext);

  if (checksum !== envelope.manifest.checksum) {
    throw new Error(
      'Backup integrity check failed. The archive may be corrupted or modified.'
    );
  }

  validateSnapshot(data);

  await restoreSnapshot(data);

  return envelope.manifest;
}

export async function restoreSnapshot(data: Snapshot): Promise<void> {
  validateSnapshot(data);

  await db.transaction(
    'rw',
    [
      db.transactions,
      db.accounts,
      db.categories,
      db.recurringRules,
      db.reviewQueue,
      db.budgets,
      db.investments,
      db.interestDeposits,
      db.syncQueue,
      db.settings,
    ],
    async () => {
      // ----------------------------------------------------------
      // Preserve device-local settings before clearing the DB.
      // ----------------------------------------------------------

      const currentSettings = await db.settings.get('app');

      const preservedDeviceSettings: Partial<AppSettings> = {
        demoPinHash: currentSettings?.demoPinHash,
        lockEnabled: currentSettings?.lockEnabled,
        lockMethod: currentSettings?.lockMethod,
        passkeyCredentialId: currentSettings?.passkeyCredentialId,
        localPinHash: currentSettings?.localPinHash,

        // Google Sheets token is a credential.
        googleSheetsToken: currentSettings?.googleSheetsToken,
      };

      // ----------------------------------------------------------
      // Clear portable application data.
      // ----------------------------------------------------------

      await db.transactions.clear();
      await db.accounts.clear();
      await db.categories.clear();
      await db.recurringRules.clear();
      await db.reviewQueue.clear();
      await db.budgets.clear();
      await db.investments.clear();
      await db.interestDeposits.clear();
      await db.syncQueue.clear();
      await db.settings.clear();

      // ----------------------------------------------------------
      // Restore portable application data.
      // ----------------------------------------------------------

      await db.transactions.bulkPut(data.transactions as never[]);
      await db.accounts.bulkPut(data.accounts as never[]);
      await db.categories.bulkPut(data.categories as never[]);
      await db.recurringRules.bulkPut(
        data.recurringRules as never[]
      );
      await db.reviewQueue.bulkPut(
        data.reviewQueue as never[]
      );
      await db.budgets.bulkPut(data.budgets as never[]);
      await db.investments.bulkPut(data.investments as never[]);
      await db.interestDeposits.bulkPut(
        data.interestDeposits as never[]
      );

      // ----------------------------------------------------------
      // Restore portable settings + preserve local device settings.
      // ----------------------------------------------------------

      const restoredAppSettings = data.settings.find(
        setting => setting.id === 'app'
      );
      
      if (restoredAppSettings) {
        const restoredSettings: AppSettings = {
          ...restoredAppSettings,
          ...preservedDeviceSettings,
          id: 'app',
        };
      
        await db.settings.put(restoredSettings);
      }
    }
  );
}
export async function markAutoBackupSaved(): Promise<void> {
  await db.pendingBackups.delete('auto');

  await db.settings.update('app', {
    lastAutoBackupSavedAt: new Date().toISOString(),
  });
}
export async function restoreLegacyJsonBackup(file: File): Promise<number> {
  const raw = JSON.parse(await file.text()) as Record<string, unknown>;
  const data = {
    transactions: Array.isArray(raw.transactions) ? raw.transactions : [], accounts: Array.isArray(raw.accounts) ? raw.accounts : [],
    categories: Array.isArray(raw.categories) ? raw.categories : [], recurringRules: Array.isArray(raw.recurringRules) ? raw.recurringRules : [],
    reviewQueue: Array.isArray(raw.reviewQueue) ? raw.reviewQueue : [], budgets: Array.isArray(raw.budgets) ? raw.budgets : [],
    investments: Array.isArray(raw.investments) ? raw.investments : [], interestDeposits: Array.isArray(raw.interestDeposits) ? raw.interestDeposits : [],
    syncQueue: Array.isArray(raw.syncQueue) ? raw.syncQueue : [], settings: Array.isArray(raw.settings) ? raw.settings : [],
  };
  if (!data.transactions.length && !data.accounts.length && !data.categories.length) throw new Error('This JSON does not look like a valid Expense Tracker backup.');
  await restoreSnapshot(data);
  return data.transactions.length;
}

export async function createSafetyArchive(password: string, applicationVersion: string, partition: string): Promise<ArchiveManifest> {
  return createEncryptedArchive(password, applicationVersion, partition, 'expense-tracker-pre-restore-safety');
}

export async function savePendingAutoBackup(
  file: File
): Promise<void> {
  const content = await file.text();

  await db.pendingBackups.put({
    id: 'auto',
    filename: file.name,
    content,
    createdAt: new Date().toISOString(),
  });
}

export async function getPendingAutoBackup(): Promise<File | null> {
  const pending = await db.pendingBackups.get('auto');

  if (!pending) {
    return null;
  }

  return new File(
    [pending.content],
    pending.filename,
    { type: 'text/plain' }
  );
}

export async function clearPendingAutoBackup(): Promise<void> {
  await db.pendingBackups.delete('auto');
}