import { db } from '../db/database';
import { newId } from '../utils/id';

/**
 * Convert bytes to Base64URL.
 *
 * WebAuthn credential IDs are binary values, but IndexedDB can
 * easily store a string, so we encode them as Base64URL.
 */
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/**
 * Convert Base64URL back to bytes.
 */
function base64UrlToBytes(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');

  const binary = atob(padded);

  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

/**
 * Generate secure random bytes.
 *
 * This avoids direct crypto.randomUUID() usage because some
 * local development environments do not expose it.
 */
function randomBytes(length = 32): Uint8Array {
  const bytes = new Uint8Array(length);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }

  const fallback = new TextEncoder().encode(newId());

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = fallback[i % fallback.length];
  }

  return bytes;
}

/**
 * SHA-256 PIN hashing.
 */
export async function hashPin(pin: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(pin)
    );

    return bytesToBase64Url(new Uint8Array(digest));
  }

  // Fallback for very old/local environments.
  let hash = 2166136261;

  for (const char of pin) {
    hash = Math.imul(
      hash ^ char.charCodeAt(0),
      16777619
    );
  }

  return `fallback-${(hash >>> 0).toString(16)}`;
}

/**
 * Checks whether WebAuthn is available in this browser.
 *
 * Safari/iOS can use the platform authenticator,
 * which may present Face ID or device passcode.
 */
export function webAuthnAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'PublicKeyCredential' in window &&
    !!navigator.credentials
  );
}

/**
 * Register a local platform passkey.
 *
 * On supported iPhones, the platform authenticator can use
 * Face ID / device passcode.
 */
export async function registerLocalPasskey(): Promise<string> {
  if (!webAuthnAvailable()) {
    throw new Error(
      'Face ID/passkey is not available here. Open the app over HTTPS or use a PIN.'
    );
  }

  const challenge = randomBytes(32);
  const userId = randomBytes(16);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: challenge.buffer as ArrayBuffer,

      rp: {
        name: 'Expense Tracker',
        id: window.location.hostname
      },

      user: {
        id: userId.buffer as ArrayBuffer,
        name: 'local-user',
        displayName: 'Expense Tracker'
      },

      pubKeyCredParams: [
        {
          type: 'public-key',
          alg: -7
        },
        {
          type: 'public-key',
          alg: -257
        }
      ],

      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required'
      },

      timeout: 60000,

      // This is a local device lock rather than
      // a server-backed identity system.
      attestation: 'none'
    }
  });

  if (!credential) {
    throw new Error(
      'Face ID/passkey registration was cancelled.'
    );
  }

  return bytesToBase64Url(
    new Uint8Array(
      (credential as PublicKeyCredential).rawId
    )
  );
}

/**
 * Ask the iPhone/browser to verify the registered credential.
 *
 * The user may see Face ID, device passcode, or another
 * platform authenticator prompt.
 */
export async function verifyLocalPasskey(
  credentialId: string
): Promise<boolean> {
  if (!webAuthnAvailable()) {
    return false;
  }

  try {
    const credentialBytes =
      base64UrlToBytes(credentialId);

    const assertion =
      await navigator.credentials.get({
        publicKey: {
          challenge:
            randomBytes(32).buffer as ArrayBuffer,

          allowCredentials: [
            {
              id:
                credentialBytes.buffer as ArrayBuffer,
              type: 'public-key',
              transports: ['internal']
            }
          ],

          userVerification: 'required',

          timeout: 60000
        }
      });

    return !!assertion;
  } catch (error) {
    console.error(
      'Face ID/passkey verification failed:',
      error
    );

    return false;
  }
}

/**
 * Enable PIN lock.
 */
export async function setLocalPin(
  pin: string
): Promise<void> {
  if (!/^\d{4,8}$/.test(pin)) {
    throw new Error(
      'PIN must contain 4–8 digits.'
    );
  }

  const current = await db.settings.get('app');

  if (!current) {
    throw new Error(
      'Application settings are not initialized.'
    );
  }

  await db.settings.put({
    ...current,
    lockEnabled: true,
    lockMethod: 'PIN',
    localPinHash: await hashPin(pin)
  });
}

/**
 * Enable Face ID / platform passkey lock.
 */
export async function enablePasskey(): Promise<void> {
  const credentialId =
    await registerLocalPasskey();

  const current =
    await db.settings.get('app');

  if (!current) {
    throw new Error(
      'Application settings are not initialized.'
    );
  }

  await db.settings.put({
    ...current,
    lockEnabled: true,
    lockMethod: 'PASSKEY',
    passkeyCredentialId: credentialId
  });
}

/**
 * Disable either PIN or Face ID lock.
 */
export async function disableLock(): Promise<void> {
  const current =
    await db.settings.get('app');

  if (!current) {
    return;
  }

  await db.settings.put({
    ...current,

    lockEnabled: false,

    localPinHash: undefined,

    passkeyCredentialId: undefined,

    lockMethod: undefined
  });
}