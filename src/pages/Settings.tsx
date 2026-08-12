import { useRef, useState } from 'react';
import { DatabaseBackup, Download, FileUp, RefreshCcw, Save, ShieldCheck } from 'lucide-react';
import { db } from '../db/database';
import { syncWithGoogleSheets } from '../services/googleSheetsService';
import { useAccounts, useSettings } from '../hooks/useDb';

export default function Settings() {
  const settings = useSettings();
  const accounts = useAccounts();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [syncToken, setSyncToken] = useState(settings?.googleSheetsToken || '');
  const [defaultNeedWant, setDefaultNeedWant] = useState(settings?.defaultNeedWant || '');
  const [defaultED, setDefaultED] = useState(settings?.defaultEssentialDiscretionary || '');
  const [defaultFV, setDefaultFV] = useState(settings?.defaultFixedVariable || '');

  async function save() {
    const existing = (await db.settings.get('app'))!;
    await db.settings.put({ ...existing, defaultNeedWant: defaultNeedWant as any || undefined, defaultEssentialDiscretionary: defaultED as any || undefined, defaultFixedVariable: defaultFV as any || undefined });
    setMessage('Settings saved locally.');
  }

  async function exportBackup() {
    const snapshot = {
      transactions: await db.transactions.toArray(),
      accounts: await db.accounts.toArray(),
      categories: await db.categories.toArray(),
      recurringRules: await db.recurringRules.toArray(),
      reviewQueue: await db.reviewQueue.toArray(),
      budgets: await db.budgets.toArray(),
      settings: await db.settings.toArray(),
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `expense-tracker-backup-${new Date().toISOString().slice(0,10)}.json`; anchor.click(); URL.revokeObjectURL(url);
  }

  async function importBackup(file?: File) {
    if (!file) return;
    const data = JSON.parse(await file.text()) as Record<string, unknown[]>;
    await db.transaction('rw', [db.transactions, db.accounts, db.categories, db.recurringRules, db.reviewQueue, db.budgets, db.settings], async () => {
      if (data.transactions) await db.transactions.bulkPut(data.transactions as any[]);
      if (data.accounts) await db.accounts.bulkPut(data.accounts as any[]);
      if (data.categories) await db.categories.bulkPut(data.categories as any[]);
      if (data.recurringRules) await db.recurringRules.bulkPut(data.recurringRules as any[]);
      if (data.reviewQueue) await db.reviewQueue.bulkPut(data.reviewQueue as any[]);
      if (data.budgets) await db.budgets.bulkPut(data.budgets as any[]);
      if (data.settings) await db.settings.bulkPut(data.settings as any[]);
    });
    setMessage('Backup restored. Refreshing local views.');
  }

  return <div className="page-stack">
    <section className="hero-row"><div><span className="eyebrow">Configuration</span><h1>More & Settings</h1><p className="muted">Your data stays on the device unless you explicitly sync or export it.</p></div></section>

    <section className="panel"><div className="panel-header"><div><h2>Transaction defaults</h2><p>Keep the add screen fast.</p></div><Save size={18}/></div><div className="settings-grid">
      <label>Default account<select value={settings?.defaultAccountId || ''} onChange={async e => { const current = await db.settings.get('app'); if (current) await db.settings.put({...current, defaultAccountId: e.target.value || undefined}); }}><option value="">No default</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}{a.isDefault ? ' · current' : ''}</option>)}</select></label>
      <label>Needs / Wants<select value={defaultNeedWant} onChange={e=>setDefaultNeedWant(e.target.value)}><option value="">No default</option><option value="NEED">Needs</option><option value="WANT">Wants</option></select></label>
      <label>Essential / Discretionary<select value={defaultED} onChange={e=>setDefaultED(e.target.value)}><option value="">No default</option><option value="ESSENTIAL">Essential</option><option value="DISCRETIONARY">Discretionary</option></select></label>
      <label>Fixed / Variable<select value={defaultFV} onChange={e=>setDefaultFV(e.target.value)}><option value="">No default</option><option value="FIXED">Fixed</option><option value="VARIABLE">Variable</option></select></label>
    </div><button className="primary-btn" onClick={save}>Save defaults</button></section>

    <section className="panel"><div className="panel-header"><div><h2>Google Sheets</h2><p>Optional cloud reporting and backup layer.</p></div><ShieldCheck size={18}/></div><div className="warning-note">Keep your Apps Script URL and token out of GitHub. For the first version, enter them at runtime and store them locally.</div><label>Apps Script endpoint<input type="url" defaultValue={settings?.googleSheetsEndpoint || ''} placeholder="https://script.google.com/macros/s/.../exec" onBlur={async e => { const current=await db.settings.get('app'); if(current) await db.settings.put({...current, googleSheetsEndpoint:e.target.value, googleSheetsEnabled:Boolean(e.target.value)}); }}/></label><label>Sync token<input type="password" value={syncToken} onChange={async e=>{ setSyncToken(e.target.value); const current=await db.settings.get('app'); if(current) await db.settings.put({...current, googleSheetsToken:e.target.value}); }} placeholder="Optional personal sync key"/></label><div className="inline-actions"><button className="secondary-btn" onClick={async()=>{ const result=await syncWithGoogleSheets(); setMessage(result.success ? `Sync complete${result.processed !== undefined ? `: ${result.processed} changes` : ''}.` : result.message || 'Sync failed.'); }}><RefreshCcw size={16}/> Sync Now</button><span className="muted">Google Sheets API wiring is isolated so it can be added without changing the local app.</span></div></section>

    <section className="panel"><div className="panel-header"><div><h2>Backup & restore</h2><p>Protect your local database.</p></div><DatabaseBackup size={18}/></div><div className="inline-actions"><button className="secondary-btn" onClick={exportBackup}><Download size={16}/> Export JSON backup</button><button className="secondary-btn" onClick={()=>fileRef.current?.click()}><FileUp size={16}/> Restore JSON backup</button><input ref={fileRef} hidden type="file" accept="application/json" onChange={e=>importBackup(e.target.files?.[0])}/></div></section>
    {message && <div className="success-banner">{message}</div>}
  </div>;
}
