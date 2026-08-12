/**
 * Domain models for the application.
 *
 * Think of these interfaces as the "shape" of data moving through the app.
 * React components render these objects; repositories store them in IndexedDB;
 * services apply business rules to them.
 */

export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';
export type TransactionSource = 'MANUAL' | 'AUTOMATION' | 'RECURRING' | 'IMPORT';
export type SyncStatus = 'LOCAL' | 'PENDING' | 'SYNCED' | 'FAILED';
export type QueueStatus = 'PENDING' | 'RECORDED' | 'DISCARDED';
export type AccountType = 'BANK_ACCOUNT' | 'CREDIT_CARD' | 'CASH' | 'WALLET' | 'INVESTMENT' | 'OTHER';
export type Frequency = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  transactionDateTime: string;
  accountId: string;
  categoryId?: string;
  subcategoryId?: string;
  merchant?: string;
  notes?: string;
  needWant?: 'NEED' | 'WANT';
  essentialDiscretionary?: 'ESSENTIAL' | 'DISCRETIONARY';
  fixedVariable?: 'FIXED' | 'VARIABLE';
  source: TransactionSource;
  recurringRuleId?: string;
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  syncStatus: SyncStatus;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  lastFourDigits?: string;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  icon?: string;
  defaultNeedWant?: 'NEED' | 'WANT';
  defaultEssentialDiscretionary?: 'ESSENTIAL' | 'DISCRETIONARY';
  defaultFixedVariable?: 'FIXED' | 'VARIABLE';
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantHistory {
  value: string;
  lastUsedAt: string;
  frequency: number;
}

export interface RecurringRule {
  id: string;
  name: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  accountId: string;
  categoryId?: string;
  subcategoryId?: string;
  merchant?: string;
  notes?: string;
  frequency: Frequency;
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
  active: boolean;
  lastGeneratedDate?: string;
  nextDueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewQueueItem {
  id: string;
  externalId: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  merchant?: string;
  accountHint?: string;
  transactionDateTime: string;
  rawMessage?: string;
  source: 'IOS_SHORTCUT' | 'MANUAL' | 'IMPORT';
  status: QueueStatus;
  suggestedCategoryId?: string;
  suggestedAccountId?: string;
  notes?: string;
  createdAt: string;
  processedAt?: string;
}

export interface Budget {
  id: string;
  categoryId?: string;
  amount: number;
  period: 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: 'app';
  currency: string;
  defaultAccountId?: string;
  defaultNeedWant?: 'NEED' | 'WANT';
  defaultEssentialDiscretionary?: 'ESSENTIAL' | 'DISCRETIONARY';
  defaultFixedVariable?: 'FIXED' | 'VARIABLE';
  theme: 'dark';
  googleSheetsEndpoint?: string;
  googleSheetsToken?: string;
  lastSuccessfulSync?: string;
  googleSheetsEnabled: boolean;
}

export interface SyncQueueItem {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: unknown;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  retryCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}
