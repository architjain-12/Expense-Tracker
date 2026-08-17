import type { Budget } from '../types/models';

export function periodStart(date: Date, period: Budget['period']): Date {
  return period === 'MONTHLY' ? new Date(date.getFullYear(), date.getMonth(), 1) : new Date(date.getFullYear(), 0, 1);
}

export function periodEnd(date: Date, period: Budget['period']): Date {
  return period === 'MONTHLY' ? new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999) : new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

export function budgetAppliesTo(budget: Budget, date: Date): boolean {
  const start = new Date(budget.startDate);
  const end = budget.endDate ? new Date(budget.endDate) : undefined;
  return periodStart(date, budget.period).getTime() >= periodStart(start, budget.period).getTime() && (!end || periodStart(date, budget.period).getTime() <= periodStart(end, budget.period).getTime());
}

export function getEffectiveBudget(budgets: Budget[], categoryId: string | undefined, period: Budget['period'], date: Date): Budget | undefined {
  return budgets.filter(b => (b.categoryId || undefined) === categoryId && b.period === period && budgetAppliesTo(b, date)).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
}
