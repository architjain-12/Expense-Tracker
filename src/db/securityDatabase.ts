import Dexie, { type Table } from 'dexie';

export type LockMethod = 'PIN' | 'PASSKEY';

export interface SecurityState {
  id: 'app';

  schemaVersion: number;

  lockEnabled: boolean;
  lockMethod?: LockMethod;

  // PIN verifier
  pinHash?: string;
  pinSalt?: string;

  // Recovery verifier
  recoveryHash?: string;
  recoverySalt?: string;

  // WebAuthn credential ID.
  // This identifies the credential; the private key remains
  // inside the platform authenticator/iCloud Keychain.
  passkeyCredentialId?: string;

  failedAttempts: number;
  lockoutUntil?: number;

  createdAt: string;
  updatedAt: string;
}

class SecurityDatabase extends Dexie {
  security!: Table<SecurityState, string>;

  constructor() {
    super('ExpenseTrackerSecurityDB');

    this.version(1).stores({
      security: 'id',
    });
  }
}

export const securityDb = new SecurityDatabase();

export async function getSecurityState(): Promise<SecurityState | undefined> {
  return securityDb.security.get('app');
}

export async function ensureSecurityState(): Promise<SecurityState> {
  const existing = await getSecurityState();

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();

  const state: SecurityState = {
    id: 'app',
    schemaVersion: 1,
    lockEnabled: false,
    failedAttempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  await securityDb.security.put(state);

  return state;
}

export async function updateSecurityState(
  patch: Partial<SecurityState>,
): Promise<SecurityState> {
  const current = await ensureSecurityState();

  const updated: SecurityState = {
    ...current,
    ...patch,
    id: 'app',
    updatedAt: new Date().toISOString(),
  };

  await securityDb.security.put(updated);

  return updated;
}