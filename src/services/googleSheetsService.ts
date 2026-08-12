import { db } from '../db/database';

export interface SyncResponse {
  success: boolean;
  processed?: number;
  failed?: number;
  message?: string;
}

/**
 * Sends pending local SyncQueue items to the configured Google Apps Script endpoint.
 * The endpoint is intentionally runtime-configured and never hard-coded.
 */
export async function syncWithGoogleSheets(): Promise<SyncResponse> {
  const settings = await db.settings.get('app');
  if (!settings?.googleSheetsEnabled || !settings.googleSheetsEndpoint) {
    return { success: false, message: 'Google Sheets is not configured.' };
  }

  const items = await db.syncQueue.where('status').anyOf('PENDING', 'FAILED').toArray();
  if (!items.length) {
    return { success: true, processed: 0 };
  }

  const payload = {
    action: 'BATCH_SYNC',
    changes: items.map((item) => ({
      id: item.id,
      entityType: item.entityType,
      entityId: item.entityId,
      operation: item.operation,
      payload: item.payload,
    })),
  };


  try {
    await db.syncQueue.bulkPut(items.map(item => ({ ...item, status: 'SYNCING' as const, updatedAt: new Date().toISOString() })));

    const url = new URL(settings.googleSheetsEndpoint);
    if (settings.googleSheetsToken) url.searchParams.set('token', settings.googleSheetsToken);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as SyncResponse;
    if (!response.ok || !data.success) throw new Error(data.message || `HTTP ${response.status}`);

    await db.syncQueue.bulkDelete(items.map(item => item.id));

    const now = new Date().toISOString();
    const current = await db.settings.get('app');
    if (current) await db.settings.put({ ...current, lastSuccessfulSync: now });

    // Mark local entities as synced after the remote operation succeeds.
    for (const item of items) {
      if (item.entityType === 'TRANSACTION') {
        await db.transactions.update(item.entityId, { syncStatus: 'SYNCED' });
      }
    }

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed.';
    const now = new Date().toISOString();
    await db.syncQueue.bulkPut(items.map(item => ({ ...item, status: 'FAILED' as const, retryCount: item.retryCount + 1, lastError: message, updatedAt: now })));
    return { success: false, message };
  }
}
