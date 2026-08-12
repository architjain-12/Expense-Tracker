import { startOfMonth, endOfMonth, format, eachMonthOfInterval, startOfDay, endOfDay } from 'date-fns';
import { db } from '../db/database';
import type { Transaction } from '../types/models';

export interface MonthlySummary {
  income: number;
  expenses: number;
  transactionCount: number;
  averageTransaction: number;
}

export async function getActiveTransactions(): Promise<Transaction[]> {
  return db.transactions.filter((t) => !t.deletedAt).toArray();
}

export async function getMonthlyTransactions(date: Date): Promise<Transaction[]> {
  const start = startOfMonth(date).toISOString();
  const end = endOfMonth(date).toISOString();
  return db.transactions
    .where('transactionDateTime')
    .between(start, end, true, true)
    .filter((t) => !t.deletedAt)
    .toArray();
}

export function calculateSummary(transactions: Transaction[]): MonthlySummary {
  const income = transactions.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
  return {
    income,
    expenses,
    transactionCount: transactions.length,
    averageTransaction: transactions.length ? (income + expenses) / transactions.length : 0,
  };
}

export function buildDailySeries(transactions: Transaction[], month: Date) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = [];
  for (let cursor = startOfDay(start); cursor <= end; cursor = new Date(cursor.getTime() + 86_400_000)) {
    const dayEnd = endOfDay(cursor);
    const value = transactions
      .filter((t) => t.type === 'EXPENSE')
      .filter((t) => {
        const d = new Date(t.transactionDateTime);
        return d >= cursor && d <= dayEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    days.push({ day: format(cursor, 'd'), amount: value });
  }
  return days;
}

export function buildMonthlySeries(transactions: Transaction[], months = 6) {
  const today = new Date();
  const start = startOfMonth(new Date(today.getFullYear(), today.getMonth() - (months - 1), 1));
  return eachMonthOfInterval({ start, end: startOfMonth(today) }).map((month) => {
    const total = transactions
      .filter((t) => t.type === 'EXPENSE')
      .filter((t) => {
        const d = new Date(t.transactionDateTime);
        return d >= startOfMonth(month) && d <= endOfMonth(month);
      })
      .reduce((sum, t) => sum + t.amount, 0);
    return { month: format(month, 'MMM'), amount: total };
  });
}
