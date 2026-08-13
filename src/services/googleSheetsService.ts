import { db } from '../db/database';

export interface SyncResponse { success:boolean; processed?:number; failed?:number; message?:string; }

async function configuredEndpoint(){
  const settings=await db.settings.get('app');
  if(!settings?.googleSheetsEnabled||!settings.googleSheetsEndpoint) return null;
  return settings;
}

async function callGoogle(action:string, body?:unknown){
  const settings=await configuredEndpoint(); if(!settings) throw new Error('Google Sheets is not configured.');
  const url=new URL(settings.googleSheetsEndpoint!); url.searchParams.set('action',action); if(settings.googleSheetsToken) url.searchParams.set('token',settings.googleSheetsToken);
  const response=await fetch(url.toString(),{method:body?'POST':'GET',headers:body?{'Content-Type':'text/plain;charset=utf-8'}:undefined,body:body?JSON.stringify(body):undefined});
  const text=await response.text(); let data: any; try{data=JSON.parse(text);}catch{throw new Error('Google Apps Script returned a non-JSON response. Check deployment URL and access settings.');}
  if(!response.ok||!data.success)throw new Error(data.message||`HTTP ${response.status}`); return data;
}

export async function syncWithGoogleSheets(): Promise<SyncResponse>{
  const items=await db.syncQueue.where('status').anyOf('PENDING','FAILED').toArray(); if(!items.length)return{success:true,processed:0}; const now=new Date().toISOString();
  await db.syncQueue.bulkPut(items.map(i=>({...i,status:'SYNCING' as const,updatedAt:now})));
  try{const data=await callGoogle('BATCH_SYNC',{changes:items.map(i=>({id:i.id,entityType:i.entityType,entityId:i.entityId,operation:i.operation,payload:i.payload}))});await db.syncQueue.bulkDelete(items.map(i=>i.id));const current=await db.settings.get('app');if(current)await db.settings.put({...current,lastSuccessfulSync:now});for(const item of items){if(item.entityType==='TRANSACTION')await db.transactions.update(item.entityId,{syncStatus:'SYNCED'});}return data;}catch(error){const message=error instanceof Error?error.message:'Sync failed.';await db.syncQueue.bulkPut(items.map(i=>({...i,status:'FAILED' as const,retryCount:i.retryCount+1,lastError:message,updatedAt:new Date().toISOString()})));return{success:false,message};}
}

export async function restoreFromGoogleSheets(){
  const data=await callGoogle('RESTORE_ALL');
  const txs=(data.transactions||[]) as any[]; const accounts=(data.accounts||[]) as any[]; const categories=(data.categories||[]) as any[]; const rules=(data.recurringRules||[]) as any[]; const budgets=(data.budgets||[]) as any[]; const investments=(data.investments||[]) as any[]; const interestAccounts=(data.interestAccounts||[]) as any[]; const projectedIncomeEvents=(data.projectedIncomeEvents||[]) as any[]; const savedReports=(data.savedReports||[]) as any[];
  await db.transaction('rw',[db.transactions,db.accounts,db.categories,db.recurringRules,db.budgets,db.investments,db.interestAccounts,db.projectedIncomeEvents,db.savedReports],async()=>{if(txs.length)await db.transactions.bulkPut(txs);if(accounts.length)await db.accounts.bulkPut(accounts);if(categories.length)await db.categories.bulkPut(categories);if(rules.length)await db.recurringRules.bulkPut(rules);if(budgets.length)await db.budgets.bulkPut(budgets);if(investments.length)await db.investments.bulkPut(investments);if(interestAccounts.length)await db.interestAccounts.bulkPut(interestAccounts);if(projectedIncomeEvents.length)await db.projectedIncomeEvents.bulkPut(projectedIncomeEvents);if(savedReports.length)await db.savedReports.bulkPut(savedReports);});
  return{restored:txs.length,message:`Restored ${txs.length} transactions${rules.length?`, ${rules.length} recurring rules`:''}.`};
}

let attemptedAutomaticRestore=false;
export async function restoreFromGoogleSheetsIfEmpty(){
  if(attemptedAutomaticRestore)return; attemptedAutomaticRestore=true;
  const allCount=await db.transactions.filter(t=>!t.deletedAt).count();
  if(allCount>0)return;
  const settings=await db.settings.get('app'); if(!settings?.googleSheetsEnabled||!settings.googleSheetsEndpoint)return;
  try{await restoreFromGoogleSheets();}catch(error){console.warn('Automatic Google Sheets restore skipped:',error);}
}
