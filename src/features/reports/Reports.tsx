// Yearly reports and net-worth reporting.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export function Reports() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const { data, isLoading } = useQuery({ queryKey: ['yearlyReport', year], queryFn: () => api.getYearlyReport(year) });
  const { data: netWorth } = useQuery({ queryKey: ['netWorth'], queryFn: api.getNetWorth });
  return <div className="space-y-4">
    <section className="card toolbar"><label>Year <input value={year} onChange={e => setYear(e.target.value)} className="input small" /></label></section>
    {isLoading ? <p className="muted">Building report…</p> : data && <>
      <section className="stats"><div className="stat"><span>Year income</span><strong>{money(data.totals.income)}</strong></div><div className="stat"><span>Year expenses</span><strong>{money(data.totals.expense)}</strong></div><div className="stat"><span>Year invested</span><strong>{money(data.totals.investment)}</strong></div><div className="stat"><span>Year savings</span><strong>{money(data.totals.savings)}</strong></div></section>
      <section className="card"><h3>Month-by-month detail</h3><div className="table-wrap"><table><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Invested</th><th>Savings</th><th>Rate</th><th>Txns</th></tr></thead><tbody>{data.months.map(m => <tr key={m.month}><td>{m.month}</td><td>{money(m.totalIncome)}</td><td>{money(m.totalExpense)}</td><td>{money(m.totalInvestment)}</td><td>{money(m.savings)}</td><td>{Math.round(m.savingsRate * 100)}%</td><td>{m.transactionCount}</td></tr>)}</tbody></table></div></section>
    </>}
    {netWorth && <section className="card"><h3>Net worth</h3><div className="stats"><div className="stat"><span>Total assets</span><strong>{money(netWorth.assets)}</strong></div><div className="stat"><span>Investments</span><strong>{money(netWorth.investments)}</strong></div><div className="stat"><span>Liabilities</span><strong>{money(netWorth.liabilities)}</strong></div><div className="stat"><span>Net worth</span><strong>{money(netWorth.netWorth)}</strong></div></div></section>}
  </div>;
}
