import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DatabaseBackup, Download, FileUp, RefreshCcw, ShieldCheck, Smartphone, Unlock } from 'lucide-react';
import { db } from '../db/database';
import { restoreFromGoogleSheets, syncWithGoogleSheets } from '../services/googleSheetsService';
import { useAccounts, useSettings } from '../hooks/useDb';
import { disableLock, enablePasskey, setLocalPin, webAuthnAvailable } from '../services/authService';

export default function Settings(){
  const settings=useSettings(); const accounts=useAccounts(); const fileRef=useRef<HTMLInputElement>(null); const [message,setMessage]=useState(''); const [pin,setPin]=useState(''); const [sheetUrl,setSheetUrl]=useState(''); const [sheetToken,setSheetToken]=useState('');
  const [defaultNeedWant,setDefaultNeedWant]=useState(settings?.defaultNeedWant||''); const [defaultED,setDefaultED]=useState(settings?.defaultEssentialDiscretionary||''); const [defaultFV,setDefaultFV]=useState(settings?.defaultFixedVariable||'');
  async function saveDefaults(){const existing=await db.settings.get('app');if(!existing)return;await db.settings.put({...existing,defaultNeedWant:defaultNeedWant as any||undefined,defaultEssentialDiscretionary:defaultED as any||undefined,defaultFixedVariable:defaultFV as any||undefined});setMessage('Defaults saved locally.');}
  async function saveSheets(){const existing=await db.settings.get('app');if(!existing)return;await db.settings.put({...existing,googleSheetsEndpoint:sheetUrl||existing.googleSheetsEndpoint,googleSheetsToken:sheetToken||existing.googleSheetsToken,googleSheetsEnabled:Boolean(sheetUrl||existing.googleSheetsEndpoint)});setMessage('Google Sheets connection saved locally.');}
  async function sync(){const result=await syncWithGoogleSheets();setMessage(result.success?`Synced ${result.processed||0} changes.`:(result.message||'Sync failed.'));}
  async function restore(){const result=await restoreFromGoogleSheets();setMessage(result.message || `Restored ${result.restored} records.`);}
  async function exportBackup(){const snapshot={transactions:await db.transactions.toArray(),accounts:await db.accounts.toArray(),categories:await db.categories.toArray(),recurringRules:await db.recurringRules.toArray(),reviewQueue:await db.reviewQueue.toArray(),budgets:await db.budgets.toArray(),investments:await db.investments.toArray(),settings:await db.settings.toArray()};const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`expense-tracker-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);}
  async function importBackup(file?:File){if(!file)return;try{const data=JSON.parse(await file.text()) as Record<string,unknown[]>;await db.transaction('rw',[db.transactions,db.accounts,db.categories,db.recurringRules,db.reviewQueue,db.budgets,db.investments,db.settings],async()=>{if(data.transactions)await db.transactions.bulkPut(data.transactions as any[]);if(data.accounts)await db.accounts.bulkPut(data.accounts as any[]);if(data.categories)await db.categories.bulkPut(data.categories as any[]);if(data.recurringRules)await db.recurringRules.bulkPut(data.recurringRules as any[]);if(data.reviewQueue)await db.reviewQueue.bulkPut(data.reviewQueue as any[]);if(data.budgets)await db.budgets.bulkPut(data.budgets as any[]);if(data.investments)await db.investments.bulkPut(data.investments as any[]);if(data.settings)await db.settings.bulkPut(data.settings as any[]);});setMessage('Backup restored.');}catch(e){setMessage(e instanceof Error?e.message:'Backup import failed.');}}
  async function lockPasskey(){try{await enablePasskey();setMessage('Device passkey lock enabled. On supported iPhones this can use Face ID/passkeys.');}catch(e){setMessage(e instanceof Error?e.message:'Could not enable passkey lock.');}}
  async function lockPin(){try{await setLocalPin(pin);setPin('');setMessage('PIN lock enabled.');}catch(e){setMessage(e instanceof Error?e.message:'Could not enable PIN lock.');}}
  async function unlock(){await disableLock();setMessage('Device lock disabled.');}
  return <div className="page-stack"><section className="hero-row"><div><Link to="/options" className="text-link">← Options</Link><span className="eyebrow">Options</span><h1>Settings</h1><p className="muted">Local preferences, cloud recovery, backup and device lock.</p></div></section>
    {message&&<div className="success-banner">{message}</div>}
    <section className="panel"><div className="panel-header"><div><h2>Transaction defaults</h2><p>Keep the add screen fast.</p></div></div><div className="settings-grid"><label>Default account<select value={settings?.defaultAccountId||''} onChange={async e=>{const current=await db.settings.get('app');if(current)await db.settings.put({...current,defaultAccountId:e.target.value||undefined});}}><option value="">No default</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}{a.isDefault?' · primary':''}</option>)}</select></label><label>Needs / Wants<select value={defaultNeedWant} onChange={e=>setDefaultNeedWant(e.target.value)}><option value="">No default</option><option value="NEED">Needs</option><option value="WANT">Wants</option></select></label><label>Essential / Discretionary<select value={defaultED} onChange={e=>setDefaultED(e.target.value)}><option value="">No default</option><option value="ESSENTIAL">Essential</option><option value="DISCRETIONARY">Discretionary</option></select></label><label>Fixed / Variable<select value={defaultFV} onChange={e=>setDefaultFV(e.target.value)}><option value="">No default</option><option value="FIXED">Fixed</option><option value="VARIABLE">Variable</option></select></label></div><div className="inline-actions"><button className="primary-btn" onClick={saveDefaults}>Save defaults</button></div></section>
    <section className="panel"><div className="panel-header"><div><h2>Google Sheets</h2><p>Cloud copy, recovery and reporting. Credentials are runtime-only settings.</p></div><ShieldCheck size={18}/></div><div className="warning-note">Do not commit this URL or token to GitHub. The browser stores them in IndexedDB on this device.</div><label>Apps Script endpoint<input value={sheetUrl||settings?.googleSheetsEndpoint||''} onChange={e=>setSheetUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec"/></label><label>Sync token<input type="password" value={sheetToken||settings?.googleSheetsToken||''} onChange={e=>setSheetToken(e.target.value)} placeholder="Personal sync key"/></label><div className="inline-actions"><button className="secondary-btn" onClick={saveSheets}>Save connection</button><button className="primary-btn" onClick={sync}><RefreshCcw size={16}/> Sync now</button><button className="secondary-btn" onClick={restore}><DatabaseBackup size={16}/> Restore from Sheets</button></div><p className="form-help">When local transactions are empty and a valid connection already exists, the app can silently attempt a restore on launch. If no connection exists, use this section to connect first.</p></section>
    <section className="panel"><div className="panel-header"><div><h2>Backup & recovery</h2><p>Always keep a portable copy of your local database.</p></div><DatabaseBackup size={18}/></div><div className="inline-actions"><button className="secondary-btn" onClick={exportBackup}><Download size={16}/> Export JSON backup</button><label className="secondary-btn file-btn"><FileUp size={16}/> Import backup<input ref={fileRef} type="file" accept="application/json,.json" onChange={e=>void importBackup(e.target.files?.[0])}/></label></div></section>
    <section className="panel">
  <div className="panel-header">
    <div>
      <h2>Device Lock</h2>

      <p>
        Protect the app on this device even if somebody discovers
        the public GitHub Pages URL.
      </p>
    </div>

    <Smartphone size={18} />
  </div>

  <div className="warning-note">
    Face ID/passkey uses the browser's platform authenticator.
    On supported iPhones this can use Face ID or the device passcode.
    This is a local device lock, not a server-backed account login.
  </div>

  {settings?.lockEnabled ? (
    <div className="device-lock-status">
      <div className="sync-state">
        <span className="status-dot online" />

        Lock enabled

        <span className="muted">
          ({settings.lockMethod})
        </span>
      </div>

      <div className="inline-actions">
        <button
          className="secondary-btn"
          onClick={unlock}
        >
          <Unlock size={16} />
          Disable lock
        </button>
      </div>
    </div>
  ) : (
    <>
      <div className="settings-grid">
        <label>
          PIN lock

          <input
            inputMode="numeric"
            type="password"
            maxLength={8}
            value={pin}
            onChange={event =>
              setPin(event.target.value)
            }
            placeholder="4–8 digits"
          />
        </label>
      </div>

      <div className="inline-actions">
        <button
          className="secondary-btn"
          onClick={lockPin}
          disabled={!pin}
        >
          Enable PIN
        </button>

        {webAuthnAvailable() && (
          <button
            className="primary-btn"
            onClick={lockPasskey}
          >
            <ShieldCheck size={16} />

            Enable Face ID / passkey
          </button>
        )}
      </div>

      {!webAuthnAvailable() && (
        <p className="form-help">
          Face ID/passkey requires HTTPS and a browser
          that supports WebAuthn platform authentication.
          You can use a PIN instead.
        </p>
      )}
    </>
  )}
</section>
  </div>;
}
