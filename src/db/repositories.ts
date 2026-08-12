import { db } from './database';
import type {
  Account,
  AppSettings,
  Category,
  RecurringRule,
  ReviewQueueItem,
  Transaction,
} from '../types/models';

export const transactionRepository = {
  list: () => db.transactions.filter((t) => !t.deletedAt).reverse().sortBy('transactionDateTime'),
  byId: (id: string) => db.transactions.get(id),
  put: (transaction: Transaction) => db.transactions.put(transaction),
  delete: (id: string) => db.transactions.update(id, { deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), syncStatus: 'PENDING' }),
};

export const accountRepository = {
  list: () => db.accounts.filter((a) => a.active).toArray(),
  put: (account: Account) => db.accounts.put(account),
};

export const categoryRepository = {
  list: () => db.categories.filter((c) => c.active).sortBy('sortOrder'),
  put: (category: Category) => db.categories.put(category),
};

export const recurringRepository = {
  list: () => db.recurringRules.filter((r) => r.active).toArray(),
  put: (rule: RecurringRule) => db.recurringRules.put(rule),
  remove: (id: string) => db.recurringRules.update(id, { active: false, updatedAt: new Date().toISOString() }),
};

export const reviewRepository = {
  pending: () => db.reviewQueue.where('status').equals('PENDING').toArray(),
  put: (item: ReviewQueueItem) => db.reviewQueue.put(item),
};

export const settingsRepository = {
  get: () => db.settings.get('app'),
  put: (settings: AppSettings) => db.settings.put(settings),
};
