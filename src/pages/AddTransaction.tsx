import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, Clock3, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccounts, useCategories, useSettings, useTransactions } from '../hooks/useDb';
import { createTransaction } from '../services/transactionService';
import { fromDatetimeLocal, formatCurrency, toDatetimeLocal } from '../utils/format';
import { db } from '../db/database';

export default function AddTransaction() {
  const navigate = useNavigate();
  const accounts = useAccounts();
  const categories = useCategories();
  const settings = useSettings();
  const transactions = useTransactions();
  const defaultAccountId = settings?.defaultAccountId || accounts[0]?.id || '';
  const [type, setType] = useState<'EXPENSE'|'INCOME'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [categoryId, setCategoryId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [transactionDateTime, setTransactionDateTime] = useState(toDatetimeLocal(new Date().toISOString()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const frequentCategories = useMemo(() => {
    const frequency = new Map<string, number>();
    transactions.forEach(t => t.categoryId && frequency.set(t.categoryId, (frequency.get(t.categoryId) || 0) + 1));
    return [...categories].sort((a, b) => (frequency.get(b.id) || 0) - (frequency.get(a.id) || 0));
  }, [categories, transactions]);

  const merchantSuggestions = useMemo(() => {
    const query = merchant.trim().toLowerCase();
    const values = [...new Set(transactions.map(t => t.merchant).filter(Boolean) as string[])];
    return values.filter(v => !query || v.toLowerCase().includes(query)).slice(0, 5);
  }, [merchant, transactions]);

  const noteSuggestions = useMemo(() => {
    const query = notes.trim().toLowerCase();
    const values = [...new Set(transactions.map(t => t.notes).filter(Boolean) as string[])];
    return values.filter(v => !query || v.toLowerCase().includes(query)).slice(0, 5);
  }, [notes, transactions]);

  async function save() {
    setError('');
    const value = Number(amount);
    if (!value || value <= 0) { setError('Enter an amount greater than zero.'); return; }
    if (!accountId) { setError('Select an account first.'); return; }

    setSaving(true);
    try {
      const selectedCategory = categories.find(c => c.id === categoryId);
      await createTransaction({
        type,
        amount: value,
        transactionDateTime: fromDatetimeLocal(transactionDateTime),
        accountId,
        categoryId: categoryId || undefined,
        merchant,
        notes,
        needWant: selectedCategory?.defaultNeedWant ?? settings?.defaultNeedWant,
        essentialDiscretionary: selectedCategory?.defaultEssentialDiscretionary ?? settings?.defaultEssentialDiscretionary,
        fixedVariable: selectedCategory?.defaultFixedVariable ?? settings?.defaultFixedVariable,
      });
      navigate('/transactions');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save transaction.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="form-page">
    <div className="form-top"><button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft /></button><div><span className="eyebrow">Quick entry</span><h1>New Transaction</h1></div></div>

    <div className="type-toggle"><button className={type === 'EXPENSE' ? 'active' : ''} onClick={() => setType('EXPENSE')}>Expense</button><button className={type === 'INCOME' ? 'active income' : ''} onClick={() => setType('INCOME')}>Income</button></div>

    <div className="amount-input-wrap"><span>₹</span><input autoFocus inputMode="decimal" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} aria-label="Amount" /></div>

    <div className="form-grid">
      <label>Account<select value={accountId} onChange={e => setAccountId(e.target.value)}><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}{a.isDefault ? ' · Default' : ''}</option>)}</select></label>
      <label>Category<div className="select-wrap"><select value={categoryId} onChange={e => setCategoryId(e.target.value)}><option value="">Select category</option>{frequentCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><ChevronDown size={16} /></div></label>
      <label>Merchant<input value={merchant} onChange={e => setMerchant(e.target.value)} placeholder="Optional" autoComplete="off" />{merchantSuggestions.length > 0 && merchant && <div className="suggestions">{merchantSuggestions.map(v => <button type="button" key={v} onClick={() => setMerchant(v)}>{v}</button>)}</div>}</label>
      <label>Notes<input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" autoComplete="off" />{noteSuggestions.length > 0 && notes && <div className="suggestions">{noteSuggestions.map(v => <button type="button" key={v} onClick={() => setNotes(v)}>{v}</button>)}</div>}</label>
      <label className="wide">Date & time<div className="input-icon"><Clock3 size={17}/><input type="datetime-local" value={transactionDateTime} onChange={e => setTransactionDateTime(e.target.value)} /></div></label>
    </div>

    {error && <div className="form-error">{error}</div>}
    <button className="primary-btn record-btn" disabled={saving} onClick={save}><Save size={18} /> {saving ? 'Saving…' : `Record ${amount ? formatCurrency(Number(amount)) : 'Transaction'}`}</button>

    <p className="form-help">The transaction is saved to your phone first. Cloud synchronization is separate, so you can keep recording even when offline.</p>
  </div>;
}
