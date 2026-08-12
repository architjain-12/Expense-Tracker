import { addMonths, addWeeks, addYears, isBefore, isEqual, parseISO, setDate, startOfDay } from 'date-fns';
import { db } from '../db/database';
import { createTransaction } from './transactionService';
import type { RecurringRule } from '../types/models';

function calculateNextDue(rule: RecurringRule, from: Date): string {
  if (rule.frequency === 'WEEKLY') return addWeeks(from, 1).toISOString();
  if (rule.frequency === 'YEARLY') return addYears(from, 1).toISOString();

  const nextMonth = addMonths(from, 1);
  const day = Math.min(rule.dayOfMonth ?? 1, new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate());
  return setDate(nextMonth, day).toISOString();
}

/** Generate due recurring transactions when the app starts or resumes. */
export async function processDueRecurringTransactions(now = new Date()): Promise<number> {
  const rules = await db.recurringRules.filter((rule) => rule.active).toArray();
  let generated = 0;

  for (const rule of rules) {
    let due = parseISO(rule.nextDueDate);
    const today = startOfDay(now);
    const end = rule.endDate ? startOfDay(parseISO(rule.endDate)) : undefined;

    while ((isBefore(due, today) || isEqual(due, today)) && (!end || isBefore(due, addYears(end, 1)))) {
      if (end && isBefore(end, due)) break;

      await createTransaction({
        type: rule.type,
        amount: rule.amount,
        transactionDateTime: due.toISOString(),
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        subcategoryId: rule.subcategoryId,
        merchant: rule.merchant,
        notes: rule.notes,
        source: 'RECURRING',
        recurringRuleId: rule.id,
      });

      generated += 1;
      const next = calculateNextDue(rule, due);
      due = parseISO(next);

      // Safety guard for malformed rules.
      if (generated > 500) break;
    }

    const updated = { ...rule, lastGeneratedDate: now.toISOString(), nextDueDate: due.toISOString(), updatedAt: now.toISOString() };
    await db.recurringRules.put(updated);
  }

  return generated;
}
