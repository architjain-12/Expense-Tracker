import { ArrowLeft, RefreshCcw, Zap, Trash2, Pencil } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { useAccounts, useCategories } from '../hooks/useDb';
import { formatCurrency } from '../utils/format';
import { deleteTransaction } from '../services/transactionService';

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const transaction = useLiveQuery(() => id ? db.transactions.get(id) : undefined, [id]);
  const accounts = useAccounts();
  const categories = useCategories();
  const account = accounts.find(a => a.id === transaction?.accountId);
  const category = categories.find(c => c.id === transaction?.categoryId);

  if (!transaction) return <div className="empty-state"><h3>Transaction not found</h3><button className="text-link" onClick={() => navigate('/transactions')}>Back to transactions</button></div>;

  async function remove() {
    if (!confirm('Delete this transaction?')) return;
    await deleteTransaction(transaction.id);
    navigate('/transactions');
  }

  return <div className="detail-page">
    <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft /></button>
    <div className="detail-amount"><span className="eyebrow">{transaction.type === 'INCOME' ? 'Income' : 'Expense'}</span><strong className={transaction.type === 'INCOME' ? 'positive' : ''}>{transaction.type === 'INCOME' ? '+' : '-'}{formatCurrency(transaction.amount)}</strong><span>{new Date(transaction.transactionDateTime).toLocaleString('en-IN')}</span></div>
    <div className="detail-card">
      <Detail label="Account" value={account?.name || 'Unknown'} />
      <Detail label="Category" value={category?.name || 'Uncategorized'} />
      <Detail label="Merchant" value={transaction.merchant || '—'} />
      <Detail label="Notes" value={transaction.notes || '—'} />
      <Detail label="Source" value={transaction.source === 'RECURRING' ? '↻ Recurring payment' : transaction.source === 'AUTOMATION' ? '⚡ Automated' : transaction.source} />
      {transaction.recurringRuleId && <Detail label="Recurring rule" value={transaction.recurringRuleId} />}
    </div>
    <div className="detail-actions"><button className="secondary-btn" onClick={() => navigate(`/transactions/${transaction.id}/edit`)}><Pencil size={16}/> Edit</button><button className="danger-btn" onClick={remove}><Trash2 size={16}/> Delete</button></div>
  </div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="detail-row"><span>{label}</span><strong>{value}</strong></div>;
}
