import { useMemo, useState } from 'react';
import { CalendarDays, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { useAccounts, useCategories, useTransactions } from '../hooks/useDb';
import TransactionList from '../components/TransactionList';
import { formatCurrency } from '../utils/format';

export default function Transactions() {
  const navigate = useNavigate();
  const transactions = useTransactions();
  const accounts = useAccounts();
  const categories = useCategories();
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [view, setView] = useState('All Transactions');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const [year, mon] = month.split('-').map(Number);
    const start = startOfMonth(new Date(year, mon - 1, 1));
    const end = endOfMonth(start);
    let rows = transactions.filter(t => {
      const d = new Date(t.transactionDateTime);
      return d >= start && d <= end;
    });
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(t => `${t.merchant || ''} ${t.notes || ''}`.toLowerCase().includes(q));
    }
    if (view === 'Expenses') rows = rows.filter(t => t.type === 'EXPENSE');
    if (view === 'Income') rows = rows.filter(t => t.type === 'INCOME');
    if (view === 'Recurring') rows = rows.filter(t => t.source === 'RECURRING');
    return rows;
  }, [transactions, month, view, query]);

  const expenseTotal = filtered.filter(t => t.type === 'EXPENSE').reduce((s,t)=>s+t.amount,0);

  return <div className="page-stack">
    <section className="hero-row"><div><span className="eyebrow">Ledger</span><h1>Transactions</h1><p className="muted">Default view is the complete current month.</p></div></section>
    <div className="toolbar">
      <label className="tool-field"><CalendarDays size={16}/><input type="month" value={month} onChange={e => setMonth(e.target.value)} /></label>
      <select value={view} onChange={e => setView(e.target.value)}><option>All Transactions</option><option>Expenses</option><option>Income</option><option>Recurring</option></select>
      <label className="search-field"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search merchant or note" /></label>
    </div>
    <div className="summary-strip"><span>{filtered.length} transactions</span><strong>{formatCurrency(expenseTotal)} expenses</strong></div>
    <section className="panel"><TransactionList transactions={filtered} accounts={accounts} categories={categories} onSelect={t => navigate(`/transactions/${t.id}`)} /></section>
  </div>;
}
