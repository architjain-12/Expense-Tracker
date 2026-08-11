// -----------------------------------------------------------------------------
// DASHBOARD
// -----------------------------------------------------------------------------
// Shows both the quick view and verbose financial context requested for V2.
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

const monthNow = () => new Date().toISOString().slice(0, 7);
const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export function Dashboard() {
  const month = monthNow();
  const { data, isLoading, error } = useQuery({ queryKey: ['monthlySummary', month], queryFn: () => api.getMonthlySummary(month) });
  const { data: netWorth } = useQuery({ queryKey: ['netWorth'], queryFn: api.getNetWorth });
  if (isLoading) return <p className="muted">Loading dashboard…</p>;
  if (error || !data) return <p className="error">{(error as Error)?.message || 'No dashboard data.'}</p>;
  return <div className="space-y-4">
    <section className="hero"><span>{new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span><h2>{money(data.savings)} available after expenses & investments</h2><p>{data.transactionCount} transactions · savings rate {Math.round(data.savingsRate * 100)}%</p></section>
    <div className="stats"><Stat label="Income" value={money(data.totalIncome)} /><Stat label="Expenses" value={money(data.totalExpense)} /><Stat label="Investments" value={money(data.totalInvestment)} /><Stat label="Net Worth" value={money(netWorth?.netWorth || 0)} /></div>
    <section className="card"><h3>Expense breakdown</h3>{data.categoryBreakdown.length ? data.categoryBreakdown.map(x => <div className="bar-row" key={x.category}><span>{x.category}</span><strong>{money(x.amount)}</strong><div className="bar"><i style={{ width: `${Math.min(100, data.totalExpense ? x.amount / data.totalExpense * 100 : 0)}%` }} /></div></div>) : <p className="muted">No expenses this month.</p>}</section>
    <section className="card"><h3>Budget vs actual</h3>{data.budgetBreakdown.length ? data.budgetBreakdown.map(x => <div className="report-row" key={x.categoryId}><span>{x.category} · budget {money(x.budget)}</span><strong>{money(x.actual)} / {money(x.remaining)} left</strong></div>) : <p className="muted">No budgets configured for this month. Add them under Manage → Budgets.</p>}</section>
    <section className="card"><h3>Account activity</h3>{data.accountBreakdown.map(x => <div className="report-row" key={x.account}><span>{x.account}</span><strong>{money(x.amount)}</strong></div>)}</section>
    <section className="card"><h3>Latest transactions</h3>{data.topTransactions.map(t => <div className="report-row" key={t.transactionId}><span>{t.date} · {t.merchantName || t.categoryId}</span><strong>{t.transactionType === 'EXPENSE' ? '−' : '+'}{money(t.amount)}</strong></div>)}</section>
  </div>;
}
function Stat({ label, value }: { label: string; value: string }) { return <div className="stat"><span>{label}</span><strong>{value}</strong></div>; }
