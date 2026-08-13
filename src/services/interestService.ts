import { addMonths, differenceInCalendarMonths, eachMonthOfInterval, endOfMonth, startOfMonth } from 'date-fns';
import { db } from '../db/database';
import { newId } from '../utils/id';
import { createTransaction } from './transactionService';
import type { InterestAccount, ProjectedIncomeEvent } from '../types/models';

export function calculateFdInterest(principal:number, rate:number, months:number, compounding:string){
  if(compounding==='SIMPLE') return principal*(rate/100)*(months/12);
  const n=compounding==='MONTHLY'?12:compounding==='QUARTERLY'?4:compounding==='HALF_YEARLY'?2:1;
  return principal*(Math.pow(1+(rate/100)/n,n*(months/12))-1);
}
export function calculateInterestAccount(account:InterestAccount, asOf=new Date()):number{
  if(account.type==='RECURRING_DEPOSIT'){
    const monthly=account.recurringAmount||0; const months=Math.max(0,Math.min(account.maturityMonths||differenceInCalendarMonths(asOf,new Date(account.openingDate)),differenceInCalendarMonths(asOf,new Date(account.openingDate))));
    let total=0; for(let i=0;i<months;i++){const remaining=months-i; total += monthly*((account.interestRate/100)*(remaining/12));} return total;
  }
  const months=account.maturityMonths ?? Math.max(0,differenceInCalendarMonths(asOf,new Date(account.openingDate)));
  return calculateFdInterest(account.principal,account.interestRate,months,account.compounding);
}
export function projectedSchedule(account:InterestAccount):Array<{date:string,amount:number}>{
  const start=startOfMonth(new Date(account.openingDate)); const end=account.maturityDate?startOfMonth(new Date(account.maturityDate)):addMonths(start,account.maturityMonths||12); const total=calculateInterestAccount(account,end); const months=Math.max(1,differenceInCalendarMonths(end,start));
  return eachMonthOfInterval({start,end}).map((d,i)=>({date:endOfMonth(d).toISOString(),amount:Math.round((total/months)*100)/100})).filter(x=>new Date(x.date)>=new Date(account.openingDate));
}
export async function ensureProjectedInterest(account:InterestAccount){
  if(!account.autoRecordInterest) return;
  const category=await db.categories.filter(c=>c.name==='Income'&& !c.parentId).first(); const interestSub=category?await db.categories.filter(c=>c.parentId===category.id&&c.name==='Interest').first():undefined;
  const existing=await db.projectedIncomeEvents.where('interestAccountId').equals(account.id).toArray(); const ids=new Set(existing.map(e=>e.expectedDate.slice(0,10)));
  for(const item of projectedSchedule(account)) if(!ids.has(item.date.slice(0,10))){const now=new Date().toISOString(); const event:ProjectedIncomeEvent={id:newId('interest-event'),interestAccountId:account.id,expectedDate:item.date,amount:item.amount,categoryId:category?.id,status:'PROJECTED',createdAt:now,updatedAt:now}; await db.projectedIncomeEvents.put(event);}
}
export async function recordDueInterest(now=new Date()):Promise<number>{
  const events=await db.projectedIncomeEvents.filter(e=>e.status==='PROJECTED'&&new Date(e.expectedDate)<=now).toArray(); let count=0;
  for(const e of events){const account=await db.interestAccounts.get(e.interestAccountId); if(!account||!account.autoRecordInterest)continue; if(!account.accountId) continue; const savings=account.accountId; const tx=await createTransaction({type:'INCOME',amount:e.amount,transactionDateTime:e.expectedDate,accountId:savings,categoryId:e.categoryId,source:'INTEREST',sourceId:`interest:${e.id}`,merchant:account.name,notes:`Projected interest from ${account.type.replace('_',' ')}`}); await db.projectedIncomeEvents.put({...e,status:'RECORDED',transactionId:tx.id,updatedAt:new Date().toISOString()}); count++;}
  return count;
}
