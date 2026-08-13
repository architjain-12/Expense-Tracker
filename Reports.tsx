import { useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, WalletCards, PiggyBank, Activity, TrendingUp, BarChart3, FileText } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { addMonths, eachMonthOfInterval, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { getActiveTransactions } from '../services/reportingService';
import { useBudgets, useCategories } from '../hooks/useDb';
import { formatCurrency } from '../utils/format';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Transaction } from '../types/models';

function unique(rows: Transaction[]) { const ids=new Set<string>(); return rows.filter(r=>!r.deletedAt&&!ids.has(r.id)&&ids.add(r.id)); }
function monthRange(anchor: Date) { return { start:startOfMonth(anchor), end:endOfMonth(anchor) }; }
function getFY(anchor: Date) { const y=anchor.getMonth()>=3?anchor.getFullYear():anchor.getFullYear()-1; return { start:new Date(y,3,1), end:new Date(y+1,2,31,23,59,59,999) }; }

export default function Reports(){
  const [mode,setMode]=useState<'MONTH'|'FY'>('MONTH');
  const [anchor,setAnchor]=useState(new Date());
  const transactions=useLiveQuery(()=>getActiveTransactions(),[],[]);
  const budgets=useBudgets()??[]; const categories=useCategories()??[];
  const rows=unique(transactions??[]);
  const range=mode==='MONTH'?monthRange(anchor):getFY(anchor);
  const inRange=useMemo(()=>rows.filter(t=>{const d=new Date(t.transactionDateTime);return d>=range.start&&d<=range.end;}),[rows,range.start.getTime(),range.end.getTime()]);
  const income=inRange.filter(t=>t.type==='INCOME').reduce((s,t)=>s+t.amount,0);
  const expenses=inRange.filter(t=>t.type==='EXPENSE').reduce((s,t)=>s+t.amount,0);
  const budget=mode==='MONTH'?(budgets.find(b=>!b.categoryId&&b.period==='MONTHLY'&&b.startDate.slice(0,7)===format(anchor,'yyyy-MM'))?.amount||0):(budgets.filter(b=>!b.categoryId&&b.period==='MONTHLY'&&new Date(b.startDate)>=range.start&&new Date(b.startDate)<=range.end).reduce((s,b)=>s+b.amount,0));
  const estimatedDues=0; const savings=income-expenses; const projectedSavings=savings-estimatedDues;
  const monthly=useMemo(()=>{
    if(mode==='MONTH') return [];
    return eachMonthOfInterval({start:startOfMonth(range.start),end:startOfMonth(range.end)}).map(m=>{
      const rs=rows.filter(t=>{const d=new Date(t.transactionDateTime);return d>=startOfMonth(m)&&d<=endOfMonth(m);});
      return {month:format(m,'MMM'),income:rs.filter(t=>t.type==='INCOME').reduce((s,t)=>s+t.amount,0),expenses:rs.filter(t=>t.type==='EXPENSE').reduce((s,t)=>s+t.amount,0),savings:rs.filter(t=>t.type==='INCOME').reduce((s,t)=>s+t.amount,0)-rs.filter(t=>t.type==='EXPENSE').reduce((s,t)=>s+t.amount,0)};
    });
  },[mode,rows,range.start.getTime(),range.end.getTime()]);
  const categoryData=useMemo(()=>{const map=new Map<string,number>();inRange.filter(t=>t.type==='EXPENSE').forEach(t=>{const c=t.categoryId||'other';map.set(c,(map.get(c)||0)+t.amount);});return [...map.entries()].sort((a,b)=>b[1]-a[1]).map(([id,amount])=>({name:categories.find(c=>c.id===id)?.name||'Other',amount}));},[inRange,categories]);
  function shift(delta:number){setAnchor(mode==='MONTH'?addMonths(anchor,delta):new Date(anchor.getFullYear()+delta,anchor.getMonth(),1));}
  const title=mode==='MONTH'?format(anchor,'MMMM yyyy'):`FY ${format(range.start,'yyyy')}–${format(range.end,'yy')}`;
  return <div className="page-stack">
    <section className="hero-row"><div><span className="eyebrow">Financial reporting</span><h1>Reports</h1><p className="muted">Focused reports for monthly and Indian financial-year review.</p></div></section>
    <section className="panel report-toolbar"><div className="segmented"><button className={mode==='MONTH'?'active':''} onClick={()=>setMode('MONTH')}>Monthly</button><button className={mode==='FY'?'active':''} onClick={()=>setMode('FY')}>Financial Year</button></div><div className="month-nav"><button className="icon-btn" onClick={()=>shift(-1)}><ChevronLeft size={16}/></button><strong className="period-label">{title}</strong><button className="icon-btn" onClick={()=>shift(1)}><ChevronRight size={16}/></button></div></section>
    <section className="metric-grid compact"><div className="metric-card"><span>Total income</span><strong className="positive">{formatCurrency(income)}</strong><small>Recorded income</small></div><div className="metric-card"><span>Total budget</span><strong>{formatCurrency(budget)}</strong><small>{mode==='MONTH'?'This month':'FY total'}</small></div><div className="metric-card"><span>Total spends</span><strong>{formatCurrency(expenses)}</strong><small>Recorded expenses</small></div><div className="metric-card"><span>Total savings</span><strong className={savings>=0?'positive':''}>{formatCurrency(savings)}</strong><small>Income minus spends</small></div></section>
    <div className="report-cards">
      <ReportCard icon={<Activity size={18}/>} title="Cash Flow" text="See income, expenses and net cash movement." onClick={()=>document.getElementById('cash-flow')?.scrollIntoView({behavior:'smooth'})}/>
      <ReportCard icon={<PiggyBank size={18}/>} title="Savings Analysis" text={`Savings rate ${income?Math.round(savings/income*100):0}% · projected {formatCurrency(projectedSavings)}`} onClick={()=>document.getElementById('savings')?.scrollIntoView({behavior:'smooth'})}/>
      <ReportCard icon={<WalletCards size={18}/>} title="Budget vs Actual" text={`${formatCurrency(expenses)} spent against ${formatCurrency(budget)} budget.`} onClick={()=>document.getElementById('budget-analysis')?.scrollIntoView({behavior:'smooth'})}/>
      <ReportCard icon={<TrendingUp size={18}/>} title="Income vs Expense" text="Yearly line trend across every month." onClick={()=>document.getElementById('income-expense')?.scrollIntoView({behavior:'smooth'})}/>
      <ReportCard icon={<BarChart3 size={18}/>} title="Category Contribution" text="Which categories consumed the most this period." onClick={()=>document.getElementById('category-contribution')?.scrollIntoView({behavior:'smooth'})}/>
    </div>
    <section id="cash-flow" className="panel report-section"><div className="panel-header"><div><h2>Cash Flow</h2><p>Actual recorded money movement.</p></div><Activity size={18}/></div><div className="stacked-list"><div className="stat-row"><span>Income</span><strong className="positive">+{formatCurrency(income)}</strong></div><div className="stat-row"><span>Expenses</span><strong>-{formatCurrency(expenses)}</strong></div><div className="stat-row"><span>Net cash flow</span><strong className={savings>=0?'positive':''}>{formatCurrency(savings)}</strong></div></div></section>
    <section id="budget-analysis" className="panel report-section"><div className="panel-header"><div><h2>Budget vs Actual</h2><p>Overall budget utilisation.</p></div><WalletCards size={18}/></div><div className="budget-report"><div className="budget-report-value"><strong>{formatCurrency(expenses)}</strong><span>of {formatCurrency(budget)}</span></div><div className={`budget-progress ${budget&&expenses/budget>=1?'over':budget&&expenses/budget>=.75?'warning':''}`}><span style={{width:`${budget?Math.min(100,expenses/budget*100):0}%`}}/></div><p className="muted">{budget?`${Math.round(expenses/budget*100)}% used · ${formatCurrency(Math.max(0,budget-expenses))} remaining`:'Set a monthly budget to enable budget analysis.'}</p></div></section>
    <section id="savings" className="panel report-section"><div className="panel-header"><div><h2>Savings Analysis</h2><p>Actual savings before any future dues.</p></div><PiggyBank size={18}/></div><div className="stacked-list"><div className="stat-row"><span>Savings rate</span><strong>{income?Math.round(savings/income*100):0}%</strong></div><div className="stat-row"><span>Estimated dues</span><strong>{formatCurrency(estimatedDues)}</strong></div><div className="stat-row"><span>Projected savings</span><strong className={projectedSavings>=0?'positive':''}>{formatCurrency(projectedSavings)}</strong></div></div></section>
    {mode==='FY'&&<section id="income-expense" className="panel report-section"><div className="panel-header"><div><h2>Income vs Expense</h2><p>Every month in the selected financial year, including zero months.</p></div><TrendingUp size={18}/></div><div className="chart-box"><ResponsiveContainer width="100%" height={300}><LineChart data={monthly}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month"/><YAxis/><Tooltip formatter={(v:number)=>formatCurrency(v)}/><Line type="monotone" dataKey="income" name="Income" stroke="#49d597" strokeWidth={3} dot={false}/><Line type="monotone" dataKey="expenses" name="Expenses" stroke="#7c8cff" strokeWidth={3} dot={false}/><Line type="monotone" dataKey="savings" name="Savings" stroke="#e9b45a" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div></section>}
    <section id="category-contribution" className="panel report-section"><div className="panel-header"><div><h2>Category Contribution</h2><p>Current reporting-period expense distribution.</p></div><FileText size={18}/></div><div className="stacked-list">{categoryData.length?categoryData.map(c=><div className="stat-row" key={c.name}><span>{c.name}</span><strong>{formatCurrency(c.amount)} · {expenses?Math.round(c.amount/expenses*100):0}%</strong></div>):<div className="empty-inline">No expense data for this period.</div>}</div></section>
  </div>;
}
function ReportCard({icon,title,text,onClick}:{icon:ReactNode;title:string;text:string;onClick:()=>void}){return <button className="report-card" onClick={onClick}><span className="option-icon">{icon}</span><span><strong>{title}</strong><small>{text}</small></span><ChevronRight size={16}/></button>}
