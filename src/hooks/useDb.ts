import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

/** Reactive database hook. When IndexedDB changes, components using this hook rerender. */
export function useTransactions() {
  return useLiveQuery(() => db.transactions.filter((t) => !t.deletedAt).toArray(), [], []);
}

export function useAccounts() {
  return useLiveQuery(() => db.accounts.filter((a) => a.active).toArray(), [], []);
}

export function useCategories() {
  return useLiveQuery(() => db.categories.filter((c) => c.active).sortBy('sortOrder'), [], []);
}

export function useReviewQueue() {
  return useLiveQuery(() => db.reviewQueue.where('status').equals('PENDING').toArray(), [], []);
}

export function useRecurringRules() {
  return useLiveQuery(() => db.recurringRules.filter((r) => r.active).toArray(), [], []);
}

export function useSettings() {
  return useLiveQuery(() => db.settings.get('app'), []);
}
