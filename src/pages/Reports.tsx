import { useMemo } from 'react';
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getMonthlyTransactions, calculateSummary, buildMonthlySeries, buildDailySeries } from '../services/reportingService';
import { useCategories } from '../hooks/useDb';
import { formatCurrency } from '../utils/format';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Reports() {
  const categories = useCategories();
  const all = useLiveQuery(() => getMonthlyTransactions(new Date()), [], []);
  const summary = calculateSummary(all || []);
  const monthly = useLiveQuery(async () => {
    const rows = await import('../services/reportingService').then(m => m.getActiveTransactions());
    return buildMonthlySeries(rows, 6);
  }, [], []);
  const daily = buildDailySeries(all || [], new Date());

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    (all || []).filter(t => t.type === 'EXPENSE').forEach(t => map.set(t.categoryId || 'Other', (map.get(t.categoryId || 'Other') || 0) + t.amount));
    return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id, amount]) => ({ name: categories.find(c=>c.id===id)?.name || 'Other', amount }));
  }, [all, categories]);

  return <div className="page-stack">
    <section className="hero-row"><div><span className="eyebrow">Analytics</span><h1>Reports</h1><p className="muted">Detailed analysis without requiring a backend.</p></div></section>
    <section className="metric-grid"><div className="metric-card"><span>Expenses</span><strong>{formatCurrency(summary.expenses)}</strong><small>Current month</small></div><div className="metric-card"><span>Avg / transaction</span><strong>{formatCurrency(summary.averageTransaction)}</strong><small>Income + expense activity</small></div><div className="metric-card"><span>Transactions</span><strong>{summary.transactionCount}</strong><small>Current month</small></div>{summary.income > 0 && <div className="metric-card"><span>Net</span><strong>{formatCurrency(summary.income - summary.expenses)}</strong><small>Income minus expenses</small></div>}</section>
    <div className="report-grid">
      <section className="panel"><div className="panel-header"><div><h2>Daily spending</h2><p>Current month</p></div><TrendingDown size={18}/></div><ResponsiveContainer width="100%" height={250}><LineChart data={daily}><CartesianGrid stroke="#252a32" vertical={false}/><XAxis dataKey="day" stroke="#78808e" tickLine={false}/><YAxis stroke="#78808e" tickLine={false} width={50}/><Tooltip contentStyle={{background:'#15181d',border:'1px solid #2b3038',borderRadius:12}}/><Line dataKey="amount" type="monotone" stroke="#7c8cff" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></section>
      <section className="panel"><div className="panel-header"><div><h2>Top categories</h2><p>Largest current-month expense groups</p></div><BarChart3 size={18}/></div><ResponsiveContainer width="100%" height={250}><BarChart data={categoryData} layout="vertical"><CartesianGrid stroke="#252a32" horizontal={false}/><XAxis type="number" stroke="#78808e" tickLine={false}/><YAxis type="category" dataKey="name" stroke="#78808e" tickLine={false} width={95}/><Tooltip contentStyle={{background:'#15181d',border:'1px solid #2b3038',borderRadius:12}}/><Bar dataKey="amount" fill="#7c8cff" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer></section>
    </div>
    <section className="panel"><div className="panel-header"><div><h2>Six-month trend</h2><p>Expense movement across recent months</p></div><TrendingUp size={18}/></div><ResponsiveContainer width="100%" height={280}><BarChart data={monthly || []}><CartesianGrid stroke="#252a32" vertical={false}/><XAxis dataKey="month" stroke="#78808e" tickLine={false}/><YAxis stroke="#78808e" tickLine={false}/><Tooltip contentStyle={{background:'#15181d',border:'1px solid #2b3038',borderRadius:12}}/><Bar dataKey="amount" fill="#5663aa" radius={[7,7,0,0]}/></BarChart></ResponsiveContainer></section>
  </div>;
}
