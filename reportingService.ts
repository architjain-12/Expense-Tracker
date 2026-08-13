import { startOfMonth, endOfMonth, format, eachMonthOfInterval, startOfDay, endOfDay } from 'date-fns';
import { db } from '../db/database';
import type { Transaction } from '../types/models';

export interface MonthlySummary { income:number; expenses:number; transactionCount:number; averageTransaction:number; }

function uniqueTransactions(transactions: Transaction[]): Transaction[] {
  const seen=new Set<string>();
  return transactions.filter(t=>{if(seen.has(t.id))return false;seen.add(t.id);return true;});
}

export async function getActiveTransactions(): Promise<Transaction[]> { return uniqueTransactions(await db.transactions.filter(t=>!t.deletedAt).toArray()); }

export async function getMonthlyTransactions(date: Date): Promise<Transaction[]> {
  const start=startOfMonth(date).toISOString(); const end=endOfMonth(date).toISOString();
  return uniqueTransactions(await db.transactions.where('transactionDateTime').between(start,end,true,true).filter(t=>!t.deletedAt).toArray());
}

export function calculateSummary(transactions: Transaction[]): MonthlySummary {
  const unique=uniqueTransactions(transactions);
  const income=unique.filter(t=>t.type==='INCOME').reduce((s,t)=>s+t.amount,0);
  const expenses=unique.filter(t=>t.type==='EXPENSE').reduce((s,t)=>s+t.amount,0);
  return { income, expenses, transactionCount: unique.length, averageTransaction: unique.length ? (income+expenses)/unique.length : 0 };
}

export function buildDailySeries(transactions: Transaction[], month: Date) {
  const unique=uniqueTransactions(transactions); const start=startOfMonth(month); const end=endOfMonth(month); const days=[] as Array<{day:string;amount:number}>;
  for(let cursor=startOfDay(start); cursor<=end; cursor=new Date(cursor.getTime()+86400000)){
    const dayEnd=endOfDay(cursor); const value=unique.filter(t=>t.type==='EXPENSE').filter(t=>{const d=new Date(t.transactionDateTime);return d>=cursor&&d<=dayEnd;}).reduce((s,t)=>s+t.amount,0);
    days.push({day:format(cursor,'d'),amount:value});
  }
  return days;
}

export function buildMonthlySeries(transactions: Transaction[], months=6) {
  const unique=uniqueTransactions(transactions); const today=new Date(); const start=startOfMonth(new Date(today.getFullYear(),today.getMonth()-(months-1),1));
  return eachMonthOfInterval({start,end:startOfMonth(today)}).map(month=>{const total=unique.filter(t=>t.type==='EXPENSE').filter(t=>{const d=new Date(t.transactionDateTime);return d>=startOfMonth(month)&&d<=endOfMonth(month);}).reduce((s,t)=>s+t.amount,0);return {month:format(month,'MMM'),amount:total};});
}
