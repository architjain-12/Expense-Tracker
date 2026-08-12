import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, Clock3, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccounts, useCategories, useSettings, useTransactions } from '../hooks/useDb';
import { createTransaction } from '../services/transactionService';
import { fromDatetimeLocal, formatCurrency, toDatetimeLocal } from '../utils/format';

export default function AddTransaction() {
  const navigate = useNavigate();
  const accounts = useAccounts(); const categories = useCategories(); const settings = useSettings(); const transactions = useTransactions();
  const [type, setType] = useState<'EXPENSE'|'INCOME'>('EXPENSE');
  const [amount, setAmount] = useState(''); const [accountId, setAccountId] = useState(''); const [categoryId, setCategoryId] = useState(''); const [subcategoryId, setSubcategoryId] = useState('');
  const [merchant, setMerchant] = useState(''); const [notes, setNotes] = useState(''); const [transactionDateTime, setTransactionDateTime] = useState(toDatetimeLocal(new Date().toISOString()));
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');

  useEffect(() => {
    if (!accountId) setAccountId(settings?.defaultAccountId || accounts.find(a => a.isDefault)?.id || accounts[0]?.id || '');
  }, [settings?.defaultAccountId, accounts, accountId]);

  const rootCategories = useMemo(() => {
    const frequency = new Map<string, number>(); transactions.forEach(t => t.categoryId && frequency.set(t.categoryId, (frequency.get(t.categoryId) || 0) + 1));
    return categories.filter(c=>!c.parentId).slice().sort((a,b)=>(frequency.get(b.id)||0)-(frequency.get(a.id)||0));
  }, [categories, transactions]);
  const subcategories = useMemo(() => categories.filter(c=>c.parentId===categoryId), [categories,categoryId]);
  const merchantSuggestions = useMemo(() => { const q=merchant.trim().toLowerCase(); const counts=new Map<string,number>(); transactions.forEach(t=>t.merchant&&counts.set(t.merchant,(counts.get(t.merchant)||0)+1)); return [...counts.keys()].filter(v=>!q||v.toLowerCase().includes(q)).sort((a,b)=>(counts.get(b)||0)-(counts.get(a)||0)).slice(0,5); },[merchant,transactions]);
  const noteSuggestions = useMemo(() => { const q=notes.trim().toLowerCase(); const counts=new Map<string,number>(); transactions.forEach(t=>t.notes&&counts.set(t.notes,(counts.get(t.notes)||0)+1)); return [...counts.keys()].filter(v=>!q||v.toLowerCase().includes(q)).sort((a,b)=>(counts.get(b)||0)-(counts.get(a)||0)).slice(0,5); },[notes,transactions]);

  useEffect(() => { setSubcategoryId(''); }, [categoryId]);

  async function save(){
    setError(''); const value=Number(amount); if(!value||value<=0){setError('Enter an amount greater than zero.');return;} if(!accountId){setError('Select an account first.');return;}
    setSaving(true); try { const cat=categories.find(c=>c.id===categoryId); const sub=categories.find(c=>c.id===subcategoryId); await createTransaction({type,amount:value,transactionDateTime:fromDatetimeLocal(transactionDateTime),accountId,categoryId:cat?.parentId||cat?.id,subcategoryId:sub?.id||undefined,merchant,notes,needWant:sub?.defaultNeedWant??cat?.defaultNeedWant??settings?.defaultNeedWant,essentialDiscretionary:sub?.defaultEssentialDiscretionary??cat?.defaultEssentialDiscretionary??settings?.defaultEssentialDiscretionary,fixedVariable:sub?.defaultFixedVariable??cat?.defaultFixedVariable??settings?.defaultFixedVariable}); navigate('/transactions'); } catch(e){setError(e instanceof Error?e.message:'Could not save transaction.');} finally{setSaving(false);} }

  return <div className="form-page">
    <div className="form-top"><button className="icon-btn" onClick={()=>navigate(-1)}><ArrowLeft/></button><div><span className="eyebrow">Quick entry</span><h1>New Transaction</h1></div></div>
    <div className="type-toggle"><button className={type==='EXPENSE'?'active':''} onClick={()=>setType('EXPENSE')}>Expense</button><button className={type==='INCOME'?'active income':''} onClick={()=>setType('INCOME')}>Income</button></div>
    <div className="amount-input-wrap"><span>₹</span><input autoFocus inputMode="decimal" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)} aria-label="Amount"/></div>
    <div className="form-grid">
      <label>Account<select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Select account</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}{a.isDefault?' · Default':''}</option>)}</select></label>
      <label>Category<div className="select-wrap"><select value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">Optional</option>{rootCategories.map(c=><option key={c.id} value={c.id}>{c.icon?`${c.icon} `:''}{c.name}</option>)}</select><ChevronDown size={16}/></div></label>
      {categoryId && <label>Subcategory<div className="select-wrap"><select value={subcategoryId} onChange={e=>setSubcategoryId(e.target.value)}><option value="">Optional</option>{subcategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><ChevronDown size={16}/></div></label>}
      <label className={!categoryId?'wide':''}>Merchant<input value={merchant} onChange={e=>setMerchant(e.target.value)} placeholder="Optional" autoComplete="off"/>{merchantSuggestions.length>0&&merchant&&<div className="suggestions">{merchantSuggestions.map(v=><button type="button" key={v} onClick={()=>setMerchant(v)}>{v}</button>)}</div>}</label>
      <label className="wide">Notes<input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional" autoComplete="off"/>{noteSuggestions.length>0&&notes&&<div className="suggestions">{noteSuggestions.map(v=><button type="button" key={v} onClick={()=>setNotes(v)}>{v}</button>)}</div>}</label>
      <label className="wide">Date & time<div className="input-icon"><Clock3 size={17}/><input type="datetime-local" value={transactionDateTime} onChange={e=>setTransactionDateTime(e.target.value)}/></div></label>
    </div>
    {error&&<div className="form-error">{error}</div>}
    <button className="primary-btn record-btn" disabled={saving} onClick={save}><Save size={18}/>{saving?'Saving…':`Record ${amount?formatCurrency(Number(amount)):'Transaction'}`}</button>
    <p className="form-help">The transaction is saved locally first. Needs/wants, essential/discretionary and fixed/variable classifications are populated from defaults and can be refined later.</p>
  </div>;
}
