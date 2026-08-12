import { startOfMonth } from 'date-fns';

export function currentMonthLabel(date = new Date()): string {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function currentMonthKey(date = new Date()): string {
  const d = startOfMonth(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
