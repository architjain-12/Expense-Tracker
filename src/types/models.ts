/** Domain models used by the React UI, services and IndexedDB. */
export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';
export type TransactionSource = 'MANUAL' | 'AUTOMATION' | 'RECURRING' | 'IMPORT';
export type SyncStatus = 'LOCAL' | 'PENDING' | 'SYNCED' | 'FAILED';
export type QueueStatus = 'PENDING' | 'RECORDED' | 'DISCARDED';
export type AccountType = 'BANK_ACCOUNT' | 'CREDIT_CARD' | 'CASH' | 'WALLET' | 'INVESTMENT' | 'OTHER';
export type Frequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

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
  statementDay?: number;
  paymentDueDay?: number;
  createdAt: string;
  updatedAt: string;
}

/** Categories are hierarchical: parentId undefined = category, parentId set = subcategory. */
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
  /** 0 = Sunday ... 6 = Saturday; used by weekly/bi-weekly rules. */
  dayOfWeek?: number;
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
  source: 'IOS_SHORTCUT' | 'MANUAL' | 'IMPORT' | 'RECURRING';
  status: QueueStatus;
  suggestedCategoryId?: string;
  suggestedSubcategoryId?: string;
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

export interface InvestmentEntry {
  id: string;
  date: string;
  name: string;
  assetType: 'STOCK' | 'MUTUAL_FUND' | 'SIP' | 'FIXED_DEPOSIT' | 'GOLD' | 'RETIREMENT_PF' | 'OTHER';
  type: 'CONTRIBUTION' | 'REDEMPTION' | 'DIVIDEND' | 'INTEREST';
  amount: number;
  accountId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface AppSettings {
  id: 'app';
  currency: string;
  defaultAccountId?: string;
  defaultNeedWant?: 'NEED' | 'WANT';
  defaultEssentialDiscretionary?: 'ESSENTIAL' | 'DISCRETIONARY';
  defaultFixedVariable?: 'FIXED' | 'VARIABLE';
  theme: 'dark' | 'light' | 'system';
  reportingYear: 'FY' | 'CALENDAR';
  demoPinHash?: string;
  googleSheetsEndpoint?: string;
  googleSheetsToken?: string;
  lastSuccessfulSync?: string;
  googleSheetsEnabled: boolean;
  lockEnabled?: boolean;
  lockMethod?: 'PASSKEY' | 'PIN';
  passkeyCredentialId?: string;
  localPinHash?: string;
  autoBackupEnabled?: boolean;
  autoBackupIntervalHours?: number;
  lastAutoBackupGeneratedAt?: string
  autoBackupStartTime?: string; // HH:mm
  lastAutoBackupSavedAt?: string;
  nextAutoBackupAt?: string;
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

export interface InterestDeposit {
  id: string;
  name: string;
  type: 'FD' | 'RD' | 'SAVINGS';
  principal: number;
  installment?: number;
  annualRate: number;
  openingDate: string;
  maturityDate?: string;
  termMonths?: number;
  compounding: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'SIMPLE';
  accountId?: string;
  autoRecordInterest: boolean;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PendingBackup {
  id: 'auto';
  filename: string;
  content: string;
  createdAt: string;
}
