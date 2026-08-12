import {
  useEffect,
  useState,
  type ReactNode
} from 'react';

import {
  LockKeyhole,
  ShieldCheck
} from 'lucide-react';

import { useSettings } from '../hooks/useDb';

import {
  hashPin,
  verifyLocalPasskey
} from '../services/authService';

interface AppLockGuardProps {
  children: ReactNode;
}

export default function AppLockGuard({
  children
}: AppLockGuardProps) {
  const settings = useSettings();

  const [unlocked, setUnlocked] =
    useState(false);

  const [pin, setPin] =
    useState('');

  const [error, setError] =
    useState('');

  /*
   * No lock configured:
   * allow the application to render.
   */
  useEffect(() => {
    if (!settings) {
      return;
    }

    if (!settings.lockEnabled) {
      setUnlocked(true);
    }
  }, [settings]);

  /*
   * If Face ID/passkey is configured,
   * immediately ask the browser to authenticate.
   *
   * On supported iPhones this can display Face ID.
   */
  useEffect(() => {
    if (
      !settings ||
      !settings.lockEnabled ||
      settings.lockMethod !== 'PASSKEY' ||
      !settings.passkeyCredentialId
    ) {
      return;
    }

    void verifyLocalPasskey(
      settings.passkeyCredentialId
    ).then(ok => {
      setUnlocked(ok);
    });
  }, [
    settings?.lockEnabled,
    settings?.lockMethod,
    settings?.passkeyCredentialId
  ]);

  /*
   * IndexedDB settings are still loading.
   */
  if (!settings) {
    return (
      <div className="app-loading">
        Loading...
      </div>
    );
  }

  /*
   * No lock configured or already authenticated.
   */
  if (
    !settings.lockEnabled ||
    unlocked
  ) {
    return <>{children}</>;
  }

  const currentSettings = settings;

  async function unlockPin() {
    setError('');

    if (!currentSettings.localPinHash) {
      setError(
        'PIN lock is not configured correctly.'
      );

      return;
    }

    const suppliedHash =
      await hashPin(pin);

    if (
      suppliedHash ===
      currentSettings.localPinHash
    ) {
      setUnlocked(true);
      setPin('');
      return;
    }

    setError('Incorrect PIN.');
    setPin('');
  }

  async function unlockPasskey() {
    setError('');

    if (
      !currentSettings.passkeyCredentialId
    ) {
      setError(
        'Face ID/passkey is not configured.'
      );

      return;
    }

    const ok =
      await verifyLocalPasskey(
        currentSettings.passkeyCredentialId
      );

    if (ok) {
      setUnlocked(true);
    } else {
      setError(
        'Face ID verification was not completed.'
      );
    }
  }

  return (
    <div className="lock-screen">
      <div className="lock-card">

        <div className="lock-mark">
          <LockKeyhole size={28} />
        </div>

        <span className="eyebrow">
          Private app
        </span>

        <h1>
          Unlock Expense Tracker
        </h1>

        <p className="muted">
          Your financial data is stored locally
          in this browser. Unlock the application
          to continue.
        </p>

        {currentSettings.lockMethod ===
        'PASSKEY' ? (
          <button
            className="primary-btn lock-action"
            onClick={() =>
              void unlockPasskey()
            }
          >
            <ShieldCheck size={18} />

            Unlock with Face ID / passkey
          </button>
        ) : (
          <>
            <input
              className="pin-input"
              inputMode="numeric"
              type="password"
              autoComplete="one-time-code"
              maxLength={8}
              value={pin}
              onChange={event =>
                setPin(event.target.value)
              }
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  void unlockPin();
                }
              }}
              placeholder="PIN"
            />

            <button
              className="primary-btn lock-action"
              onClick={() =>
                void unlockPin()
              }
            >
              Unlock
            </button>
          </>
        )}

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <p className="form-help">
          This is a local device lock.
        </p>

      </div>
    </div>
  );
}