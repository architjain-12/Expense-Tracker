import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { useAccounts, useCategories } from '../hooks/useDb';
import { fromDatetimeLocal, toDatetimeLocal } from '../utils/format';
import { updateTransaction } from '../services/transactionService';

export default function EditTransaction(){const {id}=useParams();const navigate=useNavigate();const transaction=useLiveQuery(()=>id?db.transactions.get(id):undefined,[id]);const accounts=useAccounts();const categories=useCategories();const [amount,setAmount]=useState('');const [merchant,setMerchant]=useState('');const [notes,setNotes]=useState('');const [categoryId,setCategoryId]=useState('');const [subcategoryId,setSubcategoryId]=useState('');const [accountId,setAccountId]=useState('');const [dateTime,setDateTime]=useState(toDatetimeLocal(new Date().toISOString()));
 useEffect(()=>{if(!transaction)return;setAmount(String(transaction.amount));setMerchant(transaction.merchant||'');setNotes(transaction.notes||'');setCategoryId(transaction.categoryId||'');setSubcategoryId(transaction.subcategoryId||'');setAccountId(transaction.accountId);setDateTime(toDatetimeLocal(transaction.transactionDateTime));},[transaction]);
 const subs=useMemo(()=>categories.filter(c=>c.parentId===categoryId),[categories,categoryId]);
 if (!transaction) {
    return (
      <div className="empty-state">
        <h3>Transaction not found</h3>
      </div>
    );
  }
  
  const currentTransaction = transaction;
  
  async function save() {
    await updateTransaction({
      ...currentTransaction,
      amount: Number(amount),
      merchant,
      notes,
      categoryId: categoryId || undefined,
      subcategoryId: subcategoryId || undefined,
      accountId,
      transactionDateTime: fromDatetimeLocal(dateTime)
    });
  
    navigate(`/transactions/${currentTransaction.id}`);
  }
  return <div className="form-page"><div className="form-top"><button className="icon-btn" onClick={()=>navigate(-1)}><ArrowLeft/></button><div><span className="eyebrow">Edit</span><h1>Transaction</h1></div></div><div className="amount-input-wrap"><span>₹</span><input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} aria-label="Amount" /></div><div className="form-grid"><label>Account<select value={accountId} onChange={e=>setAccountId(e.target.value)}>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Category<select value={categoryId} onChange={e=>{setCategoryId(e.target.value);setSubcategoryId('')}}><option value="">Uncategorized</option>{categories.filter(c=>!c.parentId).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{categoryId&&<label>Subcategory<select value={subcategoryId} onChange={e=>setSubcategoryId(e.target.value)}><option value="">Optional</option>{subs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}<label>Merchant<input value={merchant} onChange={e=>setMerchant(e.target.value)}/></label><label className="wide">Notes<input value={notes} onChange={e=>setNotes(e.target.value)}/></label><label className="wide">Date & time<input type="datetime-local" value={dateTime} onChange={e=>setDateTime(e.target.value)}/></label></div><button className="primary-btn record-btn" onClick={save}><Save size={18}/> Save changes</button></div>;
}
