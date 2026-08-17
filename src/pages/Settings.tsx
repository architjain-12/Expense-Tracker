import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DatabaseBackup, FileUp, RefreshCcw, ShieldCheck, Smartphone, Unlock, Trash2, Plus, RotateCcw } from 'lucide-react';
import { db, getActivePartition, switchPartition } from '../db/database';
import { restoreFromGoogleSheets, syncWithGoogleSheets } from '../services/googleSheetsService';
import { useAccounts, useSettings } from '../hooks/useDb';
import { disableLock, enablePasskey, setLocalPin, webAuthnAvailable } from '../services/authService';
import type { Account, AccountType } from '../types/models';
import { newId } from '../utils/id';
import { createEncryptedArchive, createSafetyArchive, restoreEncryptedArchive, restoreLegacyJsonBackup } from '../services/backupService';
import { resetDemoData } from '../db/seed';
import packageJson from "../../package.json";

export default function Settings(){
 const settings=useSettings();const accounts=useAccounts();const fileRef=useRef<HTMLInputElement>(null);const [message,setMessage]=useState('');const [pin,setPin]=useState('');const [sheetUrl,setSheetUrl]=useState('');const [sheetToken,setSheetToken]=useState('');const [accountName,setAccountName]=useState('');const [accountType,setAccountType]=useState<AccountType>('BANK_ACCOUNT');const [statementDay,setStatementDay]=useState('');const [paymentDueDay,setPaymentDueDay]=useState('');
 const buildNumber = import.meta.env.VITE_BUILD_NUMBER || 'LOCAL';
 const appVersionNumber = packageJson.version || 'X.X.X';
 const commitSha = import.meta.env.VITE_COMMIT_SHA || 'dev';
 async function save(patch:Partial<NonNullable<typeof settings>>){const current=await db.settings.get('app');if(current)await db.settings.put({...current,...patch});}
 async function saveSheets(){await save({googleSheetsEndpoint:sheetUrl||settings?.googleSheetsEndpoint,googleSheetsToken:sheetToken||settings?.googleSheetsToken,googleSheetsEnabled:Boolean(sheetUrl||settings?.googleSheetsEndpoint)});setMessage('Google Sheets connection saved locally.');}
 async function sync(){const result=await syncWithGoogleSheets();setMessage(result.success?`Synced ${result.processed||0} changes.`:(result.message||'Sync failed.'));}
 async function restore(){const result=await restoreFromGoogleSheets();setMessage(result.message||`Restored ${result.restored} records.`);}
 async function exportBackup(){
  const password=prompt('Create a backup recovery password (minimum 8 characters). Store it outside the app.');
  if(!password)return;
  try { const manifest=await createEncryptedArchive(password, appVersionNumber, getActivePartition()); setMessage(`Encrypted backup created. ${manifest.entityCounts.transactions||0} transactions included.`); }
  catch(e){setMessage(e instanceof Error?e.message:'Backup export failed.');}
 }
 async function importBackup(file?:File){
  if(!file)return;
  try {
    const safetyPassword=prompt('Before restore, create a safety backup. Enter a recovery password for that safety backup (minimum 8 characters).');
    if(!safetyPassword)return;
    await createSafetyArchive(safetyPassword, appVersionNumber, getActivePartition());
    if(file.name.toLowerCase().endsWith('.json')) { const count=await restoreLegacyJsonBackup(file); setMessage(`Legacy JSON backup restored safely. ${count} transactions restored.`); }
    else { const password=prompt('Enter the backup recovery password.'); if(!password)return; const manifest=await restoreEncryptedArchive(file,password); setMessage(`Backup restored safely. ${manifest.entityCounts.transactions||0} transactions restored.`); }
    setTimeout(()=>window.location.reload(),500);
  } catch(e){setMessage(e instanceof Error?e.message:'Backup restore failed. Existing data was not intentionally changed unless restore had already begun.');}
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
 <section className="panel"><div className="panel-header"><div><h2>Backup & recovery</h2><p>Encrypted, integrity-checked local archive for device loss, corruption and migration. A safety archive is created before every restore.</p></div></div><div className="inline-actions"><button className="primary-btn" onClick={exportBackup}><DatabaseBackup size={16}/> Encrypted backup</button><button className="secondary-btn" onClick={exportCsv}>CSV</button><button className="secondary-btn" onClick={exportExcel}>Excel</button><label className="secondary-btn file-btn"><FileUp size={16}/> Restore .etarchive<input ref={fileRef} type="file" accept="application/json,.etarchive,.json" onChange={e=>void importBackup(e.target.files?.[0])}/></label></div></section>
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
