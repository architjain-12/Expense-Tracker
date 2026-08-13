import { db } from '../db/database';
import { newId } from '../utils/id';

/** Queue a local entity change for the optional Google Sheets cloud copy. */
export async function queueEntitySync(entityType: string, entityId: string, operation: 'CREATE'|'UPDATE'|'DELETE', payload: unknown): Promise<void> {
  const now=new Date().toISOString();
  await db.syncQueue.put({id:newId('sync'),entityType,entityId,operation,payload,status:'PENDING',retryCount:0,createdAt:now,updatedAt:now});
}
