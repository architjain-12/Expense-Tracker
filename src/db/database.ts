import Dexie, { type Table } from 'dexie';
import type { Account, AppSettings, Budget, Category, InvestmentEntry, RecurringRule, ReviewQueueItem, SyncQueueItem, Transaction, InterestDeposit } from '../types/models';

/**
 * Each browser/device gets its own IndexedDB storage. v2.3 adds logical
 * personal/demo partitions by using separate Dexie database namespaces.
 * This is intentionally NOT cross-browser sync; Google Sheets remains the
 * cross-browser/device bridge until a remote DB is introduced.
 */
export type DataPartition = 'personal' | 'demo';
const PARTITION_KEY = 'expense-tracker-active-partition';

export function getActivePartition(): DataPartition {
  try { return localStorage.getItem(PARTITION_KEY) === 'demo' ? 'demo' : 'personal'; } catch { return 'personal'; }
}

export function switchPartition(partition: DataPartition): void {
  localStorage.setItem(PARTITION_KEY, partition);
  window.location.reload();
}

export class ExpenseDB extends Dexie {
  transactions!: Table<Transaction, string>;
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  recurringRules!: Table<RecurringRule, string>;
  reviewQueue!: Table<ReviewQueueItem, string>;
  budgets!: Table<Budget, string>;
  investments!: Table<InvestmentEntry, string>;
  interestDeposits!: Table<InterestDeposit, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  settings!: Table<AppSettings, string>;

  constructor(name = `ExpenseTrackerDB-${getActivePartition()}`) {
    super(name);
    this.version(1).stores({
      transactions: 'id, transactionDateTime, accountId, categoryId, subcategoryId, merchant, updatedAt, syncStatus, source, recurringRuleId, sourceId',
      accounts: 'id, name, isDefault, active, updatedAt',
      categories: 'id, name, parentId, active, sortOrder',
      recurringRules: 'id, nextDueDate, active, updatedAt',
      reviewQueue: 'id, externalId, status, transactionDateTime, merchant',
      budgets: 'id, categoryId, period, startDate',
      investments: 'id, date, assetType, type, accountId, updatedAt, syncStatus',
      interestDeposits: 'id, type, maturityDate, active, updatedAt',
      syncQueue: 'id, entityType, entityId, status, createdAt',
      settings: 'id',
    });
    this.version(3).stores({
      transactions: 'id, transactionDateTime, accountId, categoryId, subcategoryId, merchant, updatedAt, syncStatus, source, recurringRuleId, sourceId',
      accounts: 'id, name, isDefault, active, updatedAt', categories: 'id, name, parentId, active, sortOrder',
      recurringRules: 'id, nextDueDate, active, updatedAt', reviewQueue: 'id, externalId, status, transactionDateTime, merchant',
      budgets: 'id, categoryId, period, startDate', investments: 'id, date, assetType, type, accountId, updatedAt, syncStatus',
      interestDeposits: 'id, type, maturityDate, active, updatedAt', syncQueue: 'id, entityType, entityId, status, createdAt', settings: 'id',
    });

    this.version(4).stores({
      transactions: 'id, transactionDateTime, accountId, categoryId, subcategoryId, merchant, updatedAt, syncStatus, source, recurringRuleId, sourceId',
      accounts: 'id, name, isDefault, active, updatedAt', categories: 'id, name, parentId, active, sortOrder',
      recurringRules: 'id, nextDueDate, active, updatedAt', reviewQueue: 'id, externalId, status, transactionDateTime, merchant',
      budgets: 'id, categoryId, period, startDate', investments: 'id, date, assetType, type, accountId, updatedAt, syncStatus',
      interestDeposits: 'id, type, maturityDate, active, updatedAt', syncQueue: 'id, entityType, entityId, status, createdAt', settings: 'id',
    });
  }
}

let activeDb = new ExpenseDB();
export const db = new Proxy(activeDb, {
  get(_target, property) {
    const value = (activeDb as unknown as Record<PropertyKey, unknown>)[property];
    return typeof value === 'function' ? value.bind(activeDb) : value;
  },
}) as ExpenseDB;
