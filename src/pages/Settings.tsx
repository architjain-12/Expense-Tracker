import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DatabaseBackup, FileUp, RefreshCcw, ShieldCheck, Smartphone, Unlock, Trash2, Plus, RotateCcw } from 'lucide-react';
import { db, getActivePartition, switchPartition } from '../db/database';
import { restoreFromGoogleSheets, syncWithGoogleSheets } from '../services/googleSheetsService';
import { useAccounts, useSettings } from '../hooks/useDb';
import { disableLock, enablePasskey, setLocalPin, webAuthnAvailable } from '../services/authService';
import type { Account, AccountType, PendingBackup } from '../types/models';
import { newId } from '../utils/id';
import {
  createEncryptedArchive,
  createSafetyArchive,
  restoreEncryptedArchive,
  shareArchiveFile,
  savePendingRestore,
  clearPendingRestore,
} from '../services/backupService';
import { resetDemoData } from '../db/seed';
import packageJson from "../../package.json";

export default function Settings(){
 const settings=useSettings();const accounts=useAccounts();const fileRef=useRef<HTMLInputElement>(null);const [message,setMessage]=useState('');const [backupMessage,setBackupMessage]=useState('');const [pin,setPin]=useState('');const [sheetUrl,setSheetUrl]=useState('');const [sheetToken,setSheetToken]=useState('');const [accountName,setAccountName]=useState('');const [accountType,setAccountType]=useState<AccountType>('BANK_ACCOUNT');const [statementDay,setStatementDay]=useState('');const [paymentDueDay,setPaymentDueDay]=useState('');
 const [pendingBackup,setPendingBackup]=useState<PendingBackup|null>(null);
 const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
 const [autoBackupDue, setAutoBackupDue] = useState(false);
 const [autoBackupIntervalHours, setAutoBackupIntervalHours] =
  useState(168);
 const [autoBackupStartTime, setAutoBackupStartTime] = useState(
  settings?.autoBackupStartTime || '02:00'
  );
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreManifest, setRestoreManifest] = useState<any>(null);
  const [restoreSourcePartition, setRestoreSourcePartition] =
    useState<'personal' | 'demo' | null>(null);
  const [restoreTargetPartition, setRestoreTargetPartition] =
    useState<'personal' | 'demo' | null>(null);
  const [restoreMode, setRestoreMode] =
    useState<'merge' | 'replace' | null>(null);
  const [restoreHasNewerData, setRestoreHasNewerData] = useState(false);
  const [showRestoreOptions, setShowRestoreOptions] = useState(false);
  const [showRestoreMode, setShowRestoreMode] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
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
 function createImportedTransactionFingerprint(
  transaction: Partial<Transaction>
): string {
  return [
    transaction.transactionDateTime || '',
    transaction.type || '',
    transaction.amount ?? '',
    transaction.accountId || '',
    transaction.categoryId || '',
    transaction.subcategoryId || '',
    transaction.merchant || '',
    transaction.notes || '',
  ]
    .map(value => String(value).trim())
    .join('|')
    .toLowerCase();
}

function normalizeImportedTransaction(
  row: Record<string, string>
): Transaction | null {
  const date =
    row.Date?.trim() ||
    row.transactionDateTime?.trim();

  const type =
    row.Type?.trim() as Transaction['type'];

  const amount =
    Number(
      String(row.Amount || '')
        .replace(/,/g, '')
        .trim()
    );

  if (
    !date ||
    !['EXPENSE', 'INCOME', 'TRANSFER'].includes(type) ||
    !Number.isFinite(amount)
  ) {
    return null;
  }

  const now =
    new Date().toISOString();

  return {
    id: newId('transaction'),

    type,

    amount,

    transactionDateTime: date,

    accountId:
      row.Account?.trim() || '',

    categoryId:
      row.Category?.trim() || undefined,

    subcategoryId:
      row.Subcategory?.trim() || undefined,

    merchant:
      row.Merchant?.trim() || undefined,

    notes:
      row.Notes?.trim() || undefined,

    source: 'IMPORT',

    createdAt:
      row.CreatedAt?.trim() || now,

    updatedAt:
      row.UpdatedAt?.trim() || now,

    syncStatus: 'LOCAL',
  };
}

function parseCsvLine(
  line: string
): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (
        insideQuotes &&
        line[i + 1] === '"'
      ) {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (
      char === ',' &&
      !insideQuotes
    ) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);

  return result;
}

function parseCsv(
  text: string
): Record<string, string>[] {
  const lines =
    text
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter(line => line.trim().length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers =
    parseCsvLine(lines[0]).map(
      header => header.trim()
    );

  return lines
    .slice(1)
    .map(line => {
      const values =
        parseCsvLine(line);

      const row: Record<string, string> = {};

      headers.forEach(
        (header, index) => {
          row[header] =
            values[index] ?? '';
        }
      );

      return row;
    });
}

async function importCsv(
  file: File
) {
  try {
    const text =
      await file.text();

    const rows =
      parseCsv(text);

    if (!rows.length) {
      throw new Error(
        'CSV file does not contain any transactions.'
      );
    }

    const existing =
      await db.transactions.toArray();

    const existingFingerprints =
      new Set(
        existing.map(
          createImportedTransactionFingerprint
        )
      );

    const imported: Transaction[] = [];

    for (const row of rows) {
      const transaction =
        normalizeImportedTransaction(row);

      if (!transaction) {
        continue;
      }

      const fingerprint =
        createImportedTransactionFingerprint(
          transaction
        );

      if (
        existingFingerprints.has(
          fingerprint
        )
      ) {
        continue;
      }

      if (
        imported.some(
          existingTransaction =>
            createImportedTransactionFingerprint(
              existingTransaction
            ) === fingerprint
        )
      ) {
        continue;
      }

      imported.push(transaction);
    }

    if (!imported.length) {
      setBackupMessage(
        'No new transactions found in the CSV.'
      );
      return;
    }

    await db.transactions.bulkPut(
      imported
    );

    setBackupMessage(
      `CSV imported successfully. ${imported.length} new transactions added.`
    );
  } catch (e) {
    console.error(
      'CSV IMPORT FAILED:',
      e
    );

    setBackupMessage(
      e instanceof Error
        ? `CSV import failed: ${e.message}`
        : 'CSV import failed.'
    );
  }
}

async function importExcel(
  file: File
) {
  try {
    const html =
      await file.text();

    const parser =
      new DOMParser();

    const document =
      parser.parseFromString(
        html,
        'text/html'
      );

    const rows =
      Array.from(
        document.querySelectorAll('table tr')
      );

    if (rows.length < 2) {
      throw new Error(
        'Excel file does not contain a valid transaction table.'
      );
    }

    const headers =
      Array.from(
        rows[0].querySelectorAll('th,td')
      ).map(cell =>
        cell.textContent?.trim() || ''
      );

    const dataRows =
      rows.slice(1);

    const parsedRows =
      dataRows.map(row => {
        const values =
          Array.from(
            row.querySelectorAll('td,th')
          ).map(cell =>
            cell.textContent?.trim() || ''
          );

        const result:
          Record<string, string> = {};

        headers.forEach(
          (header, index) => {
            result[header] =
              values[index] ?? '';
          }
        );

        return result;
      });

    const existing =
      await db.transactions.toArray();

    const existingFingerprints =
      new Set(
        existing.map(
          createImportedTransactionFingerprint
        )
      );

    const imported: Transaction[] = [];

    for (const row of parsedRows) {
      const transaction =
        normalizeImportedTransaction(row);

      if (!transaction) {
        continue;
      }

      const fingerprint =
        createImportedTransactionFingerprint(
          transaction
        );

      if (
        existingFingerprints.has(
          fingerprint
        )
      ) {
        continue;
      }

      if (
        imported.some(
          existingTransaction =>
            createImportedTransactionFingerprint(
              existingTransaction
            ) === fingerprint
        )
      ) {
        continue;
      }

      imported.push(transaction);
    }

    if (!imported.length) {
      setBackupMessage(
        'No new transactions found in the Excel file.'
      );
      return;
    }

    await db.transactions.bulkPut(
      imported
    );

    setBackupMessage(
      `Excel imported successfully. ${imported.length} new transactions added.`
    );
  } catch (e) {
    console.error(
      'EXCEL IMPORT FAILED:',
      e
    );

    setBackupMessage(
      e instanceof Error
        ? `Excel import failed: ${e.message}`
        : 'Excel import failed.'
    );
  }
}

async function importDataFile(
  file?: File
) {
  if (!file) return;

  const extension =
    file.name
      .split('.')
      .pop()
      ?.toLowerCase();

  if (extension === 'csv') {
    await importCsv(file);
    return;
  }

  if (
    extension === 'xls' ||
    extension === 'html' ||
    extension === 'htm'
  ) {
    await importExcel(file);
    return;
  }

  setBackupMessage(
    'Unsupported import format. Select CSV or Excel (.xls).'
  );
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
async function cancelPendingBackup() {
  try {
    await db.pendingBackups.delete('auto');

    setPendingBackup(null);
    setAutoBackupDue(false);

    setBackupMessage(
      'Pending backup cancelled. No backup was saved.'
    );
  } catch (e) {
    setBackupMessage(
      e instanceof Error
        ? e.message
        : 'Could not cancel pending backup.'
    );
  }
}
async function importBackup(file?: File) {
  if (!file) {
    setBackupMessage('No backup file selected.');
    return;
  }

  try {
    setBackupMessage(`Reading backup: ${file.name}...`);

    const fileText = await file.text();

    let parsed: any;

    try {
      parsed = JSON.parse(fileText);
    } catch {
      throw new Error(
        'Selected file is not a valid Expense Tracker archive.'
      );
    }

    const manifest = parsed?.manifest;

    if (
      manifest?.format !== 'ETAR-1' ||
      manifest?.encrypted !== true
    ) {
      throw new Error(
        'Selected file is not a valid encrypted .etarchive backup.'
      );
    }

    const sourcePartition =
      manifest.partition === 'demo'
        ? 'demo'
        : 'personal';

    const activePartition = getActivePartition();

    const currentTransactions =
      await db.transactions.toArray();

    const backupCreatedAt =
      manifest.createdAt
        ? new Date(manifest.createdAt).getTime()
        : 0;

    const hasNewerCurrentData =
      backupCreatedAt > 0 &&
      currentTransactions.some(transaction => {
        const updatedAt =
          new Date(transaction.updatedAt).getTime();

        return updatedAt > backupCreatedAt;
      });

    setRestoreFile(
      new File(
        [fileText],
        file.name,
        { type: 'text/plain' }
      )
    );

    setRestoreManifest(manifest);
    setRestoreSourcePartition(sourcePartition);
    setRestoreTargetPartition(activePartition);
    setRestoreMode(null);
    setRestoreHasNewerData(hasNewerCurrentData);

    setShowRestoreOptions(true);

    setBackupMessage('');
  } catch (e) {
    console.error('RESTORE PREPARATION FAILED:', e);

    setBackupMessage(
      e instanceof Error
        ? `RESTORE ERROR: ${e.message}`
        : `RESTORE ERROR: ${String(e)}`
    );
  }
}

function cancelRestore() {
  setShowRestoreOptions(false);
  setShowRestoreMode(false);
  setRestoreFile(null);
  setRestoreManifest(null);
  setRestoreSourcePartition(null);
  setRestoreTargetPartition(null);
  setRestoreMode(null);
  setRestoreHasNewerData(false);

  setBackupMessage('Restore cancelled.');
}

function chooseRestoreHere() {
  if (!restoreSourcePartition || !restoreFile) {
    cancelRestore();
    return;
  }

  setRestoreTargetPartition(
    getActivePartition()
  );

  setShowRestoreOptions(false);
  setShowRestoreMode(true);
}

function chooseSwitchAndRestore() {
  if (
    !restoreSourcePartition ||
    !restoreFile
  ) {
    cancelRestore();
    return;
  }

  setRestoreTargetPartition(
    restoreSourcePartition
  );

  setShowRestoreOptions(false);
  setShowRestoreMode(true);
}

async function performRestore(
  mode: 'merge' | 'replace'
) {
  if (!restoreFile) {
    cancelRestore();
    return;
  }

  try {
    setRestoreBusy(true);
    setRestoreMode(mode);
    setShowRestoreMode(false);

    const targetPartition =
      restoreTargetPartition ||
      getActivePartition();

    const activePartition =
      getActivePartition();

    /*
     * Different partition:
     *
     * Persist the encrypted archive outside the
     * partitioned database, then switch.
     *
     * The startup restore handler can continue
     * the restore after the partition switch.
     */
    if (
      targetPartition !== activePartition
    ) {
      await savePendingRestore(
        restoreFile,
        targetPartition,
        mode
      );

      setBackupMessage(
        `Switching to ${
          targetPartition === 'demo'
            ? 'Demo'
            : 'Personal'
        } partition...`
      );

      switchPartition(
        targetPartition
      );

      return;
    }

    setBackupMessage(
      mode === 'merge'
        ? 'Merging backup with current data...'
        : 'Replacing current data with backup...'
    );

    const manifestResult =
      await restoreEncryptedArchive(
        restoreFile,
        '1234567890',
        mode
      );

    setBackupMessage(
      mode === 'merge'
        ? `Backup merged successfully. ${
            manifestResult.entityCounts
              ?.transactions || 0
          } backup transactions processed.`
        : `Backup restored successfully. ${
            manifestResult.entityCounts
              ?.transactions || 0
          } transactions restored.`
    );

    setRestoreFile(null);
    setRestoreManifest(null);
    setRestoreSourcePartition(null);
    setRestoreTargetPartition(null);
    setRestoreMode(null);
    setRestoreHasNewerData(false);

    setTimeout(
      () => window.location.reload(),
      500
    );
  } catch (e) {
    console.error(
      'RESTORE FAILED:',
      e
    );

    setRestoreBusy(false);

    setBackupMessage(
      e instanceof Error
        ? `RESTORE ERROR: ${e.message}`
        : `RESTORE ERROR: ${String(e)}`
    );
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
        Create an encrypted backup when you return to the app after the
        selected interval.
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

  {settings?.lastAutoBackupSavedAt && (
    <p className="form-help">
      Last backup:
      {' '}
      {new Date(settings.lastAutoBackupSavedAt).toLocaleString()}
    </p>
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

      <button
        className="secondary-btn"
        onClick={() => void cancelPendingBackup()}
      >
        Cancel
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

      await checkAutoBackup();

      setMessage('Automatic backup settings saved locally.');
    }}
    >
      <DatabaseBackup size={16} />
      Save backup settings
    </button>
  </div>
</section>
 <section className="panel"><div className="panel-header"><div><h2>Backup & recovery</h2><p>Encrypted, integrity-checked local archive for device loss, corruption and migration. A safety archive is created before every restore.</p></div></div>{backupMessage&&<div className="success-banner">{backupMessage}</div>}<div className="inline-actions"><button className="primary-btn" onClick={exportBackup}><DatabaseBackup size={16}/> Encrypted backup</button>{pendingBackup&&<button className="primary-btn" onClick={savePendingBackup}><DatabaseBackup size={16}/> Save backup to Files</button>}<button className="secondary-btn" onClick={exportCsv}>CSV</button><button className="secondary-btn" onClick={exportExcel}>Excel</button><label className="secondary-btn file-btn">
  <FileUp size={16}/>
  Restore .etarchive
  <input
    ref={fileRef}
    type="file"
    accept=".etarchive,application/json"
    onChange={e => {
      void importBackup(
        e.target.files?.[0]
      );

      e.currentTarget.value = '';
    }}
  />
</label>

<label className="secondary-btn file-btn">
  <FileUp size={16}/>
  Import CSV / Excel
  <input
    type="file"
    accept=".csv,.xls,.html,.htm"
    onChange={e => {
      void importDataFile(
        e.target.files?.[0]
      );

      e.currentTarget.value = '';
    }}
  />
</label></div></section>
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
  {showRestoreOptions &&
  restoreManifest &&
  restoreSourcePartition && (
    <div className="modal-backdrop">
      <div className="modal-panel">

        <div className="panel-header">
          <div>
            <h2>Restore backup</h2>
          </div>
        </div>

        <div className="restore-details">

          <div>
            <strong>Backup partition:</strong>{' '}
            {restoreSourcePartition === 'demo'
              ? 'Demo'
              : 'Personal'}
          </div>

          <div>
            <strong>Current partition:</strong>{' '}
            {getActivePartition() === 'demo'
              ? 'Demo'
              : 'Personal'}
          </div>

          <div>
            <strong>Created:</strong>{' '}
            {restoreManifest.createdAt
              ? new Date(
                  restoreManifest.createdAt
                ).toLocaleString()
              : 'Unknown'}
          </div>

        </div>

        {restoreHasNewerData && (
          <div className="warning-note">
            Your current data contains changes
            made after this backup.
          </div>
        )}

        <h3>Restore options</h3>

        <div className="restore-actions">

          <button
            className="primary-btn restore-option-btn"
            disabled={restoreBusy}
            onClick={chooseRestoreHere}
          >
            Restore here as merged data
          </button>

          <button
            className="secondary-btn restore-option-btn"
            disabled={restoreBusy}
            onClick={chooseSwitchAndRestore}
          >
            Switch to{' '}
            {restoreSourcePartition === 'demo'
              ? 'Demo'
              : 'Personal'}{' '}
            and restore
          </button>

          <button
            className="secondary-btn restore-option-btn"
            disabled={restoreBusy}
            onClick={cancelRestore}
          >
            Cancel
          </button>

        </div>

      </div>
    </div>
  )}

{showRestoreMode &&
  restoreManifest && (
    <div className="modal-backdrop">
      <div className="modal-panel">

        <div className="panel-header">
          <div>
            <h2>Restore backup</h2>
          </div>
        </div>

        <div className="restore-details">

          <div>
            This backup was created on{' '}
            <strong>
              {restoreManifest.createdAt
                ? new Date(
                    restoreManifest.createdAt
                  ).toLocaleDateString(
                    undefined,
                    {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    }
                  )
                : 'an unknown date'}
            </strong>.
          </div>

          {restoreHasNewerData && (
            <div className="warning-note">
              Your current data contains changes
              made after this backup.
            </div>
          )}

        </div>

        <h3>Restore mode</h3>

        <div className="restore-actions">

          <button
            className="primary-btn restore-option-btn"
            disabled={restoreBusy}
            onClick={() =>
              void performRestore('merge')
            }
          >
            <strong>
              Merge with current data
            </strong>

            <span className="form-help">
              Recommended — preserves newer data.
            </span>
          </button>

          <button
            className="secondary-btn restore-option-btn"
            disabled={restoreBusy}
            onClick={() =>
              void performRestore('replace')
            }
          >
            <strong>
              Replace current data
            </strong>

            <span className="form-help">
              Completely replace this partition
              with the backup.
            </span>
          </button>

          <button
            className="secondary-btn restore-option-btn"
            disabled={restoreBusy}
            onClick={cancelRestore}
          >
            Cancel
          </button>

        </div>

      </div>
    </div>
  )}
 </div>;
}