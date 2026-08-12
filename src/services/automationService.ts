import { db } from '../db/database';
import type { ReviewQueueItem } from '../types/models';

/**
 * Imports newline-delimited JSON (NDJSON) from an iOS Shortcut export file.
 * Each line represents one bank-notification event.
 */
export interface AutomationImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function importAutomationNdjson(file: File): Promise<AutomationImportResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const result: AutomationImportResult = { imported: 0, skipped: 0, errors: [] };

  for (const [index, line] of lines.entries()) {
    try {
      const raw = JSON.parse(line) as Record<string, unknown>;
      if (!raw.externalId || typeof raw.amount !== 'number' || !raw.transactionDateTime) {
        throw new Error('Missing externalId, amount or transactionDateTime.');
      }

      const exists = await db.reviewQueue.where('externalId').equals(String(raw.externalId)).first();
      if (exists) {
        result.skipped += 1;
        continue;
      }

      const item: ReviewQueueItem = {
        id: crypto.randomUUID(),
        externalId: String(raw.externalId),
        amount: Number(raw.amount),
        type: raw.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
        merchant: raw.merchant ? String(raw.merchant) : undefined,
        accountHint: raw.accountHint ? String(raw.accountHint) : undefined,
        transactionDateTime: String(raw.transactionDateTime),
        rawMessage: raw.rawMessage ? String(raw.rawMessage) : undefined,
        source: 'IOS_SHORTCUT',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      await db.reviewQueue.put(item);
      result.imported += 1;
    } catch (error) {
      result.errors.push(`Line ${index + 1}: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }

  return result;
}
