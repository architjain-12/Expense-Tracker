import type { InterestDeposit } from '../types/models';

export function projectedInterest(deposit: InterestDeposit, asOf = new Date()): number {
  const start = new Date(deposit.openingDate);
  const maturity = deposit.maturityDate ? new Date(deposit.maturityDate) : undefined;
  const end = maturity && maturity < asOf ? maturity : asOf;
  const years = Math.max(0, (end.getTime() - start.getTime()) / (365.25 * 24 * 3600 * 1000));
  const rate = deposit.annualRate / 100;
  if (deposit.type === 'RD') {
    const months = Math.max(1, Math.round(years * 12));
    let interest = 0;
    const installment = deposit.installment || 0;
    for (let i = 1; i <= months; i++) interest += installment * rate * ((months - i + 1) / 12);
    return interest;
  }
  if (deposit.compounding === 'SIMPLE') return deposit.principal * rate * years;
  const periods = deposit.compounding === 'MONTHLY' ? 12 : deposit.compounding === 'QUARTERLY' ? 4 : deposit.compounding === 'HALF_YEARLY' ? 2 : 1;
  return deposit.principal * (Math.pow(1 + rate / periods, periods * years) - 1);
}

export function maturityValue(deposit: InterestDeposit): number {
  return deposit.principal + projectedInterest(deposit, deposit.maturityDate ? new Date(deposit.maturityDate) : new Date());
}
