import { useState } from 'react';
import { Plus, RefreshCcw, Pause, Play } from 'lucide-react';
import { useAccounts, useCategories, useRecurringRules } from '../hooks/useDb';
import { db } from '../db/database';
import type { Frequency } from '../types/models';

export default function Recurring() {
  const rules = useRecurringRules();
  const accounts = useAccounts();
  const categories = useCategories();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('MONTHLY');
  const [day, setDay] = useState('1');
  const [accountId, setAccountId] = useState(accounts.find(a=>a.isDefault)?.id || accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState('');

  async function createRule() {
    if (!name || !amount || !accountId) return;
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), Math.min(Number(day), 28), 12, 0, 0);
    if (next < now) next.setMonth(next.getMonth() + 1);
    await db.recurringRules.add({
      id: crypto.randomUUID(), name, amount: Number(amount), type:'EXPENSE', accountId, categoryId: categoryId || undefined,
      frequency, dayOfMonth: Number(day), startDate: now.toISOString(), nextDueDate: next.toISOString(), active: true,
      createdAt: now.toISOString(), updatedAt: now.toISOString(),
    });
    setName(''); setAmount(''); setOpen(false);
  }

  async function toggle(id: string, active: boolean) { await db.recurringRules.update(id, { active: !active, updatedAt: new Date().toISOString() }); }

  return <div className="page-stack"><section className="hero-row"><div><span className="eyebrow">Automation</span><h1>Recurring Payments</h1><p className="muted">Rules generate normal transactions when the app opens.</p></div><button className="primary-btn" onClick={()=>setOpen(true)}><Plus size={17}/> Add recurring</button></section>
    <div className="recurring-grid">{rules.map(r => <article key={r.id} className="recurring-card"><div className="recurring-icon"><RefreshCcw size={17}/></div><div className="recurring-info"><strong>{r.name}</strong><span>₹{r.amount.toLocaleString('en-IN')} · {r.frequency.toLowerCase()} · {r.dayOfMonth ?? '—'}</span><small>Next: {new Date(r.nextDueDate).toLocaleDateString('en-IN')}</small></div><button className="icon-btn" onClick={()=>toggle(r.id, r.active)} title="Pause/resume">{r.active ? <Pause size={16}/> : <Play size={16}/>}</button></article>)}</div>
    {open && <div className="modal-backdrop"><div className="modal"><div className="panel-header"><div><h2>New recurring payment</h2><p>Example: Netflix, EMI, RD, rent</p></div><button className="icon-btn" onClick={()=>setOpen(false)}>×</button></div><div className="form-grid"><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Netflix"/></label><label>Amount<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="649"/></label><label>Frequency<select value={frequency} onChange={e=>setFrequency(e.target.value as Frequency)}><option value="MONTHLY">Monthly</option><option value="WEEKLY">Weekly</option><option value="YEARLY">Yearly</option></select></label><label>Day of month<input type="number" min="1" max="31" value={day} onChange={e=>setDay(e.target.value)}/></label><label>Account<select value={accountId} onChange={e=>setAccountId(e.target.value)}>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Category<select value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">No category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div><button className="primary-btn record-btn" onClick={createRule}>Save recurring rule</button></div></div>}
  </div>;
}
