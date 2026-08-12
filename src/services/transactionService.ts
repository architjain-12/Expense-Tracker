import { db } from '../db/database';
import type { Transaction, TransactionType } from '../types/models';

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  transactionDateTime: string;
  accountId: string;
  categoryId?: string;
  subcategoryId?: string;
  merchant?: string;
  notes?: string;
  needWant?: Transaction['needWant'];
  essentialDiscretionary?: Transaction['essentialDiscretionary'];
  fixedVariable?: Transaction['fixedVariable'];
  source?: Transaction['source'];
  recurringRuleId?: string;
  sourceId?: string;
}

/** Business logic for creating/updating transactions. */
export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  if (!input.amount || input.amount <= 0) {
    throw new Error('Amount must be greater than zero.');
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const transaction: Transaction = {
    id,
    type: input.type,
    amount: Number(input.amount),
    transactionDateTime: input.transactionDateTime,
    accountId: input.accountId,
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId,
    merchant: input.merchant?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    needWant: input.needWant,
    essentialDiscretionary: input.essentialDiscretionary,
    fixedVariable: input.fixedVariable,
    source: input.source ?? 'MANUAL',
    recurringRuleId: input.recurringRuleId,
    sourceId: input.sourceId,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'PENDING',
  };

  await db.transaction('rw', [db.transactions, db.syncQueue], async () => {
    await db.transactions.put(transaction);
    await db.syncQueue.put({
      id: crypto.randomUUID(),
      entityType: 'TRANSACTION',
      entityId: transaction.id,
      operation: 'CREATE',
      payload: transaction,
      status: 'PENDING',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  });

  return transaction;
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
  const updated = { ...transaction, updatedAt: new Date().toISOString(), syncStatus: 'PENDING' as const };

  await db.transaction('rw', [db.transactions, db.syncQueue], async () => {
    await db.transactions.put(updated);
    await db.syncQueue.put({
      id: crypto.randomUUID(),
      entityType: 'TRANSACTION',
      entityId: updated.id,
      operation: 'UPDATE',
      payload: updated,
      status: 'PENDING',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  const transaction = await db.transactions.get(id);
  if (!transaction) return;
  const deletedAt = new Date().toISOString();
  const updated = { ...transaction, deletedAt, updatedAt: deletedAt, syncStatus: 'PENDING' as const };

  await db.transaction('rw', [db.transactions, db.syncQueue], async () => {
    await db.transactions.put(updated);
    await db.syncQueue.put({
      id: crypto.randomUUID(),
      entityType: 'TRANSACTION',
      entityId: id,
      operation: 'DELETE',
      payload: { id },
      status: 'PENDING',
      retryCount: 0,
      createdAt: deletedAt,
      updatedAt: deletedAt,
    });
  });
}
