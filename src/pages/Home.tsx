import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Plus } from 'lucide-react';
import { useTransactions, useAccounts, useCategories, useReviewQueue } from '../hooks/useDb';
import { formatCurrency } from '../utils/format';
import { getMonthlyTransactions, calculateSummary, buildDailySeries } from '../services/reportingService';
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import TransactionList from '../components/TransactionList';
import MetricCard from '../components/MetricCard';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

export default function Home() {
  const navigate = useNavigate();
  const transactions = useTransactions();
  const accounts = useAccounts();
  const categories = useCategories();
  const reviewQueue = useReviewQueue();
  const monthTransactions = useLiveQuery(() => getMonthlyTransactions(new Date()), [], []);
  const summary = useMemo(() => calculateSummary(monthTransactions || []), [monthTransactions]);
  const series = useMemo(() => buildDailySeries(monthTransactions || [], new Date()), [monthTransactions]);

  const topCategories = useMemo(() => {
    const map = new Map<string, number>();
    (monthTransactions || []).filter(t => t.type === 'EXPENSE').forEach(t => map.set(t.categoryId || 'uncategorized', (map.get(t.categoryId || 'uncategorized') || 0) + t.amount));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, amount]) => ({ name: categories.find(c => c.id === id)?.name || 'Uncategorized', amount }));
  }, [monthTransactions, categories]);

  return <div className="page-stack">
    <section className="hero-row">
      <div>
        <span className="eyebrow">Current month</span>
        <h1>{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h1>
        <p className="muted">Record first. Analyze when you need it.</p>
      </div>
      <button className="primary-btn big-action" onClick={() => navigate('/add')}><Plus size={18} /> Add Transaction</button>
    </section>

    {reviewQueue.length > 0 && <Link to="/review" className="review-alert"><AlertCircle size={18} /><div><strong>{reviewQueue.length} transaction{reviewQueue.length === 1 ? '' : 's'} need review</strong><span>Open the queue and confirm them before they enter your reports.</span></div><span>Review →</span></Link>}

    <section className="metric-grid">
      <MetricCard label="Spent this month" value={formatCurrency(summary.expenses)} />
      <MetricCard label="Transactions" value={String(summary.transactionCount)} />
      {summary.income > 0 && <MetricCard label="Income" value={formatCurrency(summary.income)} />}
      {summary.income > 0 && <MetricCard label="Remaining" value={formatCurrency(summary.income - summary.expenses)} />}
    </section>

    <section className="content-grid">
      <div className="panel large-panel">
        <div className="panel-header"><div><h2>Recent transactions</h2><p>Latest confirmed activity</p></div><Link to="/transactions" className="text-link">View all</Link></div>
        <TransactionList transactions={(transactions || []).slice().sort((a,b) => +new Date(b.transactionDateTime)-+new Date(a.transactionDateTime)).slice(0, 8)} accounts={accounts} categories={categories} onSelect={(t) => navigate(`/transactions/${t.id}`)} />
      </div>
      <div className="panel">
        <div className="panel-header"><div><h2>Spending trend</h2><p>Current month</p></div></div>
        <div className="chart-box"><ResponsiveContainer width="100%" height={220}><LineChart data={series}><Tooltip contentStyle={{ background: '#15181d', border: '1px solid #2b3038', borderRadius: 12, color: '#fff' }} formatter={(v) => [formatCurrency(Number(v)), 'Spent']} /><Line type="monotone" dataKey="amount" stroke="#7c8cff" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div>
        <div className="panel-header mini"><div><h3>Top categories</h3></div></div>
        <div className="stacked-list">{topCategories.length ? topCategories.map((c) => <div className="stat-row" key={c.name}><span>{c.name}</span><strong>{formatCurrency(c.amount)}</strong></div>) : <span className="muted">Categories will appear after you record spending.</span>}</div>
      </div>
    </section>
  </div>;
}
