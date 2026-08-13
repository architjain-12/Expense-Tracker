import { addMonths, addWeeks, addYears, isBefore, isEqual, parseISO, setDate, startOfDay } from 'date-fns';
import { db } from '../db/database';
import { newId } from '../utils/id';
import type { RecurringRule, ReviewQueueItem } from '../types/models';
import { queueEntitySync } from './syncService';

function calculateNextDue(rule: RecurringRule, from: Date): string {
  if (rule.frequency === 'WEEKLY') {
    return addWeeks(from, 1).toISOString();
  }

  if (rule.frequency === 'BIWEEKLY') {
    return addWeeks(from, 2).toISOString();
  }

  if (rule.frequency === 'QUARTERLY') {
    return addMonths(from, 3).toISOString();
  }

  if (rule.frequency === 'YEARLY') {
    return addYears(from, 1).toISOString();
  }

  // MONTHLY
  const day = rule.dayOfMonth ?? 1;

  // First try this month's occurrence.
  const currentMonth = new Date(
    from.getFullYear(),
    from.getMonth(),
    1
  );

  const lastDayOfCurrentMonth = new Date(
    from.getFullYear(),
    from.getMonth() + 1,
    0
  ).getDate();

  const currentDueDate = new Date(
    from.getFullYear(),
    from.getMonth(),
    Math.min(day, lastDayOfCurrentMonth)
  );

  // If this month's due date is today or in the future,
  // use this month.
  if (currentDueDate >= from) {
    return currentDueDate.toISOString();
  }

  // Otherwise use next month.
  const nextMonth = addMonths(currentMonth, 1);

  const lastDayOfNextMonth = new Date(
    nextMonth.getFullYear(),
    nextMonth.getMonth() + 1,
    0
  ).getDate();

  const nextDueDate = new Date(
    nextMonth.getFullYear(),
    nextMonth.getMonth(),
    Math.min(day, lastDayOfNextMonth)
  );

  return nextDueDate.toISOString();
}

/**
 * v2.3: due recurring rules create review-queue occurrences, never ledger
 * transactions directly. Occurrence identity is ruleId:date, so duplicates
 * cannot be generated when the PWA is opened repeatedly.
 */
export async function processDueRecurringTransactions(now = new Date()): Promise<number> {
  const rules = await db.recurringRules.filter(r => r.active).toArray();
  let queued = 0;
  const today = startOfDay(now);
  for (const rule of rules) {
    let due = startOfDay(parseISO(rule.nextDueDate));
    const end = rule.endDate ? startOfDay(parseISO(rule.endDate)) : undefined;
    while ((isBefore(due, today) || isEqual(due, today)) && (!end || !isBefore(end, due))) {
      const externalId = `${rule.id}:${due.toISOString().slice(0, 10)}`;
      const existing = await db.reviewQueue.where('externalId').equals(externalId).first();
      if (!existing) {
        const item: ReviewQueueItem = {
          id: newId('queue'), externalId, amount: rule.amount, type: rule.type,
          merchant: rule.merchant || rule.name, transactionDateTime: due.toISOString(),
          source: 'RECURRING', status: 'PENDING', suggestedCategoryId: rule.categoryId,
          suggestedSubcategoryId: rule.subcategoryId, suggestedAccountId: rule.accountId,
          notes: rule.notes, createdAt: now.toISOString(),
        };
        await db.reviewQueue.put(item);
        await queueEntitySync('REVIEW_QUEUE', item.id, 'CREATE', item);
        queued++;
      }
      due = parseISO(calculateNextDue(rule, due));
      if (queued > 500) break;
    }
    await db.recurringRules.put({ ...rule, lastGeneratedDate: now.toISOString(), nextDueDate: due.toISOString(), updatedAt: now.toISOString() });
  }
  return queued;
}
