import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, Plus } from 'lucide-react';
import { useTransactions, useAccounts, useCategories, useReviewQueue, useSettings } from '../hooks/useDb';
import { formatCurrency } from '../utils/format';
import { getMonthlyTransactions, calculateSummary, buildDailySeries } from '../services/reportingService';
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import TransactionList from '../components/TransactionList';
import MetricCard from '../components/MetricCard';
import { LineChart, Line, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useEffect } from 'react';
import { restoreFromGoogleSheetsIfEmpty } from '../services/googleSheetsService';

const PIE_COLORS=['#7c8cff','#5dd39e','#f2c14e','#e17878','#7fc8f8','#c39be8'];

export default function Home(){
  const navigate=useNavigate(); const transactions=useTransactions(); const accounts=useAccounts(); const categories=useCategories(); const reviewQueue=useReviewQueue(); const settings=useSettings();
  useEffect(()=>{ if(settings?.googleSheetsEnabled) void restoreFromGoogleSheetsIfEmpty(); },[settings?.googleSheetsEnabled]);
  const monthTransactions=useLiveQuery(()=>getMonthlyTransactions(new Date()),[],[]); const summary=useMemo(()=>calculateSummary(monthTransactions||[]),[monthTransactions]); const series=useMemo(()=>buildDailySeries(monthTransactions||[],new Date()),[monthTransactions]);
  const categoryData=useMemo(()=>{const map=new Map<string,number>();const seen=new Set<string>();(monthTransactions||[]).filter(t=>t.type==='EXPENSE').forEach(t=>{if(seen.has(t.id))return;seen.add(t.id);const id=t.categoryId||'uncategorized';map.set(id,(map.get(id)||0)+t.amount);});return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,7).map(([id,amount])=>({id,name:categories.find(c=>c.id===id)?.name||'Uncategorized',amount}));},[monthTransactions,categories]);
  const recent=(transactions||[]).slice().sort((a,b)=>+new Date(b.transactionDateTime)-+new Date(a.transactionDateTime)).filter((t,i,arr)=>arr.findIndex(x=>x.id===t.id)===i).slice(0,8);
  return <div className="page-stack"><section className="hero-row"><div><span className="eyebrow">Current month</span><h1>{new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</h1><p className="muted">Record first. Analyze when you need it.</p></div><button className="primary-btn big-action" onClick={()=>navigate('/add')}><Plus size={18}/> Add Transaction</button></section>
    {reviewQueue.length>0&&<Link to="/review" className="review-alert"><AlertCircle size={18}/><div><strong>{reviewQueue.length} transaction{reviewQueue.length===1?'':'s'} need review</strong><span>Confirm them before they enter your reports.</span></div><span>Review →</span></Link>}
    {transactions.length===0&&<div className="info-banner recovery-banner"><div><strong>No local transactions found.</strong><span> If this browser was cleared, you can recover from your connected Google Sheet.</span></div><Link to="/settings" className="secondary-btn">Recover data</Link></div>}
    <section className="metric-grid"><MetricCard label="Spent this month" value={formatCurrency(summary.expenses)}/><MetricCard label="Transactions" value={String(summary.transactionCount)}/>{summary.income>0&&<MetricCard label="Income" value={formatCurrency(summary.income)}/>} {summary.income>0&&<MetricCard label="Remaining" value={formatCurrency(summary.income-summary.expenses)}/>}</section>
    <section className="content-grid"><div className="panel large-panel"><div className="panel-header"><div><h2>Recent transactions</h2><p>Latest confirmed activity</p></div><Link to="/transactions" className="text-link">View all</Link></div><TransactionList transactions={recent} accounts={accounts} categories={categories} onSelect={t=>navigate(`/transactions/${t.id}`)}/></div>
      <div className="panel"><div className="panel-header"><div><h2>Spending trend</h2><p>Current month</p></div></div><div className="chart-box"><ResponsiveContainer width="100%" height={180}><LineChart data={series}><Tooltip contentStyle={{background:'#15181d',border:'1px solid #2b3038',borderRadius:12,color:'#fff'}} formatter={(v)=>[formatCurrency(Number(v)),'Spent']}/><Line type="monotone" dataKey="amount" stroke="#7c8cff" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div>
        <div className="panel-header mini"><div><h3>Spend by category</h3><p>Tap a slice or row to drill down.</p></div></div>{categoryData.length?<><div className="chart-box"><ResponsiveContainer width="100%" height={230}><PieChart><Pie data={categoryData} dataKey="amount" nameKey="name" innerRadius="48%" outerRadius="78%" onClick={(_, index) => {
  const selected = categoryData[index];

  if (!selected) {
    return;
  }

  navigate(
    `/transactions?month=${new Date().toISOString().slice(0,7)}&category=${selected.id}`
  );
}}>{categoryData.map((c,i)=><Cell key={c.id} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}</Pie><Tooltip formatter={(v)=>formatCurrency(Number(v))}/></PieChart></ResponsiveContainer></div><div className="stacked-list">{categoryData.map(c=><button className="stat-row clickable" key={c.id} onClick={()=>navigate(`/transactions?month=${new Date().toISOString().slice(0,7)}&category=${c.id}`)}><span>{c.name}</span><strong>{formatCurrency(c.amount)} <ChevronRight size={14}/></strong></button>)}</div></>:<div className="empty-inline">Categories will appear after you record spending.</div>}
      </div></section>
  </div>;
}
