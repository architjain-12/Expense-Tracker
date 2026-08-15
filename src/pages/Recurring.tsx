import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, Plus, RefreshCcw, Pencil, Trash2 } from 'lucide-react';
import { useAccounts, useCategories, useRecurringRules } from '../hooks/useDb';
import { db } from '../db/database';
import type { Frequency, RecurringRule } from '../types/models';
import { newId } from '../utils/id';
import { queueEntitySync } from '../services/syncService';
import { firstOccurrenceOnOrAfter } from '../services/recurringService';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Recurring() {
  const rules = useRecurringRules();
  const accounts = useAccounts();
  const categories = useCategories();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('MONTHLY');
  const [day, setDay] = useState('1');
  const [dayOfWeek, setDayOfWeek] = useState(String(new Date().getDay()));
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');

  useEffect(() => {
    if (!accountId) setAccountId(accounts.find(a => a.isDefault)?.id || accounts[0]?.id || '');
  }, [accounts, accountId]);

  const subs = useMemo(() => categories.filter(c => c.parentId === categoryId), [categories, categoryId]);
  const weekly = frequency === 'WEEKLY' || frequency === 'BIWEEKLY';

  function reset() {
    setEditing(null); setName(''); setAmount(''); setFrequency('MONTHLY'); setDay('1');
    setDayOfWeek(String(new Date().getDay())); setCategoryId(''); setSubcategoryId(''); setOpen(false);
  }

  function edit(rule: RecurringRule) {
    setEditing(rule); setName(rule.name); setAmount(String(rule.amount)); setFrequency(rule.frequency);
    setDay(String(rule.dayOfMonth || 1)); setDayOfWeek(String(rule.dayOfWeek ?? new Date(rule.startDate).getDay()));
    setAccountId(rule.accountId); setCategoryId(rule.categoryId || ''); setSubcategoryId(rule.subcategoryId || ''); setOpen(true);
  }

  async function save() {
    const value = Number(amount);
    if (!name.trim() || !Number.isFinite(value) || value <= 0 || !accountId) return;
    const now = new Date();
    const ruleBase: RecurringRule = {
      id: editing?.id || newId('rule'),
      name: name.trim(), amount: value, type: editing?.type || 'EXPENSE', accountId,
      categoryId: categoryId || undefined, subcategoryId: subcategoryId || undefined,
      frequency, dayOfMonth: weekly ? undefined : Number(day), dayOfWeek: weekly ? Number(dayOfWeek) : undefined,
      startDate: editing?.startDate || now.toISOString(), nextDueDate: editing?.nextDueDate || now.toISOString(),
      active: editing?.active ?? true, merchant: editing?.merchant, notes: editing?.notes,
      lastGeneratedDate: editing?.lastGeneratedDate, createdAt: editing?.createdAt || now.toISOString(), updatedAt: now.toISOString(),
    };

    // A newly-created rule starts at the first configured occurrence, while an
    // edit preserves the existing schedule pointer so editing metadata does
    // not unexpectedly create an extra payment.
    if (!editing) {
      ruleBase.nextDueDate = firstOccurrenceOnOrAfter(ruleBase, now).toISOString();
    }

    await db.recurringRules.put(ruleBase);
    await queueEntitySync('RECURRING_RULE', ruleBase.id, editing ? 'UPDATE' : 'CREATE', ruleBase);
    reset();
  }

  return <div className="page-stack">
    <section className="hero-row"><div><span className="eyebrow">Automation</span><h1>Recurring Payments</h1><p className="muted">Due items enter Review Queue on their payment date. Nothing is auto-recorded.</p></div><button className="primary-btn" onClick={() => setOpen(true)}><Plus size={17}/> Add recurring</button></section>
    <div className="recurring-grid">
      {rules.length === 0 ? <div className="empty-state"><div className="empty-icon">↻</div><h3>No recurring rules</h3><p>Add subscriptions, EMI, RD, rent, insurance or other scheduled payments.</p></div> : rules.map(r => <article key={r.id} className="recurring-card">
        <div className="recurring-icon"><RefreshCcw size={17}/></div><div className="recurring-info"><strong>{r.name}</strong><span>₹{r.amount.toLocaleString('en-IN')} · {r.frequency.toLowerCase()} · {r.frequency === 'WEEKLY' || r.frequency === 'BIWEEKLY' ? WEEKDAYS[r.dayOfWeek ?? new Date(r.startDate).getDay()] : `day ${r.dayOfMonth ?? '—'}`}</span><small>{r.active ? 'Next due' : 'Paused'}: {new Date(r.nextDueDate).toLocaleDateString('en-IN')}</small></div>
        <button className="icon-btn" onClick={async () => { const updated = {...r, active: !r.active, updatedAt: new Date().toISOString()}; await db.recurringRules.put(updated); await queueEntitySync('RECURRING_RULE', r.id, 'UPDATE', updated); }} title={r.active ? 'Pause' : 'Resume'}>{r.active ? <Pause size={16}/> : <Play size={16}/>}</button>
        <button className="icon-btn" onClick={() => edit(r)} title="Edit"><Pencil size={15}/></button>
        <button className="icon-btn danger-icon" onClick={async () => { if (!confirm(`Delete ${r.name}?`)) return; await db.recurringRules.delete(r.id); await queueEntitySync('RECURRING_RULE', r.id, 'DELETE', {id: r.id}); }} title="Delete"><Trash2 size={15}/></button>
      </article>)}
    </div>

    {open && <div className="modal-backdrop"><div className="modal">
      <div className="panel-header"><div><h2>{editing ? 'Edit recurring payment' : 'New recurring payment'}</h2><p>Due occurrences are sent to Review Queue for confirmation.</p></div></div>
      <div className="form-grid">
        <label>Name<input value={name} onChange={e => setName(e.target.value)} placeholder="Rent / Netflix / EMI"/></label>
        <label>Amount<input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="2500"/></label>
        <label>Frequency<select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}><option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Bi-weekly · every 14 days</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="YEARLY">Yearly</option></select></label>
        {weekly ? <label>Day of week<select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}>{WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label> : <label>Day of month<input type="number" min="1" max="31" value={day} onChange={e => setDay(e.target.value)}/></label>}
        <label>Account<select value={accountId} onChange={e => setAccountId(e.target.value)}>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Category<select value={categoryId} onChange={e => {setCategoryId(e.target.value); setSubcategoryId('')}}><option value="">Uncategorized</option>{categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        {categoryId && <label>Subcategory<select value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)}><option value="">Optional</option>{subs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
      </div>
      <div className="inline-actions"><button className="primary-btn" onClick={save}>{editing ? 'Save changes' : 'Create Recurring'}</button><button className="secondary-btn" onClick={reset}>Cancel</button></div>
    </div></div>}
  </div>;
}
