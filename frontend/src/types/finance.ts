export type TransactionType = 'EXPENSE' | 'INCOME' | 'INVESTMENT';

export interface Subcategory {
  subcategoryId: string;
  categoryId: string;
  displayName: string;
  active: boolean;
  sortOrder: number;
}

export interface Category {
  categoryId: string;
  displayName: string;
  nature: TransactionType | 'TRANSFER' | 'DEBT';
  active: boolean;
  sortOrder: number;
  subcategories: Subcategory[];
}

export interface Account {
  accountId: string;
  displayName: string;
  type: string;
  active: boolean;
}

export interface Transaction {
  transactionId: string;
  date: string; // YYYY-MM-DD
  transactionType: TransactionType;
  categoryId: string;
  subcategoryId?: string;
  amount: number;
  currency: string;
  accountId: string;
  merchantName?: string;
  description?: string;
  needWant?: 'NEED' | 'WANT';
  essentialDiscretionary?: 'ESSENTIAL' | 'DISCRETIONARY';
  fixedVariable?: 'FIXED' | 'VARIABLE';
  tags?: string;
  notes?: string;
  source: 'WEB' | 'IOS_SHORTCUT' | 'IMPORT' | 'AI';
  active?: boolean;
  createdAt?: string;
}

export interface NewTransactionInput {
  date: string;
  transactionType: TransactionType;
  categoryId: string;
  subcategoryId?: string;
  amount: number;
  currency: string;
  accountId: string;
  merchantName?: string;
  description?: string;
  needWant?: 'NEED' | 'WANT';
  source: 'WEB' | 'IOS_SHORTCUT';
}

export interface MonthlySummary {
  month: string;
  totalIncome: number;
  totalExpense: number;
  totalInvestment: number;
  savings: number;
  transactionCount: number;
  categoryBreakdown: { category: string; amount: number }[];
}
