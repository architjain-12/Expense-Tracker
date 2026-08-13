import { useEffect, useState, type ReactNode } from 'react';
import { KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useSettings } from '../hooks/useDb';
import { hashPin, resetPinWithRecovery, verifyLocalPasskey } from '../services/authService';
import { restoreFromGoogleSheets, getGoogleSheetsRecoveryHash } from '../services/googleSheetsService';

interface AppLockGuardProps { children: ReactNode; }

export default function AppLockGuard({ children }: AppLockGuardProps) {
  const settings = useSettings();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [recovery, setRecovery] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { if (settings && !settings.lockEnabled) setUnlocked(true); }, [settings]);
  useEffect(() => {
    if (!settings?.lockEnabled || !settings.passkeyCredentialId) return;
    void verifyLocalPasskey(settings.passkeyCredentialId).then(ok => setUnlocked(ok));
  }, [settings?.lockEnabled, settings?.passkeyCredentialId]);

  if (!settings) return <div className="app-loading">Loading...</div>;
  if (!settings.lockEnabled || unlocked) return <>{children}</>;

  async function unlockPin() {
    setError(''); setMessage('');
    if (!settings.localPinHash) { setError('PIN is not configured.'); return; }
    if ((await hashPin(pin)) === settings.localPinHash) { setUnlocked(true); setPin(''); }
    else { setError('Incorrect PIN.'); setPin(''); }
  }
  async function unlockPasskey() {
    setError('');
    if (!settings.passkeyCredentialId) { setError('Face ID/passkey is not configured.'); return; }
    if (await verifyLocalPasskey(settings.passkeyCredentialId)) setUnlocked(true);
    else setError('Face ID was not completed. Use PIN instead.');
  }
  async function recoverPin() {
    setError(''); setMessage('');
    try {
      let remoteHash: string | undefined;
      if (settings.googleSheetsEnabled && settings.googleSheetsEndpoint) remoteHash = await getGoogleSheetsRecoveryHash();
      const ok = await resetPinWithRecovery(recovery, newPin, remoteHash);
      if (!ok) { setError('Recovery code is incorrect or unavailable.'); return; }
      setShowRecovery(false); setShowPin(true); setPin(newPin); setNewPin(''); setRecovery(''); setMessage('PIN reset. Enter it to unlock.');
    } catch (e) { setError(e instanceof Error ? e.message : 'PIN recovery failed.'); }
  }
  async function recoverSheets() {
    try { await restoreFromGoogleSheets(); setMessage('Google Sheets data restored. You can now try authentication again.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Restore failed.'); }
  }

  return <div className="lock-screen"><div className="lock-card">
    <div className="lock-mark"><LockKeyhole size={28}/></div>
    <span className="eyebrow">Private app</span><h1>Unlock Expense Tracker</h1>
    <p className="muted">Use Face ID/passkey or your mandatory PIN. Your PIN remains the fallback authentication method.</p>
    {settings.passkeyCredentialId && <button className="primary-btn lock-action" onClick={()=>void unlockPasskey()}><ShieldCheck size={18}/> Unlock with Face ID / passkey</button>}
    <div className="lock-divider">PIN fallback</div>
    <input className="pin-input" inputMode="numeric" type="password" autoComplete="one-time-code" maxLength={8} value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void unlockPin();}} placeholder="PIN"/>
    <button className="primary-btn lock-action" onClick={()=>void unlockPin()}><KeyRound size={18}/> Unlock with PIN</button>
    <button className="text-link lock-forgot" onClick={()=>setShowRecovery(v=>!v)}>Forgot PIN?</button>
    {showRecovery && <div className="recovery-box"><p className="muted">Enter the recovery code saved during setup and choose a new PIN.</p><input value={recovery} onChange={e=>setRecovery(e.target.value)} placeholder="Recovery code"/><input inputMode="numeric" type="password" maxLength={8} value={newPin} onChange={e=>setNewPin(e.target.value)} placeholder="New PIN (4–8 digits)"/><button className="secondary-btn" onClick={()=>void recoverPin()}>Reset PIN</button></div>}
    {settings.googleSheetsEnabled && <button className="secondary-btn lock-action" onClick={()=>void recoverSheets()}>Restore from Google Sheets</button>}
    {error && <div className="form-error">{error}</div>}{message && <div className="success-note">{message}</div>}
  </div></div>;
}
