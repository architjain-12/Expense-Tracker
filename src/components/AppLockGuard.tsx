import { useEffect, useState, type ReactNode } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { useSettings } from '../hooks/useDb';
import { hashPin, verifyLocalPasskey } from '../services/authService';

export default function AppLockGuard({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!settings?.lockEnabled) setUnlocked(true);
  }, [settings?.lockEnabled]);

  useEffect(() => {
    if (settings?.lockEnabled && settings.lockMethod === 'PASSKEY' && settings.passkeyCredentialId) {
      void verifyLocalPasskey(settings.passkeyCredentialId).then(ok => setUnlocked(ok));
    }
  }, [settings?.lockEnabled, settings?.lockMethod, settings?.passkeyCredentialId]);

  if (!settings?.lockEnabled || unlocked) return <>{children}</>;
  const currentSettings = settings;

  async function unlockPin() {
    setError('');
  
    if (!currentSettings.localPinHash) {
      setError('PIN lock is not configured correctly.');
      return;
    }
  
    if ((await hashPin(pin)) === currentSettings.localPinHash) {
      setUnlocked(true);
      setPin('');
    } else {
      setError('Incorrect PIN.');
      setPin('');
    }
  }

  async function unlockPasskey() {
    setError('');
  
    if (!currentSettings.passkeyCredentialId) {
      setError('Passkey is not configured.');
      return;
    }
  
    const ok = await verifyLocalPasskey(
      currentSettings.passkeyCredentialId
    );
  
    if (ok) {
      setUnlocked(true);
    } else {
      setError('Device verification was not completed.');
    }
  }

  return <div className="lock-screen">
    <div className="lock-card">
      <div className="lock-mark"><LockKeyhole size={28} /></div>
      <span className="eyebrow">Private app</span>
      <h1>Unlock Expense Tracker</h1>
      <p className="muted">This device lock prevents accidental entry on a public URL. Your financial data remains in this browser's local storage.</p>
      {settings.lockMethod === 'PASSKEY' ? <button className="primary-btn lock-action" onClick={unlockPasskey}><ShieldCheck size={18}/> Unlock with Face ID / passkey</button> : <>
        <input className="pin-input" inputMode="numeric" type="password" maxLength={8} value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void unlockPin(); }} placeholder="PIN" />
        <button className="primary-btn lock-action" onClick={unlockPin}>Unlock</button>
      </>}
      {error && <div className="form-error">{error}</div>}
      <p className="form-help">Local device lock only. A future server-backed login can provide full account authentication.</p>
    </div>
  </div>;
}
