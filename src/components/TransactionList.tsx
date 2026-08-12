import { RefreshCcw, Zap } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import type { Account, Category, Transaction } from '../types/models';

interface Props {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onSelect?: (transaction: Transaction) => void;
}

export default function TransactionList({ transactions, accounts, categories, onSelect }: Props) {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  if (!transactions.length) {
    return <div className="empty-state"><div className="empty-icon">₹</div><h3>No transactions here</h3><p>Add your first transaction to start tracking spending.</p></div>;
  }

  const groups = transactions
    .slice()
    .sort((a, b) => new Date(b.transactionDateTime).getTime() - new Date(a.transactionDateTime).getTime())
    .reduce<Record<string, Transaction[]>>((acc, transaction) => {
      const key = new Date(transaction.transactionDateTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      (acc[key] ??= []).push(transaction);
      return acc;
    }, {});

  return <div className="transaction-list">
    {Object.entries(groups).map(([day, items]) => (
      <section key={day} className="day-group">
        <div className="day-label">{day}</div>
        {items.map((t) => {
          const sign = t.type === 'INCOME' ? '+' : '-';
          const sourceIcon = t.source === 'RECURRING' ? <RefreshCcw size={13} /> : t.source === 'AUTOMATION' ? <Zap size={13} /> : null;
          return <button key={t.id} className="transaction-row" onClick={() => onSelect?.(t)}>
            <div className="transaction-main">
              <strong>{t.merchant || categoryMap.get(t.categoryId || '') || 'Transaction'}</strong>
              <span>{categoryMap.get(t.categoryId || '') || 'Uncategorized'} · {accountMap.get(t.accountId) || 'Unknown account'}</span>
            </div>
            <div className="transaction-meta">
              <time>{new Date(t.transactionDateTime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</time>
              <strong className={t.type === 'INCOME' ? 'positive' : ''}>{sign}{formatCurrency(t.amount)}</strong>
              {sourceIcon && <span className="source-icon" title={t.source === 'RECURRING' ? 'Recurring payment' : 'Imported automatically'}>{sourceIcon}</span>}
            </div>
          </button>;
        })}
      </section>
    ))}
  </div>;
}
