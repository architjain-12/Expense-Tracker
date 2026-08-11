// -----------------------------------------------------------------------------
// FINANCE TYPES
// -----------------------------------------------------------------------------
// This file is the frontend's data dictionary. If you add a column to a Sheet,
// add its TypeScript property here so the editor can understand that column.

export type TransactionType = 'EXPENSE' | 'INCOME' | 'INVESTMENT';
export type Nature = 'EXPENSE' | 'INCOME' | 'INVESTMENT' | 'TRANSFER' | 'DEBT';

export interface Subcategory { subcategoryId: string; categoryId: string; displayName: string; active: boolean; sortOrder: number; }
export interface Category { categoryId: string; displayName: string; nature: Nature; active: boolean; sortOrder: number; subcategories: Subcategory[]; }
export interface Account { accountId: string; displayName: string; type: string; openingBalance: number; currency: string; active: boolean; }
export interface Transaction { transactionId: string; date: string; transactionType: TransactionType; categoryId: string; subcategoryId?: string; amount: number; currency: string; accountId: string; merchantName?: string; description?: string; needWant?: 'NEED' | 'WANT'; essentialDiscretionary?: 'ESSENTIAL' | 'DISCRETIONARY'; fixedVariable?: 'FIXED' | 'VARIABLE'; tags?: string; notes?: string; source?: string; active?: boolean; createdAt?: string; }
export interface MonthlySummary { month: string; totalIncome: number; totalExpense: number; totalInvestment: number; savings: number; savingsRate: number; transactionCount: number; categoryBreakdown: { category: string; amount: number }[]; accountBreakdown: { account: string; amount: number }[]; budgetBreakdown: { categoryId: string; category: string; budget: number; actual: number; remaining: number }[]; topTransactions: Transaction[]; }
export interface YearlyReport { year: string; months: MonthlySummary[]; totals: { income: number; expense: number; investment: number; savings: number; transactions: number }; }
export interface NewTransactionInput extends Omit<Transaction, 'transactionId' | 'active' | 'createdAt'> { source: 'WEB' | 'IOS_SHORTCUT'; }
export interface Budget { budgetId?: string; month: string; categoryId: string; amount: number; notes?: string; active?: boolean; }
export interface Recurring { recurringId?: string; displayName: string; amount: number; frequency: string; nextDueDate: string; categoryId: string; subcategoryId?: string; accountId: string; merchantId?: string; active?: boolean; notes?: string; }
export interface Subscription { subscriptionId?: string; displayName: string; amount: number; billingCycle: string; nextBillingDate: string; categoryId: string; accountId: string; merchantId?: string; active?: boolean; notes?: string; }
export interface Goal { goalId?: string; name: string; targetAmount: number; currentAmount: number; targetDate?: string; priority?: string; active?: boolean; notes?: string; }
export interface Investment { investmentId?: string; date: string; investmentType: string; name: string; symbol?: string; quantity?: number; buyPrice?: number; fees?: number; currentValue: number; accountId: string; notes?: string; active?: boolean; }
export interface Asset { assetId?: string; name: string; assetType: string; value: number; valuationDate: string; accountId?: string; notes?: string; active?: boolean; }
export interface Liability { liabilityId?: string; name: string; liabilityType: string; outstanding: number; interestRate?: number; valuationDate: string; accountId?: string; notes?: string; active?: boolean; }
export interface Merchant { merchantId?: string; displayName: string; defaultCategoryId?: string; defaultSubcategoryId?: string; active?: boolean; notes?: string; }
export interface NetWorth { assets: number; liabilities: number; investments: number; accounts: number; netWorth: number; assetItems: Asset[]; liabilityItems: Liability[]; investmentItems: Investment[]; }
export type Settings = Record<string, string>;
