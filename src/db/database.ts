import Dexie, { type Table } from 'dexie';
import type { Account, AppSettings, Budget, Category, InvestmentEntry, RecurringRule, ReviewQueueItem, SyncQueueItem, Transaction } from '../types/models';

/**
 * IndexedDB database for the app. React never talks to raw IndexedDB directly;
 * services/repositories do that work, which keeps the UI easier to understand.
 */
export class ExpenseDB extends Dexie {
  transactions!: Table<Transaction, string>;
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  recurringRules!: Table<RecurringRule, string>;
  reviewQueue!: Table<ReviewQueueItem, string>;
  budgets!: Table<Budget, string>;
  investments!: Table<InvestmentEntry, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('ExpenseTrackerDB');
    this.version(1).stores({
      transactions: 'id, transactionDateTime, accountId, categoryId, subcategoryId, merchant, updatedAt, syncStatus, source, recurringRuleId, sourceId',
      accounts: 'id, name, isDefault, active, updatedAt',
      categories: 'id, name, parentId, active, sortOrder',
      recurringRules: 'id, nextDueDate, active, updatedAt',
      reviewQueue: 'id, externalId, status, transactionDateTime, merchant',
      budgets: 'id, categoryId, period, startDate',
      investments: 'id, date, assetType, type, accountId, updatedAt, syncStatus',
      syncQueue: 'id, entityType, entityId, status, createdAt',
      settings: 'id',
    });
    this.version(2).stores({
      transactions: 'id, transactionDateTime, accountId, categoryId, subcategoryId, merchant, updatedAt, syncStatus, source, recurringRuleId, sourceId',
      accounts: 'id, name, isDefault, active, updatedAt',
      categories: 'id, name, parentId, active, sortOrder',
      recurringRules: 'id, nextDueDate, active, updatedAt',
      reviewQueue: 'id, externalId, status, transactionDateTime, merchant',
      budgets: 'id, categoryId, period, startDate',
      investments: 'id, date, assetType, type, accountId, updatedAt, syncStatus',
      syncQueue: 'id, entityType, entityId, status, createdAt',
      settings: 'id',
    });
  }
}

export const db = new ExpenseDB();
