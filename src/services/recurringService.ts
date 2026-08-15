import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  isBefore,
  isEqual,
  parseISO,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { db } from '../db/database';
import { newId } from '../utils/id';
import type { Frequency, RecurringRule, ReviewQueueItem } from '../types/models';
import { queueEntitySync } from './syncService';

function clampMonthDay(year: number, month: number, day: number): Date {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(Math.max(day, 1), last));
}

/** Calculate the first occurrence strictly after `from`. */
export function calculateNextDue(rule: RecurringRule, from: Date): string {
  const base = startOfDay(from);

  if (rule.frequency === 'WEEKLY') return addWeeks(base, 1).toISOString();
  if (rule.frequency === 'BIWEEKLY') return addWeeks(base, 2).toISOString();
  if (rule.frequency === 'QUARTERLY') {
    const next = addMonths(base, 3);
    return clampMonthDay(next.getFullYear(), next.getMonth(), rule.dayOfMonth ?? base.getDate()).toISOString();
  }
  if (rule.frequency === 'YEARLY') {
    const next = addYears(base, 1);
    return clampMonthDay(next.getFullYear(), next.getMonth(), rule.dayOfMonth ?? base.getDate()).toISOString();
  }
  const next = addMonths(startOfMonth(base), 1);
  return clampMonthDay(next.getFullYear(), next.getMonth(), rule.dayOfMonth ?? base.getDate()).toISOString();
}

export function firstOccurrenceOnOrAfter(rule: RecurringRule, from: Date): Date {
  const target = startOfDay(from);
  const start = startOfDay(parseISO(rule.startDate));

  if (rule.frequency === 'WEEKLY') {
    const targetDow = rule.dayOfWeek ?? start.getDay();
    const delta = (targetDow - target.getDay() + 7) % 7;
    return addDays(target, delta);
  }

  if (rule.frequency === 'BIWEEKLY') {
    // The start date is the anchor. This preserves the actual 14-day cadence,
    // rather than merely matching a weekday and accidentally drifting to the
    // wrong week after a restart.
    if (target <= start) return start;
    const days = Math.ceil((target.getTime() - start.getTime()) / 86400000);
    const intervals = Math.ceil(days / 14);
    return addDays(start, intervals * 14);
  }

  if (rule.frequency === 'MONTHLY') {
    const day = rule.dayOfMonth ?? start.getDate();
    let candidate = clampMonthDay(target.getFullYear(), target.getMonth(), day);
    if (isBefore(candidate, target)) {
      const next = addMonths(startOfMonth(target), 1);
      candidate = clampMonthDay(next.getFullYear(), next.getMonth(), day);
    }
    return candidate;
  }

  if (rule.frequency === 'QUARTERLY') {
    if (target <= start) return start;
    let candidate = start;
    let guard = 0;
    while (isBefore(candidate, target) && guard++ < 1000) candidate = addMonths(candidate, 3);
    return clampMonthDay(candidate.getFullYear(), candidate.getMonth(), rule.dayOfMonth ?? start.getDate());
  }

  if (target <= start) return start;
  let candidate = start;
  let guard = 0;
  while (isBefore(candidate, target) && guard++ < 1000) candidate = addYears(candidate, 1);
  return clampMonthDay(candidate.getFullYear(), candidate.getMonth(), rule.dayOfMonth ?? start.getDate());
}

function occurrenceExternalId(ruleId: string, due: Date): string {
  return `${ruleId}:${due.toISOString().slice(0, 10)}`;
}

/**
 * Returns current-month obligations only. It is deliberately independent from
 * the review queue: estimated dues are projections, not recorded transactions.
 */
export function getRecurringOccurrencesForMonth(
  rules: RecurringRule[],
  month: Date,
  today = new Date(),
): Array<{ rule: RecurringRule; dueDate: Date }> {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const effectiveEnd = monthStart.getTime() === startOfMonth(today).getTime()
    ? new Date(Math.min(monthEnd.getTime(), today.getTime()))
    : monthEnd;
  const result: Array<{ rule: RecurringRule; dueDate: Date }> = [];

  for (const rule of rules) {
    if (!rule.active) continue;
    const ruleStart = startOfDay(parseISO(rule.startDate));
    const configuredEnd = rule.endDate ? startOfDay(parseISO(rule.endDate)) : undefined;
    if (configuredEnd && isBefore(configuredEnd, monthStart)) continue;

    const pointer = startOfDay(parseISO(rule.nextDueDate));
    const from = new Date(Math.max(pointer.getTime(), ruleStart.getTime(), monthStart.getTime()));
    let due = firstOccurrenceOnOrAfter(rule, from);
    let guard = 0;
    while (!isBefore(effectiveEnd, due) && guard++ < 500) {
      if ((!configuredEnd || !isBefore(configuredEnd, due)) && !isBefore(due, ruleStart)) {
        result.push({ rule, dueDate: due });
      }
      due = startOfDay(parseISO(calculateNextDue(rule, due)));
    }
  }
  return result;
}

/**
 * Due recurring rules create Review Queue occurrences, never ledger
 * transactions directly. Historical occurrences before the current month are
 * skipped, while every due occurrence in the current month is generated once.
 */
export async function processDueRecurringTransactions(now = new Date()): Promise<number> {
  const rules = await db.recurringRules.filter(r => r.active).toArray();
  const monthStart = startOfMonth(now);
  const today = startOfDay(now);
  let queued = 0;

  for (const rule of rules) {
    const ruleStart = startOfDay(parseISO(rule.startDate));
    const configuredEnd = rule.endDate ? startOfDay(parseISO(rule.endDate)) : undefined;
    if (configuredEnd && isBefore(configuredEnd, monthStart)) continue;

    const pointer = startOfDay(parseISO(rule.nextDueDate));
    const from = new Date(Math.max(pointer.getTime(), ruleStart.getTime(), monthStart.getTime()));
    let due = firstOccurrenceOnOrAfter(rule, from);
    let guard = 0;

    while ((isBefore(due, today) || isEqual(due, today)) && guard++ < 500) {
      if (configuredEnd && isBefore(configuredEnd, due)) break;

      const externalId = occurrenceExternalId(rule.id, due);
      const existing = await db.reviewQueue.where('externalId').equals(externalId).first();
      if (!existing) {
        const item: ReviewQueueItem = {
          id: newId('queue'),
          externalId,
          amount: rule.amount,
          type: rule.type,
          merchant: rule.merchant || rule.name,
          transactionDateTime: due.toISOString(),
          source: 'RECURRING',
          status: 'PENDING',
          suggestedCategoryId: rule.categoryId,
          suggestedSubcategoryId: rule.subcategoryId,
          suggestedAccountId: rule.accountId,
          notes: rule.notes,
          createdAt: now.toISOString(),
        };
        await db.reviewQueue.put(item);
        await queueEntitySync('REVIEW_QUEUE', item.id, 'CREATE', item);
        queued++;
      }
      due = startOfDay(parseISO(calculateNextDue(rule, due)));
    }

    // Keep the rule's pointer in the current-month timeline. This prevents
    // old rules from regenerating historical occurrences on every app launch.
    const pointer1 = due.toISOString();
    await db.recurringRules.put({
      ...rule,
      lastGeneratedDate: now.toISOString(),
      nextDueDate: pointer1,
      updatedAt: now.toISOString(),
    });
  }

  return queued;
}
