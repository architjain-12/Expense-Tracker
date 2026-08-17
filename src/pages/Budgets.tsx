import { useMemo, useState } from 'react';
import { Plus, Target, Trash2 } from 'lucide-react';
import { useBudgets, useCategories, useTransactions } from '../hooks/useDb';
import { db } from '../db/database';
import { newId } from '../utils/id';
import { formatCurrency } from '../utils/format';
import { queueEntitySync } from '../services/syncService';
import { periodEnd, periodStart } from '../services/budgetService';
import type { Budget } from '../types/models';

export default function Budgets() {
  const budgets = useBudgets(); const categories = useCategories(); const transactions = useTransactions();
  const [amount, setAmount] = useState(''); const [categoryId, setCategoryId] = useState(''); const [period, setPeriod] = useState<Budget['period']>('MONTHLY');
  const today = new Date();
  const currentStart = periodStart(today, period);
  const currentEnd = periodEnd(today, period);

  async function addOrChange() {
    const value=Number(amount); if (!value) return;
    const now=new Date().toISOString();
    // Only the active budget for this scope is closed. Historical budget records remain untouched.
    const active = budgets.filter(b => (b.categoryId || undefined) === (categoryId || undefined) && b.period === period && new Date(b.startDate) <= currentStart && (!b.endDate || new Date(b.endDate) >= currentStart)).sort((a,b)=>new Date(b.startDate).getTime()-new Date(a.startDate).getTime())[0];
    if (active) {
      const previousEnd = new Date(currentStart); previousEnd.setDate(0); previousEnd.setHours(23,59,59,999);
      const closed = {...active, endDate: previousEnd.toISOString(), updatedAt: now};
      await db.budgets.put(closed); await queueEntitySync('BUDGET', closed.id, 'UPDATE', closed);
    }
    const budget: Budget={ id:newId('budget'), categoryId:categoryId||undefined, amount:value, period, startDate:currentStart.toISOString(), createdAt:now, updatedAt:now };
    await db.budgets.put(budget); await queueEntitySync('BUDGET',budget.id,'CREATE',budget); setAmount('');
  }
  return <div className="page-stack"><section className="hero-row"><div><span className="eyebrow">Planning</span><h1>Budgets</h1><p className="muted">Budgets are effective from a period forward, so changing one never rewrites historical months.</p></div></section>
    <section className="panel"><div className="panel-header"><div><h2>Set current & future budget</h2><p>Create a new budget for the selected scope. Older months stay unchanged.</p></div><Target size={18}/></div><div className="form-grid settings-grid-like"><label>Category<select value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">Overall</option>{categories.filter(c=>!c.parentId).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Period<select value={period} onChange={e=>setPeriod(e.target.value as Budget['period'])}><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></select></label><label>Amount<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="50000"/></label></div><button className="primary-btn" onClick={addOrChange}><Plus size={16}/> Save budget</button><p className="form-help">You can have separate overall/category budgets. A new value becomes effective this month/year and continues into future periods until changed again.</p></section>
    <section className="budget-list">{budgets.length===0 ? <div className="empty-state"><div className="empty-icon">₹</div><h3>No budgets</h3><p>Budgets are optional. Add one when you want budget tracking.</p></div> : budgets.sort((a,b)=>new Date(b.startDate).getTime()-new Date(a.startDate).getTime()).map(b=>{ const activeNow = !b.endDate && new Date(b.startDate) <= currentStart; const currentSpent = activeNow ? transactions.filter(t=>t.type==='EXPENSE' && (!b.categoryId || t.categoryId===b.categoryId) && new Date(t.transactionDateTime)>=currentStart && new Date(t.transactionDateTime)<=currentEnd).reduce((s,t)=>s+t.amount,0) : 0; const pct=activeNow ? Math.min(100,(currentSpent/b.amount)*100) : 0; return <article className="panel budget-card" key={b.id}><div><strong>{b.categoryId?categories.find(c=>c.id===b.categoryId)?.name:'Overall'}</strong><p className="muted">{b.period.toLowerCase()} · from {new Date(b.startDate).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}{b.endDate?` · ended ${new Date(b.endDate).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}`:' · current/future'}</p></div><div className="budget-values"><span>{formatCurrency(currentSpent)} / {formatCurrency(b.amount)}</span>{new Date(b.startDate)<=currentStart && !b.endDate&&<button className="icon-btn" onClick={async()=>{await db.budgets.delete(b.id);await queueEntitySync('BUDGET',b.id,'DELETE',{id:b.id});}} title="Delete"><Trash2 size={15}/></button>}</div><div className="progress-track"><span style={{width:`${pct}%`}}/></div><small>{Math.round(pct)}% used in current period</small></article>})}</section>
  </div>;
}
