import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

export function useTransactions() { return useLiveQuery(() => db.transactions.filter(t => !t.deletedAt).toArray(), [], []); }
export function useAccounts() { return useLiveQuery(() => db.accounts.filter(a => a.active).toArray(), [], []); }
export function useCategories() { return useLiveQuery(() => db.categories.filter(c => c.active).sortBy('sortOrder'), [], []); }
export function useReviewQueue() { return useLiveQuery(() => db.reviewQueue.where('status').equals('PENDING').toArray(), [], []); }
export function useRecurringRules() { return useLiveQuery(() => db.recurringRules.toArray(), [], []); }
export function useBudgets() { return useLiveQuery(() => db.budgets.toArray(), [], []); }
export function useInvestments() { return useLiveQuery(() => db.investments.orderBy('date').reverse().toArray(), [], []); }
export function useSettings() { return useLiveQuery(() => db.settings.get('app'), []); }
