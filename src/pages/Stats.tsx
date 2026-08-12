import { useMemo, useState } from 'react';
import { BarChart3, CalendarDays, PieChart as PieIcon } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAccounts, useCategories, useTransactions } from '../hooks/useDb';
import { formatCurrency } from '../utils/format';
import { endOfMonth, parseISO, startOfMonth } from 'date-fns';

const PIE_COLORS = ['#7c8cff', '#5dd39e', '#f2c14e', '#e17878', '#7fc8f8', '#c39be8'];

function getSafeDate(value: string | undefined): Date | null {
  if (!value) return null;

  try {
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

export default function Stats() {
  const transactions = useTransactions() ?? [];
  const categories = useCategories() ?? [];
  const accounts = useAccounts() ?? [];
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const initialMonth = params.get('month') || new Date().toISOString().slice(0, 7);

  const [month, setMonth] = useState(initialMonth);
  const [category, setCategory] = useState(params.get('category') || '');
  const [subcategory, setSubcategory] = useState(params.get('subcategory') || '');
  const [account, setAccount] = useState(params.get('account') || '');

  const roots = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories]
  );

  const subs = useMemo(
    () => categories.filter((c) => c.parentId === category),
    [categories, category]
  );

  const rows = useMemo(() => {
    const [year, monthNumber] = month.split('-').map(Number);

    if (!Number.isFinite(year) || !Number.isFinite(monthNumber)) {
      return [];
    }

    const start = startOfMonth(new Date(year, monthNumber - 1, 1));
    const end = endOfMonth(start);

    return transactions.filter((transaction) => {
      if (transaction.type !== 'EXPENSE') return false;

      const date = getSafeDate(transaction.transactionDateTime);
      if (!date) return false;

      return (
        date >= start &&
        date <= end &&
        (!category || transaction.categoryId === category) &&
        (!subcategory || transaction.subcategoryId === subcategory) &&
        (!account || transaction.accountId === account)
      );
    });
  }, [transactions, month, category, subcategory, account]);

  const filteredSpend = useMemo(
    () => rows.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
    [rows]
  );

  const averageSpend = rows.length ? filteredSpend / rows.length : 0;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();

    for (const transaction of rows) {
      const id = transaction.categoryId || 'uncategorized';
      map.set(id, (map.get(id) || 0) + Number(transaction.amount || 0));
    }

    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, amount]) => ({
        id,
        name: categories.find((c) => c.id === id)?.name || 'Uncategorized',
        amount,
      }));
  }, [rows, categories]);

  const byAccount = useMemo(() => {
    const map = new Map<string, number>();

    for (const transaction of rows) {
      map.set(
        transaction.accountId,
        (map.get(transaction.accountId) || 0) + Number(transaction.amount || 0)
      );
    }

    return [...map.entries()]
      .map(([id, amount]) => ({
        id,
        name: accounts.find((accountItem) => accountItem.id === id)?.name || 'Unknown',
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [rows, accounts]);

  function applyFilters() {
    const next = new URLSearchParams();
    next.set('month', month);
    if (category) next.set('category', category);
    if (subcategory) next.set('subcategory', subcategory);
    if (account) next.set('account', account);
    setParams(next);
  }

  function openCategory(categoryId: string) {
    navigate(`/transactions?month=${month}&category=${encodeURIComponent(categoryId)}`);
  }

  return (
    <div className="page-stack">
      <section className="hero-row">
        <div>
          <span className="eyebrow">Stats</span>
          <h1>Spending statistics</h1>
          <p className="muted">
            Filter by month, category, subcategory and account.
          </p>
        </div>
      </section>

      <div className="toolbar stat-filters">
        <label className="tool-field">
          <CalendarDays size={16} />
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </label>

        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setSubcategory('');
          }}
        >
          <option value="">All categories</option>
          {roots.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          value={subcategory}
          disabled={!category}
          onChange={(event) => setSubcategory(event.target.value)}
        >
          <option value="">All subcategories</option>
          {subs.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <select value={account} onChange={(event) => setAccount(event.target.value)}>
          <option value="">All accounts</option>
          {accounts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <button className="secondary-btn" onClick={applyFilters}>
          Apply
        </button>
      </div>

      <section className="metric-grid">
        <div className="metric-card">
          <span>Filtered spend</span>
          <strong>{formatCurrency(filteredSpend)}</strong>
          <small>{rows.length} transactions</small>
        </div>

        <div className="metric-card">
          <span>Average</span>
          <strong>{formatCurrency(averageSpend)}</strong>
          <small>Per transaction</small>
        </div>
      </section>

      <div className="report-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Category spend</h2>
              <p>Tap a category to drill into transactions.</p>
            </div>
            <PieIcon size={18} />
          </div>

          {byCategory.length === 0 ? (
            <div className="empty-state" style={{ margin: 18 }}>
              <h3>No spending found</h3>
              <p>Try another month or remove the filters.</p>
            </div>
          ) : (
            <>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={byCategory}
                      dataKey="amount"
                      nameKey="name"
                      innerRadius="48%"
                      outerRadius="78%"
                      onClick={(_, index) => {
                        const selected = byCategory[index];
                        if (selected) openCategory(selected.id);
                      }}
                    >
                      {byCategory.map((entry, index) => (
                        <Cell
                          key={entry.id}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        formatCurrency(Number(value)),
                        'Spend',
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="stacked-list">
                {byCategory.map((item) => (
                  <button
                    className="stat-row clickable"
                    key={item.id}
                    onClick={() => openCategory(item.id)}
                  >
                    <span>{item.name}</span>
                    <strong>{formatCurrency(item.amount)}</strong>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>By account</h2>
              <p>Filtered spending by account.</p>
            </div>
            <BarChart3 size={18} />
          </div>

          {byAccount.length === 0 ? (
            <div className="empty-state" style={{ margin: 18 }}>
              <h3>No account spending found</h3>
              <p>Try another month or remove the filters.</p>
            </div>
          ) : (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byAccount} layout="vertical">
                  <CartesianGrid stroke="#252a32" horizontal={false} />
                  <XAxis type="number" stroke="#78808e" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    stroke="#78808e"
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(Number(value)),
                      'Spend',
                    ]}
                  />
                  <Bar
                    dataKey="amount"
                    fill="#7c8cff"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
