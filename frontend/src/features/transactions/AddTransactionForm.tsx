import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAccounts, useCategories } from '../categories/useCategories';
import type { TransactionType } from '../../types/finance';

const schema = z.object({
  date: z.string().min(1, 'Required'),
  transactionType: z.enum(['EXPENSE', 'INCOME', 'INVESTMENT']),
  amount: z.coerce.number().positive('Enter an amount greater than 0'),
  categoryId: z.string().min(1, 'Pick a category'),
  subcategoryId: z.string().optional(),
  accountId: z.string().min(1, 'Pick an account'),
  merchantName: z.string().optional(),
  description: z.string().optional(),
  needWant: z.enum(['NEED', 'WANT']).optional(),
});

type FormValues = z.infer<typeof schema>;

const today = () => new Date().toISOString().slice(0, 10);

export function AddTransactionForm() {
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const queryClient = useQueryClient();
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: today(),
      transactionType: 'EXPENSE' as TransactionType,
      accountId: accounts[0]?.accountId ?? '',
    },
  });

  const selectedCategoryId = watch('categoryId');
  const subcategories = useMemo(
    () => categories.find((c) => c.categoryId === selectedCategoryId)?.subcategories ?? [],
    [categories, selectedCategoryId]
  );

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.addTransaction({ ...values, currency: 'INR', source: 'WEB' }),
    onSuccess: (_, values) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      setJustSaved(`Saved ₹${values.amount.toLocaleString('en-IN')}`);
      reset({ date: today(), transactionType: 'EXPENSE', accountId: values.accountId });
      setTimeout(() => setJustSaved(null), 2500);
    },
  });

  const onSubmit = (values: FormValues) => mutation.mutate(values);
  const type = watch('transactionType');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-24">
      <div className="grid grid-cols-3 gap-2">
        {(['EXPENSE', 'INCOME', 'INVESTMENT'] as const).map((t) => (
          <label
            key={t}
            className={`flex cursor-pointer items-center justify-center rounded-xl border py-3 text-sm font-medium transition ${
              type === t
                ? t === 'EXPENSE'
                  ? 'border-expense bg-expense/10 text-expense'
                  : t === 'INCOME'
                  ? 'border-income bg-income/10 text-income'
                  : 'border-invest bg-invest/10 text-invest'
                : 'border-slate-200 text-slate-500'
            }`}
          >
            <input type="radio" value={t} className="sr-only" {...register('transactionType')} />
            {t === 'EXPENSE' ? 'Expense' : t === 'INCOME' ? 'Income' : 'Investment'}
          </label>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-500">Amount (₹)</label>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="0.00"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-2xl font-display tabular"
          {...register('amount')}
          autoFocus
        />
        {errors.amount && <p className="mt-1 text-sm text-expense">{errors.amount.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm text-slate-500">Date</label>
          <input type="date" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" {...register('date')} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-500">Account</label>
          <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5" {...register('accountId')}>
            {accounts.map((a) => (
              <option key={a.accountId} value={a.accountId}>
                {a.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-500">Category</label>
        <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5" {...register('categoryId')}>
          <option value="">Select a category</option>
          {categories.map((c) => (
            <option key={c.categoryId} value={c.categoryId}>
              {c.displayName}
            </option>
          ))}
        </select>
        {errors.categoryId && <p className="mt-1 text-sm text-expense">{errors.categoryId.message}</p>}
      </div>

      {subcategories.length > 0 && (
        <div>
          <label className="mb-1 block text-sm text-slate-500">Subcategory</label>
          <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5" {...register('subcategoryId')}>
            <option value="">Select a subcategory</option>
            {subcategories.map((s) => (
              <option key={s.subcategoryId} value={s.subcategoryId}>
                {s.displayName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm text-slate-500">Merchant / note (optional)</label>
        <input
          type="text"
          placeholder="e.g. Starbucks"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
          {...register('merchantName')}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || mutation.isPending}
        className="fixed inset-x-4 bottom-6 rounded-xl bg-ink py-4 text-center font-medium text-paper shadow-lg disabled:opacity-60 sm:static sm:inset-auto"
      >
        {mutation.isPending ? 'Saving…' : 'Save transaction'}
      </button>

      {justSaved && (
        <p className="fixed inset-x-4 bottom-24 rounded-lg bg-income/10 py-2 text-center text-sm text-income sm:static">
          {justSaved}
        </p>
      )}
      {mutation.isError && (
        <p className="text-sm text-expense">{(mutation.error as Error).message}</p>
      )}
    </form>
  );
}
