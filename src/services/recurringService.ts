import { addDays, addMonths, addWeeks, addYears, isBefore, isEqual, parseISO, setDate, startOfDay } from 'date-fns';
import { db } from '../db/database';
import { createTransaction } from './transactionService';
import type { Frequency, RecurringRule } from '../types/models';

function nextDue(rule:RecurringRule, from:Date):Date {
  switch(rule.frequency){
    case 'DAILY': return addDays(from,1);
    case 'WEEKLY': return addWeeks(from,1);
    case 'BIWEEKLY': return addWeeks(from,2);
    case 'MONTHLY': return setDate(addMonths(from,1),Math.min(rule.dayOfMonth??1,new Date(from.getFullYear(),from.getMonth()+2,0).getDate()));
    case 'BIMONTHLY': return setDate(addMonths(from,2),Math.min(rule.dayOfMonth??1,new Date(from.getFullYear(),from.getMonth()+3,0).getDate()));
    case 'QUARTERLY': return setDate(addMonths(from,3),Math.min(rule.dayOfMonth??1,new Date(from.getFullYear(),from.getMonth()+4,0).getDate()));
    case 'HALF_YEARLY': return setDate(addMonths(from,6),Math.min(rule.dayOfMonth??1,new Date(from.getFullYear(),from.getMonth()+7,0).getDate()));
    case 'YEARLY': return addYears(from,1);
  }
}

export async function processDueRecurringTransactions(now=new Date()):Promise<number>{
  const rules=await db.recurringRules.filter(r=>r.active).toArray(); let generated=0; const today=startOfDay(now);
  for(const rule of rules){
    let due=parseISO(rule.nextDueDate); const end=rule.endDate?startOfDay(parseISO(rule.endDate)):undefined;
    while((isBefore(due,today)||isEqual(due,today))&&(!end||!isBefore(end,due))){
      await createTransaction({type:rule.type,amount:rule.amount,transactionDateTime:due.toISOString(),accountId:rule.accountId,categoryId:rule.categoryId,subcategoryId:rule.subcategoryId,merchant:rule.merchant,notes:rule.notes,source:'RECURRING',recurringRuleId:rule.id,sourceId:`${rule.id}:${due.toISOString().slice(0,10)}`});
      generated++; due=nextDue(rule,due); if(generated>500)break;
    }
    await db.recurringRules.put({...rule,lastGeneratedDate:now.toISOString(),nextDueDate:due.toISOString(),updatedAt:now.toISOString()});
  }
  return generated;
}
export function frequencyLabel(f:Frequency){return {'DAILY':'Daily','WEEKLY':'Weekly','BIWEEKLY':'Every 2 weeks','MONTHLY':'Monthly','BIMONTHLY':'Every 2 months','QUARTERLY':'Quarterly','HALF_YEARLY':'Half-yearly','YEARLY':'Yearly'}[f];}
