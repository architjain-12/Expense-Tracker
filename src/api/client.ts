// -----------------------------------------------------------------------------
// API CLIENT
// -----------------------------------------------------------------------------
// This file is the only place where the React application talks to Apps Script.
// If your backend URL changes, update .env rather than changing components.

import type { Account, Asset, Budget, Category, Goal, Investment, Liability, Merchant, MonthlySummary, NetWorth, NewTransactionInput, Recurring, Settings, Subscription, Transaction, YearlyReport } from '../types/finance';

// Vite replaces these values when the application is built by GitHub Actions.
const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const TOKEN = import.meta.env.VITE_API_TOKEN as string;

// A clear console message makes configuration mistakes easier for beginners to diagnose.
if (!BASE_URL || !TOKEN) console.error('Missing VITE_API_BASE_URL or VITE_API_TOKEN.');

// Generic GET helper used by every read operation.
async function get<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(BASE_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('token', TOKEN);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url.toString());
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data as T;
}

// Generic POST helper used by every create/update operation.
async function post<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: TOKEN, ...payload }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data as T;
}

// All frontend API functions are exported from one object so components stay simple.
export const api = {
  getCategories: () => get<Category[]>('categories'),
  getAccounts: () => get<Account[]>('accounts'),
  getTransactions: (p: Record<string, string> = {}) => get<Transaction[]>('transactions', p),
  getMonthlySummary: (month: string) => get<MonthlySummary>('monthlySummary', { month }),
  getYearlyReport: (year: string) => get<YearlyReport>('yearlyReport', { year }),
  getBudgets: () => get<Budget[]>('budgets'),
  getRecurring: () => get<Recurring[]>('recurring'),
  getSubscriptions: () => get<Subscription[]>('subscriptions'),
  getGoals: () => get<Goal[]>('goals'),
  getInvestments: () => get<Investment[]>('investments'),
  getAssets: () => get<Asset[]>('assets'),
  getLiabilities: () => get<Liability[]>('liabilities'),
  getMerchants: () => get<Merchant[]>('merchants'),
  getSettings: () => get<Settings>('settings'),
  getNetWorth: () => get<NetWorth>('netWorth'),
  getDiagnostics: () => get<unknown>('diagnostics'),
  addTransaction: (transaction: NewTransactionInput) => post('addTransaction', { transaction }),
  updateTransaction: (transactionId: string, updates: Partial<Transaction>) => post('updateTransaction', { transactionId, updates }),
  deleteTransaction: (transactionId: string) => post('deleteTransaction', { transactionId }),
  saveCategory: (item: Partial<Category>) => post('saveCategory', { item }),
  saveSubcategory: (item: Partial<Category['subcategories'][number]>) => post('saveSubcategory', { item }),
  saveAccount: (item: Partial<Account>) => post('saveAccount', { item }),
  saveBudget: (item: Budget) => post('saveBudget', { item }),
  saveRecurring: (item: Recurring) => post('saveRecurring', { item }),
  saveSubscription: (item: Subscription) => post('saveSubscription', { item }),
  saveGoal: (item: Goal) => post('saveGoal', { item }),
  saveInvestment: (item: Investment) => post('saveInvestment', { item }),
  saveAsset: (item: Asset) => post('saveAsset', { item }),
  saveLiability: (item: Liability) => post('saveLiability', { item }),
  saveMerchant: (item: Merchant) => post('saveMerchant', { item }),
  saveSetting: (item: { settingKey: string; settingValue: string; description?: string }) => post('saveSetting', { item }),
};
