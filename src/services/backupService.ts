import { db } from '../db/database';

export const ETAR_FORMAT = 'ETAR-1';
export const ETAR_SCHEMA_VERSION = 1;
const KDF_ITERATIONS = 310000;

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
  settings: unknown[];
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
};

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
  const digest = await crypto.subtle.digest('SHA-256', utf8(value));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: KDF_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function snapshot(): Promise<Snapshot> {
  return {
    transactions: await db.transactions.toArray(),
    accounts: await db.accounts.toArray(),
    categories: await db.categories.toArray(),
    recurringRules: await db.recurringRules.toArray(),
    reviewQueue: await db.reviewQueue.toArray(),
    budgets: await db.budgets.toArray(),
    investments: await db.investments.toArray(),
    interestDeposits: await db.interestDeposits.toArray(),
    syncQueue: await db.syncQueue.toArray(),
    settings: await db.settings.toArray(),
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

function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function createEncryptedArchive(password: string, applicationVersion: string, partition: string, filenamePrefix = 'expense-tracker-backup'): Promise<ArchiveManifest> {
  if (!password || password.length < 8) throw new Error('Backup password must be at least 8 characters.');
  const data = await snapshot();
  const payload = makePayload(data);
  const checksum = await sha256(payload);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, utf8(payload));
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
  downloadText(archive, `${filenamePrefix}-${new Date().toISOString().slice(0,10)}.etarchive`);
  return manifest;
}

function validateSnapshot(data: unknown): asserts data is Snapshot {
  if (!data || typeof data !== 'object') throw new Error('Backup payload is not an object.');
  const required = ['transactions','accounts','categories','recurringRules','reviewQueue','budgets','investments','interestDeposits','syncQueue','settings'];
  for (const key of required) if (!Array.isArray((data as Record<string, unknown>)[key])) throw new Error(`Backup is missing or has invalid data: ${key}.`);
}

export async function restoreEncryptedArchive(file: File, password: string): Promise<ArchiveManifest> {
  if (!password) throw new Error('Backup password is required.');
  const envelope = JSON.parse(await file.text()) as {
    manifest?: ArchiveManifest;
    encryption?: { algorithm: string; kdf: string; iterations: number; salt: string; iv: string };
    ciphertext?: string;
  };
  if (envelope.manifest?.format !== ETAR_FORMAT || envelope.manifest.schemaVersion !== ETAR_SCHEMA_VERSION) throw new Error('Unsupported or invalid Expense Tracker archive format.');
  if (!envelope.encryption || envelope.encryption.algorithm !== 'AES-256-GCM' || envelope.encryption.kdf !== 'PBKDF2-SHA-256') throw new Error('Unsupported archive encryption parameters.');
  const key = await deriveKey(password, base64ToBytes(envelope.encryption.salt));
  let plaintext: string;
  try {
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(envelope.encryption.iv) }, key, base64ToBytes(envelope.ciphertext || ''));
    plaintext = text(clear);
  } catch { throw new Error('Could not decrypt backup. Check the recovery password or archive integrity.'); }
  const checksum = await sha256(plaintext);
  if (checksum !== envelope.manifest.checksum) throw new Error('Backup integrity check failed. The archive may be corrupted or modified.');
  const data = JSON.parse(plaintext) as Snapshot & { archiveDataVersion?: number; exportedAt?: string; transactionsCsv?: string };
  validateSnapshot(data);
  await restoreSnapshot(data);
  return envelope.manifest;
}

export async function restoreSnapshot(data: Snapshot): Promise<void> {
  validateSnapshot(data);
  await db.transaction('rw', [db.transactions, db.accounts, db.categories, db.recurringRules, db.reviewQueue, db.budgets, db.investments, db.interestDeposits, db.syncQueue, db.settings], async () => {
    await db.transactions.clear(); await db.accounts.clear(); await db.categories.clear(); await db.recurringRules.clear();
    await db.reviewQueue.clear(); await db.budgets.clear(); await db.investments.clear(); await db.interestDeposits.clear(); await db.syncQueue.clear(); await db.settings.clear();
    await db.transactions.bulkPut(data.transactions as never[]); await db.accounts.bulkPut(data.accounts as never[]); await db.categories.bulkPut(data.categories as never[]);
    await db.recurringRules.bulkPut(data.recurringRules as never[]); await db.reviewQueue.bulkPut(data.reviewQueue as never[]); await db.budgets.bulkPut(data.budgets as never[]);
    await db.investments.bulkPut(data.investments as never[]); await db.interestDeposits.bulkPut(data.interestDeposits as never[]); await db.syncQueue.bulkPut(data.syncQueue as never[]); await db.settings.bulkPut(data.settings as never[]);
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
