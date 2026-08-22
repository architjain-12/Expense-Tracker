import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DatabaseBackup, FileUp, RefreshCcw, ShieldCheck, Smartphone, Unlock, Trash2, Plus, RotateCcw } from 'lucide-react';
import { db, getActivePartition, switchPartition } from '../db/database';
import { restoreFromGoogleSheets, syncWithGoogleSheets } from '../services/googleSheetsService';
import { useAccounts, useSettings } from '../hooks/useDb';
import { disableLock, enablePasskey, setLocalPin, webAuthnAvailable } from '../services/authService';
import type { Account, AccountType, PendingBackup } from '../types/models';
import { newId } from '../utils/id';
import { createEncryptedArchive, createSafetyArchive, restoreEncryptedArchive, calculateNextAutoBackupAt, shareArchiveFile } from '../services/backupService';
import { resetDemoData } from '../db/seed';
import packageJson from "../../package.json";

export default function Settings(){
 const settings=useSettings();const accounts=useAccounts();const fileRef=useRef<HTMLInputElement>(null);const [message,setMessage]=useState('');const [backupMessage,setBackupMessage]=useState('');const [pin,setPin]=useState('');const [sheetUrl,setSheetUrl]=useState('');const [sheetToken,setSheetToken]=useState('');const [accountName,setAccountName]=useState('');const [accountType,setAccountType]=useState<AccountType>('BANK_ACCOUNT');const [statementDay,setStatementDay]=useState('');const [paymentDueDay,setPaymentDueDay]=useState('');
 const [pendingBackup,setPendingBackup]=useState<PendingBackup|null>(null);
 const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
 const [autoBackupDue, setAutoBackupDue] = useState(false);
 const [nextAutoBackup, setNextAutoBackup] = useState<Date | null>(null);
 const [autoBackupIntervalHours, setAutoBackupIntervalHours] =
  useState(168);
 const [autoBackupStartTime, setAutoBackupStartTime] = useState(
  settings?.autoBackupStartTime || '02:00'
  );
 const buildNumber = import.meta.env.VITE_BUILD_NUMBER || 'LOCAL';
 const appVersionNumber = packageJson.version || 'X.X.X';
 const commitSha = import.meta.env.VITE_COMMIT_SHA || 'dev';
 const AUTO_BACKUP_OPTIONS = [
  { label: 'Every 5 minutes · Testing', hours: 5 / 60 },
  { label: 'Every 2 hours', hours: 2 },
  { label: 'Every 6 hours', hours: 6 },
  { label: 'Every 24 hours', hours: 24 },
  { label: 'Every 3 days', hours: 72 },
  { label: 'Every 7 days', hours: 168 },
  { label: 'Every 30 days', hours: 720 },
];
useEffect(() => {
  if (!settings?.autoBackupEnabled) {
    setNextAutoBackup(null);
    return;
  }

  const updateNextBackup = () => {
    const next = calculateNextAutoBackupAt(settings);
    setNextAutoBackup(next);
  };

  updateNextBackup();

  // Refresh periodically so the displayed time stays current.
  const interval = window.setInterval(updateNextBackup, 60 * 1000);

  return () => window.clearInterval(interval);
}, [
  settings?.autoBackupEnabled,
  settings?.autoBackupIntervalHours,
  settings?.autoBackupStartTime,
  settings?.lastAutoBackupSavedAt,
]);
useEffect(() => {
  if (!settings) return;

  setAutoBackupEnabled(settings.autoBackupEnabled ?? false);

  setAutoBackupIntervalHours(
    settings.autoBackupIntervalHours || 168
  );

  setAutoBackupStartTime(
    settings.autoBackupStartTime || '02:00'
  );
}, [
  settings?.autoBackupEnabled,
  settings?.autoBackupIntervalHours,
  settings?.autoBackupStartTime,
]);
useEffect(() => {
  if (settings?.autoBackupStartTime) {
    setAutoBackupStartTime(settings.autoBackupStartTime);
  }
}, [settings?.autoBackupStartTime]);
useEffect(() => {
  void loadPendingBackup();
}, []);

 async function save(patch:Partial<NonNullable<typeof settings>>){const current=await db.settings.get('app');if(current)await db.settings.put({...current,...patch});}
 async function saveSheets(){await save({googleSheetsEndpoint:sheetUrl||settings?.googleSheetsEndpoint,googleSheetsToken:sheetToken||settings?.googleSheetsToken,googleSheetsEnabled:Boolean(sheetUrl||settings?.googleSheetsEndpoint)});setMessage('Google Sheets connection saved locally.');}
 async function sync(){const result=await syncWithGoogleSheets();setMessage(result.success?`Synced ${result.processed||0} changes.`:(result.message||'Sync failed.'));}
 async function restore(){const result=await restoreFromGoogleSheets();setMessage(result.message||`Restored ${result.restored} records.`);}
 async function exportCsv(){
  try {
   const rows=await db.transactions.toArray();
   const headers=['Date','Type','Amount','Currency','Account','Category','Subcategory','Merchant','Notes','Source','CreatedAt','UpdatedAt'];
   const esc=(v:unknown)=>`"${String(v??'').replaceAll('\"','\"\"')}"`;
   const csv=[headers.join(','),...rows.map((t:any)=>[t.transactionDateTime,t.type,t.amount,'INR',t.accountId,t.categoryId,t.subcategoryId,t.merchant,t.notes,t.source,t.createdAt,t.updatedAt].map(esc).join(','))].join('\n');
   const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`expense-tracker-transactions-${new Date().toISOString().slice(0,10)}.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),0);
   setBackupMessage(`CSV exported. ${rows.length} transactions included.`);
  } catch(e){setBackupMessage(e instanceof Error?e.message:'CSV export failed.');}
 }
 async function exportExcel(){
  try {
   const rows=await db.transactions.toArray();
   const esc=(v:unknown)=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\"','&quot;');
   const headers=['Date','Type','Amount','Currency','Account','Category','Subcategory','Merchant','Notes','Source','CreatedAt','UpdatedAt'];
   const html=`<html><head><meta charset="utf-8"></head><body><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((t:any)=>`<tr>${[t.transactionDateTime,t.type,t.amount,'INR',t.accountId,t.categoryId,t.subcategoryId,t.merchant,t.notes,t.source,t.createdAt,t.updatedAt].map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
   const blob=new Blob([html],{type:'application/vnd.ms-excel'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`expense-tracker-transactions-${new Date().toISOString().slice(0,10)}.xls`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),0);
   setBackupMessage(`Excel export created. ${rows.length} transactions included.`);
  } catch(e){setBackupMessage(e instanceof Error?e.message:'Excel export failed.');}
 }
 async function exportBackup(){
  // const password = prompt('Create a backup recovery password (minimum 8 characters). Store it outside the app.');
  // if(!password)return;
  try {
   const manifest=await createEncryptedArchive('1234567890', appVersionNumber, getActivePartition());
   const content = await manifest.archiveFile.text();

  const pending: PendingBackup = {
    id: 'auto',
    filename: manifest.archiveFile.name,
    content,
    createdAt: new Date().toISOString(),
  };

  await db.pendingBackups.put(pending);

  setPendingBackup(pending);

   setBackupMessage('Backup is ready. Tap “Save backup to Files” to open the iPhone share sheet.');
  } catch(e){setBackupMessage(e instanceof Error?e.message:'Backup export failed.');}
 }
 async function savePendingBackup() {
  if (!pendingBackup) return;

  try {
    const file = new File(
      [pendingBackup.content],
      pendingBackup.filename,
      {
        type: 'text/plain',
      }
    );

    const mode = await shareArchiveFile(file);

    if (mode === 'shared') {
      await db.pendingBackups.delete('auto');

      await save({
        lastAutoBackupSavedAt: new Date().toISOString(),
      });

      setPendingBackup(null);
      setAutoBackupDue(false);

      setBackupMessage(
        'Backup saved. Choose “Save to Files”, iCloud Drive, or another destination.'
      );
    } else {
      setBackupMessage(
        'Backup downloaded successfully.'
      );
    }
  } catch (e) {
    setBackupMessage(
      e instanceof Error
        ? e.message
        : 'Could not save backup.'
    );
  }
}
 async function importBackup(file?: File) {
  console.log({
    secureContext: window.isSecureContext,
    crypto: typeof crypto,
    subtle: typeof crypto?.subtle,
  });
  if (!file) {
    setBackupMessage('No backup file selected.');
    return;
  }

  setBackupMessage(`Reading backup: ${file.name}...`);

  try {
    console.log('RESTORE: file selected', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    const fileText = await file.text();

    setBackupMessage(`Backup file read: ${fileText.length} characters...`);

    let isEncryptedArchive = false;

    try {
      const parsed = JSON.parse(fileText);

      console.log('RESTORE: JSON parsed', parsed);

      isEncryptedArchive =
        parsed?.manifest?.format === 'ETAR-1' &&
        parsed?.manifest?.encrypted === true;
    } catch {
      console.log('RESTORE: JSON parsing failed');
    }

    if (!isEncryptedArchive) {
      setBackupMessage('Selected file is not a valid ETAR encrypted backup.');
      return;
    }

    setBackupMessage('Valid ETAR backup found. Asking for password...');

    // const password = prompt('Enter the backup recovery password.');

    // if (!password) {
    //   setBackupMessage('Restore cancelled: no password entered.');
    //   return;
    // }

    setBackupMessage('Decrypting backup...');

    const encryptedFile = new File(
      [fileText],
      file.name,
      { type: 'text/plain' }
    );

    const manifest = await restoreEncryptedArchive(
      encryptedFile,
      '1234567890'
    );

    setBackupMessage(
      `Backup restored successfully. ${
        manifest.entityCounts.transactions || 0
      } transactions restored.`
    );

    setTimeout(() => window.location.reload(), 500);

  } catch (e) {
    console.error('RESTORE FAILED:', e);

    const errorMessage =
      e instanceof Error
        ? `${e.name}: ${e.message}`
        : String(e);

    setBackupMessage(`RESTORE ERROR: ${errorMessage}`);
  }
}
async function loadPendingBackup() {
  try {
    const pending = await db.pendingBackups.get('auto');

    if (pending) {
      setPendingBackup(pending);
      setBackupMessage(
        'A backup is waiting to be saved. Tap “Save backup to Files”.'
      );
    }
  } catch (e) {
    console.error('Could not load pending backup:', e);
  }
}
async function checkAutoBackup() {
  if (!settings?.autoBackupEnabled) {
    setAutoBackupDue(false);
    return;
  }

  const intervalHours = settings.autoBackupIntervalHours || 168;
  const startTime = settings.autoBackupStartTime || '02:00';

  const [hours, minutes] = startTime.split(':').map(Number);

  const now = new Date();

  // First backup: use today's configured start time.
  const scheduledStart = new Date(now);
  scheduledStart.setHours(hours, minutes, 0, 0);

  // If today's start time has not happened yet,
  // the first backup is not due yet.
  if (!settings.lastAutoBackupSavedAt) {
    setAutoBackupDue(now >= scheduledStart);
    return;
  }

  const lastBackup = new Date(
    settings.lastAutoBackupSavedAt
  ).getTime();

  const due =
    Date.now() - lastBackup >= intervalHours * 60 * 60 * 1000;

  setAutoBackupDue(due);
}

async function createAutoBackup() {
  try {
    const manifest = await createEncryptedArchive(
      '1234567890',
      appVersionNumber,
      getActivePartition(),
      'expense-tracker-auto-backup'
    );

    const content = await manifest.archiveFile.text();

    const pending: PendingBackup = {
      id: 'auto',
      filename: manifest.archiveFile.name,
      content,
      createdAt: new Date().toISOString(),
    };

    await db.pendingBackups.put(pending);

    setPendingBackup(pending);

    setBackupMessage(
      'Your scheduled backup is ready. Tap “Save backup to Files”.'
    );
  } catch (e) {
    setBackupMessage(
      e instanceof Error
        ? `Automatic backup failed: ${e.message}`
        : 'Automatic backup failed.'
    );
  }
}

 async function addAccount(){if(!accountName.trim())return;const now=new Date().toISOString();const a:Account={id:newId('account'),name:accountName.trim(),type:accountType,isDefault:accounts.length===0,active:true,statementDay:accountType==='CREDIT_CARD'?Number(statementDay)||undefined:undefined,paymentDueDay:accountType==='CREDIT_CARD'?Number(paymentDueDay)||undefined:undefined,createdAt:now,updatedAt:now};await db.accounts.put(a);if(a.isDefault)await save({defaultAccountId:a.id});setAccountName('');setMessage('Account added.')}
 async function editAccount(a:Account){const name=prompt('Account name',a.name);if(!name?.trim())return;const updated={...a,name:name.trim(),updatedAt:new Date().toISOString()};await db.accounts.put(updated);setMessage('Account updated.')}
 async function setPrimary(a:Account){await db.accounts.toCollection().modify(x=>{x.isDefault=x.id===a.id;x.updatedAt=new Date().toISOString()});await save({defaultAccountId:a.id});setMessage(`${a.name} is now the default account.`)}
 async function deleteAll(){if(getActivePartition()==='demo'){setMessage('Demo data cannot be master-deleted. Use Restore Demo Data instead.');return;}if(!confirm('Delete ALL local data in this partition? This cannot be undone.'))return;await db.delete();window.location.reload();}
 async function restoreDemo(){if(getActivePartition()!=='demo')return; if(!confirm('Restore the original Demo dataset? All changes made inside Demo will be replaced.'))return; try{await resetDemoData();setMessage('Demo data restored to the original dataset.');setTimeout(()=>window.location.reload(),300);}catch(e){setMessage(e instanceof Error?e.message:'Could not restore demo data.');}}
 async function lockPasskey(){try{await enablePasskey();setMessage('Device passkey lock enabled.');}catch(e){setMessage(e instanceof Error?e.message:'Could not enable passkey lock.');}}
 async function lockPin(){try{await setLocalPin(pin);setPin('');setMessage('PIN lock enabled.');}catch(e){setMessage(e instanceof Error?e.message:'Could not enable PIN lock.');}}
 async function unlock(){await disableLock();setMessage('Device lock disabled.');}
 return <div className="page-stack"><section className="hero-row"><div><Link to="/options" className="text-link">← Options</Link><span className="eyebrow">Options</span><h1>Settings</h1><p className="muted">Defaults, reporting, accounts, recovery, partitions and device lock.</p></div></section>{message&&<div className="success-banner">{message}</div>}
 <section className="panel"><div className="panel-header"><div><h2>Appearance & reporting</h2><p>Choose light/dark mode and your definition of a reporting year.</p></div></div><div className="settings-grid"><label>Theme<select value={settings?.theme||'dark'} onChange={e=>save({theme:e.target.value as any})}><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></label><label>Year reporting<select value={settings?.reportingYear||'FY'} onChange={e=>save({reportingYear:e.target.value as any})}><option value="FY">Indian FY · Apr–Mar</option><option value="CALENDAR">Calendar year · Jan–Dec</option></select></label></div></section>
 <section className="panel"><div className="panel-header"><div><h2>Accounts</h2><p>Create or modify accounts used by transactions.</p></div></div><div className="settings-grid"><label>Account name<input value={accountName} onChange={e=>setAccountName(e.target.value)} placeholder="ICICI Savings"/></label><label>Type<select value={accountType} onChange={e=>setAccountType(e.target.value as AccountType)}><option value="BANK_ACCOUNT">Bank account</option><option value="CREDIT_CARD">Credit card</option><option value="CASH">Cash</option><option value="WALLET">Wallet</option><option value="INVESTMENT">Investment</option><option value="OTHER">Other</option></select></label>{accountType==='CREDIT_CARD'&&<><label>Statement/billed day<input type="number" min="1" max="31" value={statementDay} onChange={e=>setStatementDay(e.target.value)} placeholder="25"/></label><label>Payment due day<input type="number" min="1" max="31" value={paymentDueDay} onChange={e=>setPaymentDueDay(e.target.value)} placeholder="10"/></label></>}</div><div className="inline-actions"><button className="primary-btn" onClick={addAccount}><Plus size={16}/> Add account</button></div><div className="stacked-list">{accounts.map(a=><div className="stat-row" key={a.id}><span>{a.name} · {a.type.replaceAll('_',' ')}{a.type==='CREDIT_CARD'&&a.statementDay?` · statement ${a.statementDay} · due ${a.paymentDueDay||'—'}`:''}</span><span className="inline-actions"><button className="icon-btn small" onClick={()=>editAccount(a)}>Edit</button>{!a.isDefault&&<button className="icon-btn small" onClick={()=>setPrimary(a)}>Primary</button>}</span></div>)}</div></section>
 <section className="panel"><div className="panel-header"><div><h2>Transaction defaults</h2><p>Keep Add Transaction fast.</p></div></div><div className="settings-grid"><label>Default account<select value={settings?.defaultAccountId||''} onChange={e=>save({defaultAccountId:e.target.value||undefined})}><option value="">No default</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Needs / Wants<select value={settings?.defaultNeedWant||''} onChange={e=>save({defaultNeedWant:e.target.value as any||undefined})}><option value="">No default</option><option value="NEED">Needs</option><option value="WANT">Wants</option></select></label><label>Essential / Discretionary<select value={settings?.defaultEssentialDiscretionary||''} onChange={e=>save({defaultEssentialDiscretionary:e.target.value as any||undefined})}><option value="">No default</option><option value="ESSENTIAL">Essential</option><option value="DISCRETIONARY">Discretionary</option></select></label><label>Fixed / Variable<select value={settings?.defaultFixedVariable||''} onChange={e=>save({defaultFixedVariable:e.target.value as any||undefined})}><option value="">No default</option><option value="FIXED">Fixed</option><option value="VARIABLE">Variable</option></select></label></div></section>
 <section className="panel"><div className="panel-header"><div><h2>Google Sheets</h2><p>Cloud copy and recovery. Credentials are runtime-only settings.</p></div><ShieldCheck size={18}/></div><div className="warning-note">When local data is empty and a valid connection already exists, the app can attempt a smart restore. No credentials are embedded in the public repository.</div><label>Apps Script endpoint<input value={sheetUrl||settings?.googleSheetsEndpoint||''} onChange={e=>setSheetUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec"/></label><label>Sync token<input type="password" value={sheetToken||settings?.googleSheetsToken||''} onChange={e=>setSheetToken(e.target.value)} placeholder="Personal sync key"/></label><div className="inline-actions"><button className="secondary-btn" onClick={saveSheets}>Save connection</button><button className="primary-btn" onClick={sync}><RefreshCcw size={16}/> Sync now</button><button className="secondary-btn" onClick={restore}><DatabaseBackup size={16}/> Restore</button></div></section>
 <section className="panel">
  <div className="panel-header">
    <div>
      <h2>Automatic backup</h2>
      <p>
        Create an encrypted backup when you return to the app after
        the selected interval. The backup will wait for you to save it
        to Files.
      </p>
    </div>

    <DatabaseBackup size={18} />
  </div>

  <div className="settings-grid">

    <label>
      Automatic backup
      <select
        value={settings?.autoBackupEnabled ? 'ON' : 'OFF'}
        onChange={async e => {
          const enabled = e.target.value === 'ON';

          await save({
            autoBackupEnabled: enabled,
            ...(enabled && !settings?.lastAutoBackupSavedAt
              ? { lastAutoBackupSavedAt: undefined }
              : {}),
          });

          setAutoBackupDue(enabled);
        }}
      >
        <option value="OFF">Off</option>
        <option value="ON">On</option>
      </select>
    </label>

    {settings?.autoBackupEnabled && (
      <>
      <label>
        Backup frequency
        <select
          value={settings.autoBackupIntervalHours || 168}
          onChange={async e => {
            await save({
              autoBackupIntervalHours: Number(e.target.value),
            });

            setAutoBackupDue(true);
          }}
        >
          {AUTO_BACKUP_OPTIONS.map(option => (
            <option
              key={option.hours}
              value={option.hours}
            >
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
      Start time
      <input
        type="time"
        value={autoBackupStartTime}
        onChange={e =>
          setAutoBackupStartTime(e.target.value)
        }
      />
      </label>
      </>
    )}
  </div>

  {settings?.autoBackupEnabled && (
  <div className="form-help">
    {settings.lastAutoBackupSavedAt && (
      <div>
        Last backup:{' '}
        {new Date(
          settings.lastAutoBackupSavedAt
        ).toLocaleString()}
      </div>
    )}

    {nextAutoBackup && (
      <div>
        Next backup:{' '}
        {nextAutoBackup.toLocaleString()}
      </div>
    )}
  </div>
  )}

  {autoBackupDue && !pendingBackup && (
    <div className="inline-actions">
      <button
        className="primary-btn"
        onClick={() => void createAutoBackup()}
      >
        <DatabaseBackup size={16} />
        Create backup now
      </button>
    </div>
  )}

  {pendingBackup && (
    <div className="inline-actions">
      <button
        className="primary-btn"
        onClick={() => void savePendingBackup()}
      >
        <DatabaseBackup size={16} />
        Save backup to Files
      </button>
    </div>
  )}

<div className="inline-actions">
  <button
    className="primary-btn"
    onClick={async () => {
      await save({
        autoBackupEnabled,
        autoBackupIntervalHours,
        autoBackupStartTime,
      });

      // Keep the UI state synchronized immediately.
      setAutoBackupEnabled(autoBackupEnabled);
      setAutoBackupIntervalHours(autoBackupIntervalHours);
      setAutoBackupStartTime(autoBackupStartTime);

      const updatedSettings = await db.settings.get('app');

      if (updatedSettings) {
        const next = calculateNextAutoBackupAt(updatedSettings);
        setNextAutoBackup(next);
      }
      setMessage('Automatic backup settings saved locally.');
    }}
    >
      <DatabaseBackup size={16} />
      Save backup settings
    </button>
  </div>
</section>
 <section className="panel"><div className="panel-header"><div><h2>Backup & recovery</h2><p>Encrypted, integrity-checked local archive for device loss, corruption and migration. A safety archive is created before every restore.</p></div></div>{backupMessage&&<div className="success-banner">{backupMessage}</div>}<div className="inline-actions"><button className="primary-btn" onClick={exportBackup}><DatabaseBackup size={16}/> Encrypted backup</button>{pendingBackup&&<button className="primary-btn" onClick={savePendingBackup}><DatabaseBackup size={16}/> Save backup to Files</button>}<button className="secondary-btn" onClick={exportCsv}>CSV</button><button className="secondary-btn" onClick={exportExcel}>Excel</button><label className="secondary-btn file-btn"><FileUp size={16}/> Restore .etarchive<input ref={fileRef} type="file" accept="*/*" onChange={e=>void importBackup(e.target.files?.[0])}/></label></div></section>
 <section className="panel"><div className="panel-header"><div><h2>Data partition</h2><p>Personal and Demo are isolated IndexedDB namespaces.</p></div></div><div className="settings-grid"><label>Active partition<input value={getActivePartition()==='demo'?'Demo':'Personal'} readOnly/></label></div><div className="inline-actions"><button className="secondary-btn" onClick={()=>switchPartition('demo')}>Show Demo Data</button><button className="secondary-btn" onClick={()=>switchPartition('personal')}>My Data</button>{getActivePartition()==='demo'?<button className="secondary-btn" onClick={restoreDemo}><RotateCcw size={15}/> Restore Demo Data</button>:<button className="danger-btn" onClick={deleteAll}><Trash2 size={15}/> Master Delete This Partition</button>}</div><p className="form-help">Demo mode is for showcasing the app. A PIN can be added through Device Lock, but the partition is not a substitute for encryption.</p></section>
 <section className="panel"><div className="panel-header"><div><h2>Device Lock</h2><p>Protect against accidental entry on a shared device.</p></div><Smartphone size={18}/></div>{settings?.lockEnabled?<div className="inline-actions"><span className="sync-state"><span className="status-dot online"/> Lock enabled ({settings.lockMethod})</span><button className="secondary-btn" onClick={unlock}><Unlock size={16}/> Disable</button></div>:<><div className="settings-grid"><label>PIN<input inputMode="numeric" type="password" maxLength={8} value={pin} onChange={e=>setPin(e.target.value)} placeholder="4–8 digits"/></label></div><div className="inline-actions"><button className="secondary-btn" onClick={lockPin} disabled={!pin}>Enable PIN</button>{webAuthnAvailable()&&<button className="primary-btn" onClick={lockPasskey}><ShieldCheck size={16}/> Enable Face ID / passkey</button>}</div></>}</section>
 <section className="panel">
  <div className="panel-header">
    <div>
      <h2>About</h2> <p> v{appVersionNumber}</p>
    </div>
  </div>

  <div className="empty-inline">
    <div className="trace-signature">
      <strong>TRACE</strong> ✧ <strong>T</strong>rack · <strong>R</strong>ecord · <strong>A</strong>nalyze · <strong>C</strong>ategorize · <strong>E</strong>stimate
    </div>
  </div>


  <div className="empty-inline trace-credit">
      Designed & Developed by A J · React · IndexedDB · Google Sheets · Local-first architecture
    </div>
 
    <div className="empty-inline">
      Build #{buildNumber} · {commitSha.substring(0, 7)}
    </div>
  </section>
 </div>;
}