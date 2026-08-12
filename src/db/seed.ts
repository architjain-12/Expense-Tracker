import { db } from './database';
import type { Account, Category, AppSettings } from '../types/models';

const now = new Date().toISOString();

const defaultAccounts: Account[] = [
  {
    id: 'account-hdfc-bank',
    name: 'HDFC Bank',
    type: 'BANK_ACCOUNT',
    institution: 'HDFC',
    isDefault: true,
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'account-hdfc-card',
    name: 'HDFC Credit Card',
    type: 'CREDIT_CARD',
    institution: 'HDFC',
    lastFourDigits: '1234',
    isDefault: false,
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'account-cash',
    name: 'Cash',
    type: 'CASH',
    isDefault: false,
    active: true,
    createdAt: now,
    updatedAt: now,
  },
];

const categoryNames = [
  ['Food', '🍽️'],
  ['Shopping', '🛍️'],
  ['Groceries', '🛒'],
  ['Transport', '🚗'],
  ['Bills', '🧾'],
  ['Entertainment', '🎬'],
  ['Health', '❤️'],
  ['Travel', '✈️'],
  ['Personal Care', '✨'],
  ['Education', '📚'],
  ['Other', '•••'],
] as const;

const defaultCategories: Category[] = categoryNames.map(([name, icon], index) => ({
  id: `category-${name.toLowerCase().replace(/\s+/g, '-')}`,
  name,
  icon,
  active: true,
  sortOrder: index,
  createdAt: now,
  updatedAt: now,
}));

const settings: AppSettings = {
  id: 'app',
  currency: 'INR',
  defaultAccountId: 'account-hdfc-bank',
  theme: 'dark',
  googleSheetsEnabled: false,
};

/** Seed only if the database is empty. */
export async function ensureSeedData(): Promise<void> {
  if ((await db.accounts.count()) === 0) {
    await db.accounts.bulkAdd(defaultAccounts);
  }

  if ((await db.categories.count()) === 0) {
    await db.categories.bulkAdd(defaultCategories);
  }

  if (!(await db.settings.get('app'))) {
    await db.settings.put(settings);
  }
}
