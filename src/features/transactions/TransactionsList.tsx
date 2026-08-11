// Detailed transaction table/list. On mobile it becomes compact cards.
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useCategories, useAccounts } from '../categories/useCategories';

export function TransactionsList() {
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [], isLoading } = useQuery({ queryKey: ['transactions', 'recent'], queryFn: () => api.getTransactions({ limit: '300' }) });
  if (isLoading) return <p className="muted">Loading transactions…</p>;
  const categoryName = (id: string) => categories.find(c => c.categoryId === id)?.displayName ?? id;
  const accountName = (id: string) => accounts.find(a => a.accountId === id)?.displayName ?? id;
  if (!transactions.length) return <p className="muted">No transactions yet.</p>;
  return <div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Merchant</th><th>Account</th><th>Amount</th><th>Notes</th></tr></thead><tbody>
    {transactions.map(t => <tr key={t.transactionId}><td>{t.date}</td><td>{t.transactionType}</td><td>{categoryName(t.categoryId)}</td><td>{t.merchantName || '—'}</td><td>{accountName(t.accountId)}</td><td className="money">₹{Number(t.amount).toLocaleString('en-IN')}</td><td>{t.notes || t.description || '—'}</td></tr>)}
  </tbody></table></div>;
}
