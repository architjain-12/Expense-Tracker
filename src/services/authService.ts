import { db } from '../db/database';
import { newId } from '../utils/id';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomChallenge(): Uint8Array {
  const bytes = new Uint8Array(32);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else new TextEncoder().encode(newId()).slice(0, 32).forEach((b, i) => { bytes[i] = b; });
  return bytes;
}

export async function hashPin(pin: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
    return bytesToBase64Url(new Uint8Array(digest));
  }
  // Local-only fallback for browsers without SubtleCrypto.
  let hash = 2166136261;
  for (const char of pin) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `fallback-${(hash >>> 0).toString(16)}`;
}

export function webAuthnAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials;
}

/**
 * Browser passkey / platform-authenticator gate. On iPhone this may invoke
 * Face ID/Touch ID/passcode or an installed passkey provider. This is a local
 * app lock, not a server-backed identity/authentication system.
 */
export async function registerLocalPasskey(): Promise<string> {
  if (!webAuthnAvailable()) throw new Error('Passkeys are not available in this browser. Use a PIN instead.');
  const challenge = randomChallenge();
  const userId = randomChallenge();
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Expense Tracker', id: window.location.hostname },
      user: { id: userId, name: 'local-user', displayName: 'Expense Tracker' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'required', userVerification: 'required' },
      timeout: 60000,
    },
  }) as PublicKeyCredential | null;
  if (!credential) throw new Error('Could not create a passkey.');
  return bytesToBase64Url(new Uint8Array(credential.rawId));
}

export async function verifyLocalPasskey(credentialId: string): Promise<boolean> {
  if (!webAuthnAvailable()) return false;
  try {
    const raw = Uint8Array.from(atob(credentialId.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge(),
        allowCredentials: [{ id: raw, type: 'public-key', transports: ['internal'] }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}

export async function setLocalPin(pin: string): Promise<void> {
  if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN must be 4–8 digits.');
  const current = await db.settings.get('app');
  if (!current) return;
  await db.settings.put({ ...current, lockEnabled: true, lockMethod: 'PIN', localPinHash: await hashPin(pin) });
}

export async function enablePasskey(): Promise<void> {
  const credentialId = await registerLocalPasskey();
  const current = await db.settings.get('app');
  if (!current) return;
  await db.settings.put({ ...current, lockEnabled: true, lockMethod: 'PASSKEY', passkeyCredentialId: credentialId });
}

export async function disableLock(): Promise<void> {
  const current = await db.settings.get('app');
  if (!current) return;
  await db.settings.put({ ...current, lockEnabled: false, localPinHash: undefined, passkeyCredentialId: undefined, lockMethod: undefined });
}
