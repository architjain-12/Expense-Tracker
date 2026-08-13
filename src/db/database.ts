import Dexie, { type Table } from 'dexie';
import type { Account, AppSettings, Budget, Category, InterestAccount, InvestmentEntry, ProjectedIncomeEvent, RecurringRule, ReviewQueueItem, SavedReport, SyncQueueItem, Transaction } from '../types/models';

export class ExpenseDB extends Dexie {
  transactions!:Table<Transaction,string>; accounts!:Table<Account,string>; categories!:Table<Category,string>; recurringRules!:Table<RecurringRule,string>; reviewQueue!:Table<ReviewQueueItem,string>; budgets!:Table<Budget,string>; investments!:Table<InvestmentEntry,string>; interestAccounts!:Table<InterestAccount,string>; projectedIncomeEvents!:Table<ProjectedIncomeEvent,string>; savedReports!:Table<SavedReport,string>; syncQueue!:Table<SyncQueueItem,string>; settings!:Table<AppSettings,string>;
  constructor(){
    super('ExpenseTrackerDB');
    const schema={transactions:'id, transactionDateTime, accountId, categoryId, subcategoryId, merchant, updatedAt, syncStatus, source, recurringRuleId, sourceId',accounts:'id, name, isDefault, active, updatedAt',categories:'id, name, parentId, active, sortOrder',recurringRules:'id, nextDueDate, active, updatedAt',reviewQueue:'id, externalId, status, transactionDateTime, merchant',budgets:'id, categoryId, period, startDate',investments:'id, date, assetType, type, accountId, updatedAt, syncStatus, transactionId',interestAccounts:'id, type, active, openingDate, maturityDate',projectedIncomeEvents:'id, interestAccountId, expectedDate, status',savedReports:'id, name, updatedAt',syncQueue:'id, entityType, entityId, status, createdAt',settings:'id'};
    this.version(1).stores(schema);
    this.version(2).stores(schema);
    this.version(3).stores(schema).upgrade(async tx=>{
      await tx.table('settings').toCollection().modify((s:any)=>{ if(!s.theme) s.theme='dark'; });
    });
  }
}
export const db=new ExpenseDB();
