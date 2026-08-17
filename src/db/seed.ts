import { db } from './database';
import { newId } from '../utils/id';
import type { Account, AppSettings, Category, RecurringRule } from '../types/models';

const now = new Date().toISOString();

const defaultAccounts: Account[] = [
  { id: 'account-hdfc-bank', name: 'HDFC Bank', type: 'BANK_ACCOUNT', institution: 'HDFC', isDefault: true, active: true, createdAt: now, updatedAt: now },
  { id: 'account-hdfc-card', name: 'HDFC Credit Card', type: 'CREDIT_CARD', institution: 'HDFC', lastFourDigits: '1234', isDefault: false, active: true, createdAt: now, updatedAt: now },
  { id: 'account-cash', name: 'Cash', type: 'CASH', isDefault: false, active: true, createdAt: now, updatedAt: now },
];

const categoryTree: Array<[string, string, string, string[]]> = [
  ['Housing', '🏠', 'Housing', ['Rent', 'Maintenance/Society Fees', 'Electricity', 'Water', 'Gas', 'Internet', 'Mobile', 'Repairs']],
  ['Food & Dining', '🍽️', 'Food & Dining', ['Groceries', 'Restaurants', 'Cafes', 'Office', 'Food Delivery', 'Snacks']],
  ['Transportation', '🚗', 'Transportation', ['Fuel', 'Metro/Public Transport', 'Taxi/Ride Sharing', 'Parking', 'Toll', 'Vehicle Maintenance']],
  ['Shopping', '🛍️', 'Shopping', ['Clothing', 'Electronics', 'Online Shopping', 'Gifts', 'Other Shopping']],
  ['Health', '❤️', 'Health', ['Doctor', 'Pharmacy', 'Diagnostics', 'Health Insurance', 'Fitness']],
  ['Personal', '✨', 'Personal', ['Personal Care', 'Salon/Grooming', 'Hobbies', 'Education/Courses']],
  ['Entertainment', '🎬', 'Entertainment', ['Movies', 'Streaming', 'Events', 'Sports/Recreation']],
  ['Travel', '✈️', 'Travel', ['Flights', 'Hotels', 'Local Transport', 'Travel Food', 'Activities']],
  ['Family', '👨‍👩‍👧‍👦', 'Family', ['Parents', 'Children', 'Family Support', 'Family Events']],
  ['Financial', '💳', 'Financial', ['Bank Charges', 'Credit Card Fees', 'Loan Interest', 'Taxes', 'EMI']],
  ['Investments', '📈', 'Investments', ['Stocks', 'Mutual Funds', 'SIP', 'Fixed Deposits', 'Gold', 'Retirement/PF']],
  ['Income', '💰', 'Income', ['Salary', 'Bonus', 'Freelance', 'Interest', 'Dividends', 'Refund', 'Other Income']],
  ['Miscellaneous', '📦', 'Miscellaneous', ['Uncategorized', 'Other']],
];

const needDefaults = new Set(['Rent', 'Electricity', 'Water', 'Gas', 'Internet', 'Mobile', 'Groceries', 'Doctor', 'Pharmacy', 'Health Insurance', 'EMI', 'Taxes', 'Parents', 'Children']);
const fixedDefaults = new Set(['Rent', 'Maintenance/Society Fees', 'Electricity', 'Water', 'Gas', 'Internet', 'Mobile', 'Health Insurance', 'EMI', 'SIP', 'Fixed Deposits', 'Retirement/PF']);

function buildCategories(): Category[] {
  const result: Category[] = [];
  categoryTree.forEach(([name, icon, , children], rootIndex) => {
    const rootId = `category-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    result.push({ id: rootId, name, icon, active: true, sortOrder: rootIndex * 100, createdAt: now, updatedAt: now });
    children.forEach((child, childIndex) => {
      const id = `${rootId}-${child.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      result.push({
        id,
        name: child,
        parentId: rootId,
        active: true,
        sortOrder: rootIndex * 100 + childIndex + 1,
        defaultNeedWant: needDefaults.has(child) ? 'NEED' : undefined,
        defaultEssentialDiscretionary: needDefaults.has(child) ? 'ESSENTIAL' : undefined,
        defaultFixedVariable: fixedDefaults.has(child) ? 'FIXED' : undefined,
        createdAt: now,
        updatedAt: now,
      });
    });
  });
  return result;
}


async function seedDemoTransactions(): Promise<void> {
  if (await db.transactions.count() > 0) return;
  const roots = await db.categories.filter(c => !c.parentId).toArray();
  const root = (name: string) => roots.find(c => c.name === name)?.id;
  const sub = async (categoryName: string, subcategoryName: string) => {
    const parent = root(categoryName);
    return (await db.categories.filter(c => c.parentId === parent && c.name === subcategoryName).first())?.id;
  };

  const food = root('Food & Dining');
  const transport = root('Transportation');
  const shopping = root('Shopping');
  const health = root('Health');
  const entertainment = root('Entertainment');
  const income = root('Income');
  const bank = 'account-hdfc-bank';
  const card = 'account-hdfc-card';
  const nowDate = new Date();

  // Six months of deliberately varied demo activity. IDs are deterministic so
  // the generated dataset is stable and easy to inspect while testing.
  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const base = new Date(nowDate.getFullYear(), nowDate.getMonth() - monthOffset, 1);
    const ym = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
    const multiplier = 0.78 + ((monthOffset * 17) % 43) / 100;
    const items = [
      { day: 2, amount: Math.round(3200 * multiplier), merchant: 'Demo Groceries', categoryId: food, subcategoryId: await sub('Food & Dining', 'Groceries'), accountId: bank },
      { day: 5, amount: Math.round(1400 * multiplier), merchant: 'Demo Fuel', categoryId: transport, subcategoryId: await sub('Transportation', 'Fuel'), accountId: card },
      { day: 9, amount: Math.round(2100 * multiplier), merchant: 'Demo Shopping', categoryId: shopping, subcategoryId: await sub('Shopping', 'Online Shopping'), accountId: card },
      { day: 14, amount: Math.round(900 * multiplier), merchant: 'Demo Restaurant', categoryId: food, subcategoryId: await sub('Food & Dining', 'Restaurants'), accountId: card },
      { day: 18, amount: Math.round(650 * (1 + ((monthOffset + 2) % 3) * 0.25)), merchant: 'Demo Pharmacy', categoryId: health, subcategoryId: await sub('Health', 'Pharmacy'), accountId: bank },
      { day: 22, amount: Math.round(1500 * (0.8 + ((monthOffset + 1) % 4) * 0.18)), merchant: 'Demo Commute', categoryId: transport, subcategoryId: await sub('Transportation', 'Metro/Public Transport'), accountId: bank },
      { day: 26, amount: Math.round(1100 * (0.7 + (monthOffset % 5) * 0.22)), merchant: 'Demo Entertainment', categoryId: entertainment, subcategoryId: await sub('Entertainment', 'Movies'), accountId: card },
      { day: 7, amount: Math.round(1800 * (0.7 + ((monthOffset + 2) % 5) * 0.18)), merchant: 'Demo Cafe & Delivery', categoryId: food, subcategoryId: await sub('Food & Dining', monthOffset % 2 ? 'Food Delivery' : 'Cafes'), accountId: card },
      { day: 11, amount: Math.round(2400 * (0.65 + ((monthOffset + 1) % 6) * 0.16)), merchant: 'Demo Family Support', categoryId: root('Family'), subcategoryId: await sub('Family', 'Parents'), accountId: bank },
      { day: 16, amount: Math.round(1700 * (0.7 + (monthOffset % 4) * 0.2)), merchant: 'Demo Personal', categoryId: root('Personal'), subcategoryId: await sub('Personal', monthOffset % 2 ? 'Personal Care' : 'Hobbies'), accountId: card },
      { day: 20, amount: Math.round(950 * (0.6 + ((monthOffset + 3) % 5) * 0.22)), merchant: 'Demo Utility', categoryId: root('Housing'), subcategoryId: await sub('Housing', monthOffset % 2 ? 'Electricity' : 'Internet'), accountId: bank },
      { day: 24, amount: Math.round(3200 * (0.5 + ((monthOffset + 1) % 5) * 0.3)), merchant: monthOffset % 4 === 0 ? 'Demo Weekend Trip' : 'Demo Shopping', categoryId: monthOffset % 4 === 0 ? root('Travel') : shopping, subcategoryId: await sub(monthOffset % 4 === 0 ? 'Travel' : 'Shopping', monthOffset % 4 === 0 ? 'Activities' : 'Electronics'), accountId: card },
    ];

    for (const [index, item] of items.entries()) {
      const d = new Date(base.getFullYear(), base.getMonth(), Math.min(item.day, 28), 10 + (index % 8), (index * 7) % 60, 0);
      await db.transactions.put({
        id: `demo-txn-${ym}-${index}`, type: 'EXPENSE', amount: item.amount, transactionDateTime: d.toISOString(),
        accountId: item.accountId, categoryId: item.categoryId, subcategoryId: item.subcategoryId,
        merchant: item.merchant, source: 'IMPORT', createdAt: d.toISOString(), updatedAt: d.toISOString(), syncStatus: 'LOCAL'
      });
    }

    const salary = new Date(base.getFullYear(), base.getMonth(), 1, 9, 0, 0);
    await db.transactions.put({
      id: `demo-income-${ym}`, type: 'INCOME', amount: Math.round((85000 + ((monthOffset * 1250) % 6000)) * (monthOffset === 0 ? 1 : 1)),
      transactionDateTime: salary.toISOString(), accountId: bank, categoryId: income,
      subcategoryId: await sub('Income', 'Salary'), merchant: 'Demo Salary', source: 'IMPORT',
      createdAt: salary.toISOString(), updatedAt: salary.toISOString(), syncStatus: 'LOCAL'
    });

    // A monthly investment contribution is kept separate from ordinary spend.
    const investmentDate = new Date(base.getFullYear(), base.getMonth(), 12, 11, 0, 0);
    await db.investments.put({
      id: `demo-investment-${ym}`, date: investmentDate.toISOString(), name: 'Demo Index SIP', assetType: 'SIP',
      type: 'CONTRIBUTION', amount: Math.round(5000 * (0.8 + (monthOffset % 4) * 0.15)), accountId: bank,
      notes: 'Demo data', createdAt: investmentDate.toISOString(), updatedAt: investmentDate.toISOString(), syncStatus: 'LOCAL'
    });
  }

  // Budget history demonstrates that changing a budget creates a new effective period rather than rewriting older months.
  const budgetRoot = root('Food & Dining');
  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const base = new Date(nowDate.getFullYear(), nowDate.getMonth() - monthOffset, 1);
    const start = base.toISOString();
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    const monthlyAmount = 52000 + ((monthOffset * 1800) % 9000);
    await db.budgets.put({ id: `demo-budget-overall-${ymKey(base)}`, amount: monthlyAmount, period: 'MONTHLY', startDate: start, endDate: end, createdAt: start, updatedAt: start });
    await db.budgets.put({ id: `demo-budget-food-${ymKey(base)}`, categoryId: budgetRoot, amount: 10000 + ((monthOffset * 500) % 2500), period: 'MONTHLY', startDate: start, endDate: end, createdAt: start, updatedAt: start });
  }

  // A few recurring rules exercise monthly, weekly and bi-weekly scheduling.
  const rules: Array<RecurringRule> = [
    { id: 'demo-rule-rent', name: 'Demo Rent', amount: 22000, type: 'EXPENSE', accountId: bank, categoryId: root('Housing'), subcategoryId: await sub('Housing', 'Rent'), frequency: 'MONTHLY', dayOfMonth: 5, startDate: new Date(nowDate.getFullYear(), nowDate.getMonth() - 2, 5).toISOString(), nextDueDate: new Date(nowDate.getFullYear(), nowDate.getMonth(), 5).toISOString(), active: true, createdAt: nowDate.toISOString(), updatedAt: nowDate.toISOString() },
    { id: 'demo-rule-groceries', name: 'Demo Weekly Groceries', amount: 1200, type: 'EXPENSE', accountId: bank, categoryId: food, subcategoryId: await sub('Food & Dining', 'Groceries'), frequency: 'WEEKLY', dayOfWeek: 6, startDate: new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).toISOString(), nextDueDate: nowDate.toISOString(), active: true, createdAt: nowDate.toISOString(), updatedAt: nowDate.toISOString() },
    { id: 'demo-rule-investment', name: 'Demo Bi-weekly Investment', amount: 2500, type: 'EXPENSE', accountId: bank, categoryId: root('Investments'), subcategoryId: await sub('Investments', 'Mutual Funds'), frequency: 'BIWEEKLY', dayOfWeek: nowDate.getDay(), startDate: new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).toISOString(), nextDueDate: nowDate.toISOString(), active: true, createdAt: nowDate.toISOString(), updatedAt: nowDate.toISOString() },
  ];
  await db.recurringRules.bulkPut(rules);
}

function ymKey(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`; }

export async function resetDemoData(): Promise<void> {
  if (typeof localStorage === 'undefined' || localStorage.getItem('expense-tracker-active-partition') !== 'demo') throw new Error('Demo reset is only available in the Demo partition.');
  await db.transaction('rw', [db.transactions, db.accounts, db.categories, db.recurringRules, db.reviewQueue, db.budgets, db.investments, db.interestDeposits, db.syncQueue, db.settings], async () => {
    await db.transactions.clear(); await db.accounts.clear(); await db.categories.clear(); await db.recurringRules.clear(); await db.reviewQueue.clear(); await db.budgets.clear(); await db.investments.clear(); await db.interestDeposits.clear(); await db.syncQueue.clear(); await db.settings.clear();
    await db.accounts.bulkAdd(defaultAccounts); await db.categories.bulkAdd(buildCategories());
    await db.settings.put({ id: 'app', currency: 'INR', defaultAccountId: 'account-hdfc-bank', theme: 'dark', reportingYear: 'FY', googleSheetsEnabled: false });
  });
  await seedDemoTransactions();
}

export async function ensureSeedData(): Promise<void> {
  if ((await db.accounts.count()) === 0) await db.accounts.bulkAdd(defaultAccounts);
  if ((await db.categories.count()) === 0) await db.categories.bulkAdd(buildCategories());
  if (!(await db.accounts.filter(a => a.active && a.isDefault).count())) await db.accounts.update('account-hdfc-bank', { isDefault: true });
  if (!(await db.settings.get('app'))) {
    const settings: AppSettings = { id: 'app', currency: 'INR', defaultAccountId: 'account-hdfc-bank', theme: 'dark', reportingYear: 'FY', googleSheetsEnabled: false };
    await db.settings.put(settings);
  }
  const currentSettings = await db.settings.get('app');
  if (currentSettings && !currentSettings.reportingYear) await db.settings.put({...currentSettings, reportingYear:'FY', theme:currentSettings.theme||'dark'});
  // Demo partition is intentionally populated on every fresh demo database.
  if (typeof localStorage !== 'undefined' && localStorage.getItem('expense-tracker-active-partition') === 'demo') await seedDemoTransactions();

  // Repair older installations that had categories without subcategories.
  const categoryCount = await db.categories.count();
  if (categoryCount < 30) {
    const existing = await db.categories.toArray();
    const names = new Set(existing.map(c => c.name));
    const missing = buildCategories().filter(c => !names.has(c.name) || (c.parentId && !existing.some(e => e.id === c.id)));
    if (missing.length) await db.categories.bulkAdd(missing);
  }
}

export { newId };
