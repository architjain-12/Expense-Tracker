import Dexie, { type Table } from 'dexie';
import type {
  Account,
  AppSettings,
  Budget,
  Category,
  RecurringRule,
  ReviewQueueItem,
  SyncQueueItem,
  Transaction,
} from '../types/models';

/**
 * ExpenseDB is our local database.
 *
 * IMPORTANT FOR A REACT BEGINNER:
 * React does not store the transactions itself. The database does.
 * Components call repositories/services, which call this Dexie database.
 */
export class ExpenseDB extends Dexie {
  transactions!: Table<Transaction, string>;
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  recurringRules!: Table<RecurringRule, string>;
  reviewQueue!: Table<ReviewQueueItem, string>;
  budgets!: Table<Budget, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('ExpenseTrackerDB');

    this.version(1).stores({
      transactions: 'id, transactionDateTime, accountId, categoryId, merchant, updatedAt, syncStatus',
      accounts: 'id, name, isDefault, active, updatedAt',
      categories: 'id, name, parentId, active, sortOrder',
      recurringRules: 'id, nextDueDate, active, updatedAt',
      reviewQueue: 'id, externalId, status, transactionDateTime, merchant',
      budgets: 'id, categoryId, period, startDate',
      syncQueue: 'id, entityType, entityId, status, createdAt',
      settings: 'id',
    });
  }
}

export const db = new ExpenseDB();
