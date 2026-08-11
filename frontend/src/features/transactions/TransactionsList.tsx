import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useCategories } from '../categories/useCategories';

function currentMonthRange() {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

export function TransactionsList() {
  const [{ from, to }] = useState(currentMonthRange());
  const { data: categories = [] } = useCategories();
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', from, to],
    queryFn: () => api.getTransactions({ from, to, limit: 200 }),
  });

  const categoryName = (id: string) => categories.find((c) => c.categoryId === id)?.displayName ?? id;

  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (transactions.length === 0) {
    return <p className="text-slate-500">No transactions this month yet. Add your first one above.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {transactions.map((t) => (
        <li key={t.transactionId} className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium">{t.merchantName || categoryName(t.categoryId)}</p>
            <p className="text-sm text-slate-500">
              {t.date} · {categoryName(t.categoryId)}
            </p>
          </div>
          <p
            className={`tabular font-display text-lg ${
              t.transactionType === 'EXPENSE'
                ? 'text-expense'
                : t.transactionType === 'INCOME'
                ? 'text-income'
                : 'text-invest'
            }`}
          >
            {t.transactionType === 'EXPENSE' ? '−' : '+'}₹{Number(t.amount).toLocaleString('en-IN')}
          </p>
        </li>
      ))}
    </ul>
  );
}
