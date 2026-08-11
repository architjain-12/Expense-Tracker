import type {
  Account,
  Category,
  MonthlySummary,
  NewTransactionInput,
  Transaction,
} from '../types/finance';

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const TOKEN = import.meta.env.VITE_API_TOKEN as string;

if (!BASE_URL || !TOKEN) {
  // Fails loudly at build/runtime rather than silently sending broken requests.
  // eslint-disable-next-line no-console
  console.error(
    'Missing VITE_API_BASE_URL or VITE_API_TOKEN. Copy .env.example to .env and fill in your deployed values.'
  );
}

// Apps Script Web Apps always return HTTP 200 — real success/failure lives in
// the JSON body, so every call here checks `data.error` explicitly.
async function get<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(BASE_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('token', TOKEN);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as T;
}

async function post<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    // text/plain avoids a CORS preflight against Apps Script, which doesn't
    // handle OPTIONS requests well.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: TOKEN, ...payload }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as T;
}

export const api = {
  getCategories: () => get<Category[]>('categories'),
  getAccounts: () => get<Account[]>('accounts'),
  getTransactions: (params: { from?: string; to?: string; categoryId?: string; limit?: number } = {}) =>
    get<Transaction[]>('transactions', {
      ...(params.from && { from: params.from }),
      ...(params.to && { to: params.to }),
      ...(params.categoryId && { categoryId: params.categoryId }),
      ...(params.limit && { limit: String(params.limit) }),
    }),
  getMonthlySummary: (month: string) => get<MonthlySummary>('monthlySummary', { month }),
  addTransaction: (transaction: NewTransactionInput) =>
    post<{ transactionId: string }>('addTransaction', { transaction }),
  updateTransaction: (transactionId: string, updates: Partial<Transaction>) =>
    post<{ transactionId: string; updated: boolean }>('updateTransaction', { transactionId, updates }),
  deleteTransaction: (transactionId: string) =>
    post<{ transactionId: string; updated: boolean }>('deleteTransaction', { transactionId }),
};
