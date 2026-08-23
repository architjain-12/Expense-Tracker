import {
  useEffect,
  useState,
  type ReactNode
} from 'react';

import {
  LockKeyhole,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';

import { useSettings } from '../hooks/useDb';

import {
  hashPin,
  verifyLocalPasskey,
  emergencyDisableLock
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

  const [recoveryCode, setRecoveryCode] =
    useState('');

  const [showRecovery, setShowRecovery] =
    useState(false);

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

      if (!ok) {
        setError(
          'Face ID verification was not completed. You can try again or use Recovery.'
        );
      }
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
      setError('');
    } else {
      setError(
        'Face ID verification was not completed. You can try again or use Recovery.'
      );
    }
  }

  async function recoverAccess() {
    setError('');

    const normalizedCode =
      recoveryCode
        .replace(/[\s-]/g, '')
        .toUpperCase();

    if (normalizedCode.length !== 16) {
      setError(
        'Enter the complete 16-character recovery code.'
      );

      return;
    }

    try {
      await emergencyDisableLock(
        normalizedCode
      );

      /*
       * Unlock immediately for this session.
       *
       * emergencyDisableLock() has already
       * persisted lockEnabled=false in the
       * active partition.
       */
      setUnlocked(true);
      setRecoveryCode('');
      setShowRecovery(false);
      setError('');

    } catch (error) {
      console.error(
        'EMERGENCY RECOVERY FAILED:',
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : 'Emergency recovery failed.'
      );
    }
  }

  if (showRecovery) {
    return (
      <div className="lock-screen">
        <div className="lock-card">

          <div className="lock-mark">
            <ShieldCheck size={28} />
          </div>

          <span className="eyebrow">
            Emergency recovery
          </span>

          <h1>
            Recover access
          </h1>

          <p className="muted">
            Enter the recovery code you saved
            when device lock was configured.
          </p>

          <input
            className="pin-input"
            inputMode="text"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={19}
            value={recoveryCode}
            onChange={event => {
              const value =
                event.target.value
                  .replace(/[^a-zA-Z0-9]/g, '')
                  .toUpperCase()
                  .slice(0, 16);

              const formatted =
                value.match(/.{1,4}/g)
                  ?.join('-') ?? value;

              setRecoveryCode(formatted);
              setError('');
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                void recoverAccess();
              }
            }}
            placeholder="XXXX-XXXX-XXXX-XXXX"
          />

          <button
            type="button"
            className="primary-btn lock-action"
            onClick={() =>
              void recoverAccess()
            }
          >
            Recover access
          </button>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              setShowRecovery(false);
              setRecoveryCode('');
              setError('');
            }}
          >
            <ArrowLeft size={16} />
            Back to unlock
          </button>

          <p className="form-help">
            Recovery disables the local device
            lock for this partition. Your
            financial data is not deleted.
          </p>

        </div>
      </div>
    );
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
                setPin(
                  event.target.value
                    .replace(/\D/g, '')
                )
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

        <div className="lock-recovery">

          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              setShowRecovery(true);
              setError('');
            }}
          >
            Recover access
          </button>

          <p className="form-help">
            Can't use Face ID or your passkey?
            Use your recovery code to disable
            the device lock.
          </p>

        </div>

        <p className="form-help">
          This is a local device lock.
        </p>

      </div>
    </div>
  );
}