import { db } from './database';
import { newId } from '../utils/id';
import type { Account, AppSettings, Category } from '../types/models';

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

export async function ensureSeedData(): Promise<void> {
  if ((await db.accounts.count()) === 0) await db.accounts.bulkAdd(defaultAccounts);
  if ((await db.categories.count()) === 0) await db.categories.bulkAdd(buildCategories());
  if (!(await db.accounts.filter(a => a.active && a.isDefault).count())) await db.accounts.update('account-hdfc-bank', { isDefault: true });
  if (!(await db.settings.get('app'))) {
    const settings: AppSettings = { id: 'app', currency: 'INR', defaultAccountId: 'account-hdfc-bank', theme: 'dark', googleSheetsEnabled: false };
    await db.settings.put(settings);
  }

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
