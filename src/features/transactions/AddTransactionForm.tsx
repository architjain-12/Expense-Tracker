// -----------------------------------------------------------------------------
// ADD TRANSACTION
// -----------------------------------------------------------------------------
// This form is intentionally compact for mobile. The save button is no longer
// pushed far down the page: it stays immediately after the required fields.

import { useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAccounts, useCategories } from '../categories/useCategories';

const schema = z.object({
  date: z.string().min(1), transactionType: z.enum(['EXPENSE', 'INCOME', 'INVESTMENT']),
  amount: z.coerce.number().positive('Enter an amount greater than 0'), categoryId: z.string().min(1, 'Select a category'),
  subcategoryId: z.string().optional(), accountId: z.string().min(1, 'Select an account'), merchantName: z.string().optional(),
  description: z.string().optional(), needWant: z.enum(['NEED', 'WANT']).optional(),
  essentialDiscretionary: z.enum(['ESSENTIAL', 'DISCRETIONARY']).optional(), fixedVariable: z.enum(['FIXED', 'VARIABLE']).optional(), notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;
const today = () => new Date().toISOString().slice(0, 10);

export function AddTransactionForm() {
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: today(), transactionType: 'EXPENSE', accountId: '' },
  });
  const categoryId = watch('categoryId');
  const subcategories = useMemo(() => categories.find(c => c.categoryId === categoryId)?.subcategories ?? [], [categories, categoryId]);
  const mutation = useMutation({
    mutationFn: (values: FormValues) => api.addTransaction({ ...values, currency: 'INR', source: 'WEB' }),
    onSuccess: (_, values) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      setMessage(`Saved ₹${values.amount.toLocaleString('en-IN')}`);
      reset({ date: today(), transactionType: 'EXPENSE', accountId: values.accountId });
      setTimeout(() => setMessage(''), 2500);
    },
  });

  return <form onSubmit={handleSubmit(values => mutation.mutate(values))} className="space-y-3">
    <div className="grid grid-cols-3 gap-2">
      {(['EXPENSE', 'INCOME', 'INVESTMENT'] as const).map(type => <label key={type} className="choice">
        <input type="radio" value={type} className="sr-only" {...register('transactionType')} />
        {type === 'EXPENSE' ? 'Expense' : type === 'INCOME' ? 'Income' : 'Investment'}
      </label>)}
    </div>

    <div className="card compact-grid">
      <Field label="Amount (₹)" error={errors.amount?.message}><input autoFocus inputMode="decimal" type="number" step="0.01" placeholder="0" {...register('amount')} className="amount-input" /></Field>
      <Field label="Date"><input type="date" {...register('date')} className="input" /></Field>
      <Field label="Account" error={errors.accountId?.message}><select {...register('accountId')} className="input"><option value="">Select</option>{accounts.map(a => <option key={a.accountId} value={a.accountId}>{a.displayName}</option>)}</select></Field>
      <Field label="Category" error={errors.categoryId?.message}><select {...register('categoryId')} className="input"><option value="">Select</option>{categories.map(c => <option key={c.categoryId} value={c.categoryId}>{c.displayName}</option>)}</select></Field>
      {subcategories.length > 0 && <Field label="Subcategory"><select {...register('subcategoryId')} className="input"><option value="">Select</option>{subcategories.map(s => <option key={s.subcategoryId} value={s.subcategoryId}>{s.displayName}</option>)}</select></Field>}
      <Field label="Merchant"><input placeholder="e.g. Amazon" {...register('merchantName')} className="input" /></Field>
      <Field label="Need / Want"><select {...register('needWant')} className="input"><option value="">Select</option><option>NEED</option><option>WANT</option></select></Field>
      <Field label="Essential / Discretionary"><select {...register('essentialDiscretionary')} className="input"><option value="">Select</option><option>ESSENTIAL</option><option>DISCRETIONARY</option></select></Field>
      <Field label="Fixed / Variable"><select {...register('fixedVariable')} className="input"><option value="">Select</option><option>FIXED</option><option>VARIABLE</option></select></Field>
      <Field label="Description"><input {...register('description')} className="input" /></Field>
      <Field label="Notes"><input {...register('notes')} className="input" /></Field>
    </div>

    <button disabled={mutation.isPending} className="primary-button">{mutation.isPending ? 'Saving…' : 'Save transaction'}</button>
    {message && <p className="success">{message}</p>}
    {mutation.isError && <p className="error">{(mutation.error as Error).message}</p>}
  </form>;
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{error && <small className="error">{error}</small>}</label>;
}
