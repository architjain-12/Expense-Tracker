import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, Plus, RefreshCcw, Pencil, Trash2 } from 'lucide-react';
import { useAccounts, useCategories, useRecurringRules } from '../hooks/useDb';
import { db } from '../db/database';
import type { Frequency, RecurringRule } from '../types/models';
import { newId } from '../utils/id';
import { queueEntitySync } from '../services/syncService';
import { addMonths, addWeeks, addYears } from 'date-fns';

function nextDate(
  f: Frequency,
  day: number,
  base = new Date()
): Date {
  const d = new Date(base);

  if (f === 'WEEKLY') {
    return addWeeks(d, 1);
  }

  if (f === 'BIWEEKLY') {
    return addWeeks(d, 2);
  }

  if (f === 'QUARTERLY') {
    return addMonths(d, 3);
  }

  if (f === 'YEARLY') {
    return addYears(d, 1);
  }

  // MONTHLY
  const currentYear = d.getFullYear();
  const currentMonth = d.getMonth();

  const lastDayOfCurrentMonth = new Date(
    currentYear,
    currentMonth + 1,
    0
  ).getDate();

  const currentDueDate = new Date(
    currentYear,
    currentMonth,
    Math.min(day, lastDayOfCurrentMonth)
  );

  // If this month's occurrence hasn't happened yet,
  // use this month.
  if (currentDueDate >= base) {
    return currentDueDate;
  }

  // Otherwise, use next month.
  const nextMonth = addMonths(
    new Date(currentYear, currentMonth, 1),
    1
  );

  const lastDayOfNextMonth = new Date(
    nextMonth.getFullYear(),
    nextMonth.getMonth() + 1,
    0
  ).getDate();

  return new Date(
    nextMonth.getFullYear(),
    nextMonth.getMonth(),
    Math.min(day, lastDayOfNextMonth)
  );
}export default function Recurring(){const rules=useRecurringRules();const accounts=useAccounts();const categories=useCategories();const [open,setOpen]=useState(false);const [editing,setEditing]=useState<RecurringRule|null>(null);const [name,setName]=useState('');const [amount,setAmount]=useState('');const [frequency,setFrequency]=useState<Frequency>('MONTHLY');const [day,setDay]=useState('1');const [accountId,setAccountId]=useState('');const [categoryId,setCategoryId]=useState('');const [subcategoryId,setSubcategoryId]=useState('');useEffect(()=>{if(!accountId)setAccountId(accounts.find(a=>a.isDefault)?.id||accounts[0]?.id||'');},[accounts,accountId]);const subs=useMemo(()=>categories.filter(c=>c.parentId===categoryId),[categories]);
 function reset(){setEditing(null);setName('');setAmount('');setFrequency('MONTHLY');setDay('1');setCategoryId('');setSubcategoryId('');setOpen(false);}
 function edit(r:RecurringRule){setEditing(r);setName(r.name);setAmount(String(r.amount));setFrequency(r.frequency);setDay(String(r.dayOfMonth||1));setAccountId(r.accountId);setCategoryId(r.categoryId||'');setSubcategoryId(r.subcategoryId||'');setOpen(true);}
 async function save(){if(!name.trim()||!Number(amount)||!accountId)return;const now=new Date();const d=editing?new Date(editing.nextDueDate):nextDate(frequency,Number(day),now);const rule:RecurringRule={id:editing?.id||newId('rule'),name:name.trim(),amount:Number(amount),type:editing?.type||'EXPENSE',accountId,categoryId:categoryId||undefined,subcategoryId:subcategoryId||undefined,frequency,dayOfMonth:Number(day),startDate:editing?.startDate||now.toISOString(),nextDueDate:d.toISOString(),active:true,merchant:editing?.merchant,notes:editing?.notes,lastGeneratedDate:editing?.lastGeneratedDate,createdAt:editing?.createdAt||now.toISOString(),updatedAt:now.toISOString()};await db.recurringRules.put(rule);await queueEntitySync('RECURRING_RULE',rule.id,editing?'UPDATE':'CREATE',rule);reset();}
 return <div className="page-stack"><section className="hero-row"><div><span className="eyebrow">Automation</span><h1>Recurring Payments</h1><p className="muted">Due items enter Review Queue on their payment date. Nothing is auto-recorded.</p></div><button className="primary-btn" onClick={()=>setOpen(true)}><Plus size={17}/> Add recurring</button></section><div className="recurring-grid">{rules.length===0?<div className="empty-state"><div className="empty-icon">↻</div><h3>No recurring rules</h3><p>Add subscriptions, EMI, RD, rent, insurance or other scheduled payments.</p></div>:rules.map(r=><article key={r.id} className="recurring-card"><div className="recurring-icon"><RefreshCcw size={17}/></div><div className="recurring-info"><strong>{r.name}</strong><span>₹{r.amount.toLocaleString('en-IN')} · {r.frequency.toLowerCase()} · day {r.dayOfMonth??'—'}</span><small>{r.active?'Next due':'Paused'}: {new Date(r.nextDueDate).toLocaleDateString('en-IN')}</small></div><button className="icon-btn" onClick={async()=>{const updated={...r,active:!r.active,updatedAt:new Date().toISOString()};await db.recurringRules.put(updated);await queueEntitySync('RECURRING_RULE',r.id,'UPDATE',updated);}}>{r.active?<Pause size={16}/>:<Play size={16}/>}</button><button className="icon-btn" onClick={()=>edit(r)}><Pencil size={15}/></button><button className="icon-btn danger-icon" onClick={async()=>{if(!confirm(`Delete ${r.name}?`))return;await db.recurringRules.delete(r.id);await queueEntitySync('RECURRING_RULE',r.id,'DELETE',{id:r.id});}}><Trash2 size={15}/></button></article>)}</div>{open&&<div className="modal-backdrop"><div className="modal"><div className="panel-header"><div><h2>{editing?'Edit recurring payment':'New recurring payment'}</h2><p>Due occurrences are sent to Review Queue.</p></div><button className="icon-btn" onClick={reset}>×</button></div><div className="form-grid"><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Netflix"/></label><label>Amount<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="649"/></label><label>Frequency<select value={frequency} onChange={e=>setFrequency(e.target.value as Frequency)}><option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Every 2 weeks</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="YEARLY">Yearly</option></select></label><label>Day<input type="number" min="1" max="31" value={day} onChange={e=>setDay(e.target.value)}/></label><label>Account<select value={accountId} onChange={e=>setAccountId(e.target.value)}>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Category<select value={categoryId} onChange={e=>{setCategoryId(e.target.value);setSubcategoryId('')}}><option value="">Optional</option>{categories.filter(c=>!c.parentId).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{categoryId&&<label>Subcategory<select value={subcategoryId} onChange={e=>setSubcategoryId(e.target.value)}><option value="">Optional</option>{subs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}</div><button className="primary-btn record-btn" onClick={save}>{editing?'Save changes':'Save recurring rule'}</button></div></div>}</div>}
