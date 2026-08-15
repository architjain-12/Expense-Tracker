import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, PieChart as PieIcon } from 'lucide-react';
import { useTransactions, useAccounts, useCategories, useReviewQueue, useBudgets, useRecurringRules, useSettings } from '../hooks/useDb';
import { getRecurringOccurrencesForMonth } from '../services/recurringService';
import { formatCurrency } from '../utils/format';
import { useMemo } from 'react';
import TransactionList from '../components/TransactionList';
import MetricCard from '../components/MetricCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const PIE_COLORS=['#7c8cff','#5dd39e','#f2c14e','#e17878','#7fc8f8','#c39be8'];
const monthKey=new Date().toISOString().slice(0,7);
export default function Home(){
 const navigate=useNavigate(); const transactions=useTransactions()??[]; const accounts=useAccounts()??[]; const categories=useCategories()??[]; const reviewQueue=useReviewQueue()??[]; const budgets=useBudgets()??[]; const recurring=useRecurringRules()??[]; const settings=useSettings();
 const monthTransactions=useMemo(()=>transactions.filter(t=>t.transactionDateTime.slice(0,7)===monthKey),[transactions]);
 const expenses=monthTransactions.filter(t=>t.type==='EXPENSE').reduce((s,t)=>s+t.amount,0); const income=monthTransactions.filter(t=>t.type==='INCOME').reduce((s,t)=>s+t.amount,0);
 const overallBudget=budgets.find(b=>!b.categoryId&&b.period==='MONTHLY'); const budget=overallBudget?.amount||0; const pct=budget?expenses/budget*100:0; const remaining=budget-expenses;
 const estimatedDues = useMemo(() => {
  const occurrences = getRecurringOccurrencesForMonth(recurring, new Date(`${monthKey}-01T00:00:00`));
  return occurrences.reduce((sum, occurrence) => {
    const day = occurrence.dueDate.toISOString().slice(0, 10);
    const externalId = `${occurrence.rule.id}:${day}`;
    const alreadyHandled = reviewQueue.some(q => q.externalId === externalId && q.status !== 'DISCARDED')
      || transactions.some(t => t.recurringRuleId === occurrence.rule.id && t.transactionDateTime.slice(0, 10) === day);
    return alreadyHandled ? sum : sum + Number(occurrence.rule.amount || 0);
  }, 0);
 }, [recurring, reviewQueue, transactions, monthKey]);
 const estimatedSavings=(budget||income)-expenses-estimatedDues;
 const categoryData=useMemo(()=>{const map=new Map<string,number>();monthTransactions.filter(t=>t.type==='EXPENSE').forEach(t=>map.set(t.categoryId||'uncategorized',(map.get(t.categoryId||'uncategorized')||0)+t.amount));return [...map.entries()].sort((a,b)=>b[1]-a[1]).map(([id,amount])=>({id,name:categories.find(c=>c.id===id)?.name||'Uncategorized',amount,percent:expenses?amount/expenses*100:0}));},[monthTransactions,categories,expenses]);
 const recent=transactions.slice().sort((a,b)=>+new Date(b.transactionDateTime)-+new Date(a.transactionDateTime)).slice(0,8);
 return <div className="page-stack"><section><span className="eyebrow">Current month</span><h1>{new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</h1><p className="muted">Your important financial snapshot at a glance.</p></section>
 <section className="panel budget-hero"><div className="panel-header"><div><h2>Budget</h2><p>{budget?`${formatCurrency(Math.max(remaining,0))} remaining to spend`:'No monthly budget configured'}</p></div><strong>{budget?formatCurrency(budget):'—'}</strong></div><div className={`budget-progress ${pct>100?'over':pct>75?'warning':''}`}><span style={{width:`${Math.min(100,pct)}%`}}/></div><div className="budget-progress-labels"><span>{formatCurrency(expenses)} spent</span><span>{budget?`${Math.round(pct)}% used`: 'Set a budget in Options'}</span></div></section>
 {reviewQueue.length>0&&<Link to="/review" className="review-alert"><AlertCircle size={18}/><div><strong>{reviewQueue.length} pending review {reviewQueue.length===1?'item':'items'}</strong><span>Recurring payments and automation events are waiting for confirmation.</span></div><span>Review →</span></Link>}
 <section className="metric-grid"><MetricCard label="Total spent" value={formatCurrency(expenses)}/><MetricCard label="Income" value={formatCurrency(income)}/><MetricCard label="Remaining budget" value={budget?formatCurrency(remaining):'—'}/><MetricCard label="Estimated savings" value={formatCurrency(estimatedSavings)}/></section>
 <section className="panel budget-hero"><div className="panel-header"><div><h2>Estimated dues</h2><p>Recurring payments expected this month; they are not transactions until accepted.</p></div><span className="dues-badge">{formatCurrency(estimatedDues)}</span></div><div className="budget-progress dues"><span style={{width:`${budget?Math.min(100,estimatedDues/budget*100):0}%`}}/></div><div className="budget-progress-labels"><span>Future expenses</span><span>Toggle can be added in Settings</span></div></section>
 <section className="panel"><div className="panel-header"><div><h2>Recent transactions</h2><p>Latest confirmed ledger activity</p></div><Link to="/transactions" className="text-link">View all</Link></div><TransactionList transactions={recent} accounts={accounts} categories={categories} onSelect={t=>navigate(`/transactions/${t.id}`)}/></section>
 <section className="panel"><div className="panel-header"><div><h2>Spending by category</h2><p>Tap a category below to filter Transactions.</p></div><PieIcon size={18}/></div>{categoryData.length?<><div className="chart-box"><ResponsiveContainer width="100%" height={310}><PieChart><Pie data={categoryData} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius="68%" label={({name,percent})=>`${name} ${Number(percent).toFixed(0)}%`} labelLine>{categoryData.map((c,i)=><Cell key={c.id} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}</Pie><Tooltip formatter={(v)=>[formatCurrency(Number(v)),'Spend']}/></PieChart></ResponsiveContainer></div><div className="stacked-list">{categoryData.map(c=><button className="stat-row clickable" key={c.id} onClick={()=>navigate(`/transactions?month=${monthKey}&category=${c.id}`)}><span>{c.name} · {c.percent.toFixed(0)}%</span><strong>{formatCurrency(c.amount)} <ChevronRight size={14}/></strong></button>)}</div></>:<div className="empty-inline">Categories will appear after you record spending.</div>}</section>
 </div>;
}
