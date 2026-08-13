import { useMemo, useState } from 'react';
import { Plus, Target, Trash2 } from 'lucide-react';
import { useBudgets, useCategories, useTransactions } from '../hooks/useDb';
import { db } from '../db/database';
import { newId } from '../utils/id';
import { formatCurrency } from '../utils/format';
import { queueEntitySync } from '../services/syncService';

export default function Budgets() {
  const budgets = useBudgets(); const categories = useCategories(); const transactions = useTransactions();
  const [amount, setAmount] = useState(''); const [categoryId, setCategoryId] = useState(''); const [period, setPeriod] = useState<'MONTHLY'|'YEARLY'>('MONTHLY');
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const spent = useMemo(() => {
    const start = period === 'MONTHLY' ? monthStart : new Date(new Date().getFullYear(), 0, 1);
    const end = period === 'MONTHLY' ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999) : new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
    return transactions.filter(t => t.type === 'EXPENSE' && new Date(t.transactionDateTime) >= start && new Date(t.transactionDateTime) <= end && (!categoryId || t.categoryId === categoryId)).reduce((s,t)=>s+t.amount,0);
  }, [transactions, categoryId, period, monthStart]);
  async function add() { const value=Number(amount); if (!value) return; const now=new Date().toISOString(); const budget={ id:newId('budget'), categoryId:categoryId||undefined, amount:value, period, startDate:monthStart.toISOString(), createdAt:now, updatedAt:now }; await db.budgets.put(budget); await queueEntitySync('BUDGET',budget.id,'CREATE',budget); setAmount(''); }
  return <div className="page-stack"><section className="hero-row"><div><span className="eyebrow">Planning</span><h1>Budgets</h1><p className="muted">Optional limits that enrich the dashboard and reports.</p></div></section>
    <section className="panel"><div className="panel-header"><div><h2>Create budget</h2><p>Choose overall or category-specific.</p></div><Target size={18}/></div><div className="form-grid settings-grid-like"><label>Category<select value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">Overall</option>{categories.filter(c=>!c.parentId).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Period<select value={period} onChange={e=>setPeriod(e.target.value as any)}><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></select></label><label>Amount<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="50000"/></label></div><button className="primary-btn" onClick={add}><Plus size={16}/> Add budget</button></section>
    <section className="budget-list">{budgets.length===0 ? <div className="empty-state"><div className="empty-icon">₹</div><h3>No budgets</h3><p>Budgets are optional. Add one when you want budget tracking.</p></div> : budgets.map(b=>{ const currentSpent = transactions.filter(t=>t.type==='EXPENSE' && (!b.categoryId || t.categoryId===b.categoryId) && (b.period==='MONTHLY' ? new Date(t.transactionDateTime).getMonth()===new Date().getMonth() && new Date(t.transactionDateTime).getFullYear()===new Date().getFullYear() : new Date(t.transactionDateTime).getFullYear()===new Date().getFullYear())).reduce((s,t)=>s+t.amount,0); const pct=Math.min(100,(currentSpent/b.amount)*100); return <article className="panel budget-card" key={b.id}><div><strong>{b.categoryId?categories.find(c=>c.id===b.categoryId)?.name:'Overall'}</strong><p className="muted">{b.period.toLowerCase()}</p></div><div className="budget-values"><span>{formatCurrency(currentSpent)} / {formatCurrency(b.amount)}</span><button className="icon-btn" onClick={async()=>{await db.budgets.delete(b.id);await queueEntitySync('BUDGET',b.id,'DELETE',{id:b.id});}} title="Delete"><Trash2 size={15}/></button></div><div className="progress-track"><span style={{width:`${pct}%`}}/></div><small>{Math.round(pct)}% used</small></article>})}</section>
  </div>;
}
