/**
 * Personal Finance Tracker — Apps Script backend
 *
 * This script is bound to a Google Sheet and deployed as a Web App.
 * It is the entire "backend": persistence (the Sheet) + API (doGet/doPost).
 *
 * SETUP (one time):
 *   1. Create a new Google Sheet.
 *   2. Extensions > Apps Script, paste this file in as Code.gs.
 *   3. Run the `setup` function once (Run menu). It will ask for permissions —
 *      approve them. This creates all tabs, headers, and seed categories.
 *   4. Run `generateApiToken` once. Copy the token it logs (View > Logs) —
 *      this is your secret. Put it in frontend/.env and the iOS Shortcut.
 *   5. Deploy > New deployment > type "Web app".
 *        Execute as: Me
 *        Who has access: Anyone
 *      Copy the deployment URL — this is your API base URL.
 *   6. Re-run "Deploy > Manage deployments > Edit" and create a new version
 *      any time you change this file — Apps Script doesn't auto-update a
 *      live deployment.
 */

// ---------- Config ----------

const SHEET_NAMES = {
  TRANSACTIONS: 'Transactions',
  CATEGORIES: 'Categories',
  SUBCATEGORIES: 'Subcategories',
  ACCOUNTS: 'Accounts',
};

const TRANSACTION_HEADERS = [
  'transactionId', 'date', 'transactionType', 'categoryId', 'subcategoryId',
  'amount', 'currency', 'accountId', 'merchantName', 'description',
  'needWant', 'essentialDiscretionary', 'fixedVariable', 'tags', 'notes',
  'source', 'active', 'createdAt',
];

const CATEGORY_HEADERS = ['categoryId', 'displayName', 'nature', 'active', 'sortOrder'];
const SUBCATEGORY_HEADERS = ['subcategoryId', 'categoryId', 'displayName', 'active', 'sortOrder'];
const ACCOUNT_HEADERS = ['accountId', 'displayName', 'type', 'active'];

// India-relevant seed set, trimmed from the original spec. Fully editable
// later from the Sheet itself — these are just a sensible starting point.
const SEED_CATEGORIES = [
  { id: 'C001', name: 'Housing', nature: 'EXPENSE', subs: ['Rent', 'Maintenance/Society Fees', 'Electricity', 'Water', 'Gas', 'Internet', 'Mobile', 'Repairs'] },
  { id: 'C002', name: 'Food & Dining', nature: 'EXPENSE', subs: ['Groceries', 'Restaurants', 'Cafes', 'Food Delivery', 'Snacks'] },
  { id: 'C003', name: 'Transportation', nature: 'EXPENSE', subs: ['Fuel', 'Metro/Public Transport', 'Taxi/Ride Sharing', 'Parking', 'Toll', 'Vehicle Maintenance'] },
  { id: 'C004', name: 'Shopping', nature: 'EXPENSE', subs: ['Clothing', 'Electronics', 'Online Shopping', 'Gifts', 'Other Shopping'] },
  { id: 'C005', name: 'Health', nature: 'EXPENSE', subs: ['Doctor', 'Pharmacy', 'Diagnostics', 'Health Insurance', 'Fitness'] },
  { id: 'C006', name: 'Personal', nature: 'EXPENSE', subs: ['Personal Care', 'Salon/Grooming', 'Hobbies', 'Education/Courses'] },
  { id: 'C007', name: 'Entertainment', nature: 'EXPENSE', subs: ['Movies', 'Streaming', 'Events', 'Sports/Recreation'] },
  { id: 'C008', name: 'Travel', nature: 'EXPENSE', subs: ['Flights', 'Hotels', 'Local Transport', 'Travel Food', 'Activities'] },
  { id: 'C009', name: 'Family', nature: 'EXPENSE', subs: ['Parents', 'Children', 'Family Support', 'Family Events'] },
  { id: 'C010', name: 'Financial', nature: 'EXPENSE', subs: ['Bank Charges', 'Credit Card Fees', 'Loan Interest', 'Taxes', 'EMI'] },
  { id: 'C011', name: 'Investments', nature: 'INVESTMENT', subs: ['Stocks', 'Mutual Funds', 'SIP', 'Fixed Deposits', 'Gold', 'Retirement/PF'] },
  { id: 'C012', name: 'Income', nature: 'INCOME', subs: ['Salary', 'Bonus', 'Freelance', 'Interest', 'Dividends', 'Refund', 'Other Income'] },
  { id: 'C013', name: 'Miscellaneous', nature: 'EXPENSE', subs: ['Uncategorized', 'Other'] },
];

// ---------- One-time setup ----------

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const txSheet = getOrCreateSheet_(ss, SHEET_NAMES.TRANSACTIONS);
  writeHeadersIfEmpty_(txSheet, TRANSACTION_HEADERS);

  const catSheet = getOrCreateSheet_(ss, SHEET_NAMES.CATEGORIES);
  writeHeadersIfEmpty_(catSheet, CATEGORY_HEADERS);

  const subSheet = getOrCreateSheet_(ss, SHEET_NAMES.SUBCATEGORIES);
  writeHeadersIfEmpty_(subSheet, SUBCATEGORY_HEADERS);

  const acctSheet = getOrCreateSheet_(ss, SHEET_NAMES.ACCOUNTS);
  writeHeadersIfEmpty_(acctSheet, ACCOUNT_HEADERS);

  // Seed categories/subcategories only if the Categories sheet is empty.
  if (catSheet.getLastRow() <= 1) {
    let sortOrder = 1;
    SEED_CATEGORIES.forEach((cat) => {
      catSheet.appendRow([cat.id, cat.name, cat.nature, true, sortOrder]);
      let subOrder = 1;
      cat.subs.forEach((subName) => {
        const subId = `${cat.id}-S${String(subOrder).padStart(2, '0')}`;
        subSheet.appendRow([subId, cat.id, subName, true, subOrder]);
        subOrder++;
      });
      sortOrder++;
    });
  }

  addHelperColumns_(txSheet);
  setupDashboardSheet_(ss);

  if (acctSheet.getLastRow() <= 1) {
    acctSheet.appendRow(['A001', 'Cash', 'CASH', true]);
    acctSheet.appendRow(['A002', 'Primary Bank Account', 'BANK', true]);
    acctSheet.appendRow(['A003', 'Credit Card', 'CREDIT_CARD', true]);
  }

  Logger.log('Setup complete. Sheets created and categories seeded.');
}

/**
 * Adds two live-formula helper columns to Transactions so the raw Sheet can
 * be read/queried on its own, without the app: S = yearMonth (YYYY-MM,
 * derived from the date column), T = categoryName (looked up from
 * Categories, so the Sheet doesn't only show cryptic categoryIds). Both are
 * ARRAYFORMULAs, so they auto-extend to any row the API appends later —
 * no need to re-run this after adding transactions.
 */
function addHelperColumns_(txSheet) {
  const sHeader = txSheet.getRange('S1').getValue();
  if (sHeader !== 'yearMonth (auto)') {
    txSheet.getRange('S1').setValue('yearMonth (auto)');
    txSheet.getRange('S2').setFormula('=ARRAYFORMULA(IF($B2:$B="","",LEFT($B2:$B,7)))');
  }
  const tHeader = txSheet.getRange('T1').getValue();
  if (tHeader !== 'categoryName (auto)') {
    txSheet.getRange('T1').setValue('categoryName (auto)');
    txSheet.getRange('T2').setFormula(
      '=ARRAYFORMULA(IF($D2:$D="","",IFERROR(VLOOKUP($D2:$D,Categories!$A:$B,2,FALSE),$D2:$D)))'
    );
  }
  txSheet.hideColumns(19, 2); // S:T — helper columns, kept out of the way visually
}

/**
 * Creates a "Dashboard" tab driven entirely by live Sheet formulas (SUMIFS +
 * QUERY) reading from Transactions — no Apps Script execution needed to
 * refresh it, so it stays current even if you never open the web app. Safe
 * to re-run: skips creation if the tab already exists.
 */
function setupDashboardSheet_(ss) {
  let sheet = ss.getSheetByName('Dashboard');
  if (sheet) return; // already set up — don't clobber any manual edits

  sheet = ss.insertSheet('Dashboard', 0); // put it first/leftmost

  sheet.getRange('A1').setValue('Dashboard').setFontSize(18).setFontWeight('bold');

  sheet.getRange('A3').setValue('Month (YYYY-MM):');
  sheet.getRange('B3').setFormula('=TEXT(TODAY(),"yyyy-mm")');
  sheet.getRange('A3:B3').setFontWeight('bold');
  sheet.getRange('B3').setNote('Type over this with any past month, e.g. 2026-06, to see that month instead.');

  sheet.getRange('A5:E5').setValues([['Income', 'Expense', 'Investment', 'Savings', 'Savings %']]);
  sheet.getRange('A5:E5').setFontWeight('bold');
  sheet.getRange('A6').setFormula(
    '=SUMIFS(Transactions!F:F,Transactions!C:C,"INCOME",Transactions!S:S,$B$3,Transactions!Q:Q,TRUE)'
  );
  sheet.getRange('B6').setFormula(
    '=SUMIFS(Transactions!F:F,Transactions!C:C,"EXPENSE",Transactions!S:S,$B$3,Transactions!Q:Q,TRUE)'
  );
  sheet.getRange('C6').setFormula(
    '=SUMIFS(Transactions!F:F,Transactions!C:C,"INVESTMENT",Transactions!S:S,$B$3,Transactions!Q:Q,TRUE)'
  );
  sheet.getRange('D6').setFormula('=A6-B6-C6');
  sheet.getRange('E6').setFormula('=IF(A6=0,0,D6/A6)');
  sheet.getRange('E6').setNumberFormat('0.0%');
  sheet.getRange('A6:D6').setNumberFormat('₹#,##0');

  sheet.getRange('A8').setValue('Category Breakdown (selected month)').setFontWeight('bold');
  sheet.getRange('A9:B9').setValues([['Category', 'Amount']]);
  sheet.getRange('A9:B9').setFontWeight('bold');
  sheet.getRange('A10').setFormula(
    '=IFERROR(QUERY(Transactions!A2:T,' +
      '"select T, sum(F) where C=\'EXPENSE\' and S=\'"&$B$3&"\' and Q=true ' +
      'group by T order by sum(F) desc label T \'Category\', sum(F) \'Amount\'",0),"No expenses this month")'
  );

  sheet.setColumnWidths(1, 5, 140);

  const chart = sheet
    .newChart()
    .asColumnChart()
    .addRange(sheet.getRange('A10:B30'))
    .setPosition(5, 7, 0, 0)
    .setOption('title', 'Expense by Category')
    .setOption('legend', { position: 'none' })
    .build();
  sheet.insertChart(chart);
}

function generateApiToken() {
  const token = Utilities.getUuid() + Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('API_TOKEN', token);
  Logger.log('Your API token (copy this, it will not be shown again automatically):');
  Logger.log(token);
}

// ---------- HTTP entry points ----------

function doGet(e) {
  try {
    checkToken_(e.parameter.token);
    const action = e.parameter.action;

    switch (action) {
      case 'categories':
        return jsonResponse_(getCategoriesWithSubcategories_());
      case 'accounts':
        return jsonResponse_(getAccounts_());
      case 'transactions':
        return jsonResponse_(getTransactions_(e.parameter));
      case 'monthlySummary':
        return jsonResponse_(getMonthlySummary_(e.parameter.month));
      default:
        return jsonResponse_({ error: 'Unknown action: ' + action }, 400);
    }
  } catch (err) {
    return jsonResponse_({ error: err.message }, err.httpStatus || 500);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    checkToken_(body.token);

    switch (body.action) {
      case 'addTransaction':
        return jsonResponse_(addTransaction_(body.transaction));
      case 'updateTransaction':
        return jsonResponse_(updateTransaction_(body.transactionId, body.updates));
      case 'deleteTransaction':
        return jsonResponse_(deleteTransaction_(body.transactionId));
      default:
        return jsonResponse_({ error: 'Unknown action: ' + body.action }, 400);
    }
  } catch (err) {
    return jsonResponse_({ error: err.message }, err.httpStatus || 500);
  }
}

// ---------- Auth ----------

function checkToken_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  if (!expected) {
    const e = new Error('Server has no API_TOKEN configured. Run generateApiToken() once.');
    e.httpStatus = 500;
    throw e;
  }
  if (token !== expected) {
    const e = new Error('Invalid or missing token');
    e.httpStatus = 401;
    throw e;
  }
}

// ---------- Categories / Accounts ----------

function getCategoriesWithSubcategories_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const categories = sheetToObjects_(getOrCreateSheet_(ss, SHEET_NAMES.CATEGORIES));
  const subcategories = sheetToObjects_(getOrCreateSheet_(ss, SHEET_NAMES.SUBCATEGORIES));

  return categories
    .filter((c) => c.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({
      ...c,
      subcategories: subcategories
        .filter((s) => s.categoryId === c.categoryId && s.active)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
}

function getAccounts_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return sheetToObjects_(getOrCreateSheet_(ss, SHEET_NAMES.ACCOUNTS)).filter((a) => a.active);
}

// ---------- Transactions ----------

function addTransaction_(tx) {
  if (!tx || !tx.date || !tx.amount || !tx.categoryId || !tx.accountId || !tx.transactionType) {
    const e = new Error('Missing required field: date, amount, categoryId, accountId, transactionType are required');
    e.httpStatus = 400;
    throw e;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet_(ss, SHEET_NAMES.TRANSACTIONS);
  const transactionId = 'TXN-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  const now = new Date().toISOString();

  const row = TRANSACTION_HEADERS.map((h) => {
    if (h === 'transactionId') return transactionId;
    if (h === 'active') return true;
    if (h === 'createdAt') return now;
    if (h === 'tags') return Array.isArray(tx.tags) ? tx.tags.join(',') : (tx.tags || '');
    return tx[h] !== undefined ? tx[h] : '';
  });

  sheet.appendRow(row);
  return { transactionId, createdAt: now, ...tx };
}

function updateTransaction_(transactionId, updates) {
  if (!transactionId) {
    const e = new Error('transactionId is required');
    e.httpStatus = 400;
    throw e;
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet_(ss, SHEET_NAMES.TRANSACTIONS);
  const { rowIndex, headers } = findRowById_(sheet, 'transactionId', transactionId);

  if (rowIndex === -1) {
    const e = new Error('Transaction not found: ' + transactionId);
    e.httpStatus = 404;
    throw e;
  }

  Object.keys(updates || {}).forEach((key) => {
    const colIndex = headers.indexOf(key);
    if (colIndex !== -1) {
      const value = key === 'tags' && Array.isArray(updates[key]) ? updates[key].join(',') : updates[key];
      sheet.getRange(rowIndex, colIndex + 1).setValue(value);
    }
  });

  return { transactionId, updated: true };
}

function deleteTransaction_(transactionId) {
  // Soft delete — preserves history per the "never break historical data" principle.
  return updateTransaction_(transactionId, { active: false });
}

function getTransactions_(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet_(ss, SHEET_NAMES.TRANSACTIONS);
  let transactions = sheetToObjects_(sheet).filter((t) => t.active !== false);

  if (params.from) {
    transactions = transactions.filter((t) => t.date >= params.from);
  }
  if (params.to) {
    transactions = transactions.filter((t) => t.date <= params.to);
  }
  if (params.categoryId) {
    transactions = transactions.filter((t) => t.categoryId === params.categoryId);
  }

  transactions.sort((a, b) => (a.date < b.date ? 1 : -1));

  const limit = params.limit ? parseInt(params.limit, 10) : 200;
  return transactions.slice(0, limit);
}

function getMonthlySummary_(month) {
  // month format: "2026-08"
  if (!month) {
    const e = new Error('month parameter is required, format YYYY-MM');
    e.httpStatus = 400;
    throw e;
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet_(ss, SHEET_NAMES.TRANSACTIONS);
  const categories = sheetToObjects_(getOrCreateSheet_(ss, SHEET_NAMES.CATEGORIES));
  const categoryNameById = {};
  categories.forEach((c) => { categoryNameById[c.categoryId] = c.displayName; });

  const transactions = sheetToObjects_(sheet).filter(
    (t) => t.active !== false && String(t.date).startsWith(month)
  );

  let totalIncome = 0;
  let totalExpense = 0;
  let totalInvestment = 0;
  const byCategory = {};

  transactions.forEach((t) => {
    const amount = Number(t.amount) || 0;
    if (t.transactionType === 'INCOME') totalIncome += amount;
    else if (t.transactionType === 'INVESTMENT') totalInvestment += amount;
    else if (t.transactionType === 'EXPENSE') {
      totalExpense += amount;
      const name = categoryNameById[t.categoryId] || t.categoryId || 'Uncategorized';
      byCategory[name] = (byCategory[name] || 0) + amount;
    }
  });

  const categoryBreakdown = Object.keys(byCategory)
    .map((name) => ({ category: name, amount: byCategory[name] }))
    .sort((a, b) => b.amount - a.amount);

  return {
    month,
    totalIncome,
    totalExpense,
    totalInvestment,
    savings: totalIncome - totalExpense - totalInvestment,
    transactionCount: transactions.length,
    categoryBreakdown,
  };
}

// ---------- Sheet helpers ----------

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function writeHeadersIfEmpty_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
}

function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function findRowById_(sheet, idColumnName, idValue) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idColIndex = headers.indexOf(idColumnName);
  for (let i = 1; i < values.length; i++) {
    if (values[i][idColIndex] === idValue) {
      return { rowIndex: i + 1, headers }; // +1: sheet rows are 1-indexed
    }
  }
  return { rowIndex: -1, headers };
}

function jsonResponse_(data, status) {
  // Note: Apps Script Web Apps always return HTTP 200 at the transport level —
  // there's no way to set a real status code. We still pass `status` through
  // in the body so the frontend can check `data.error` and treat it as a
  // failure even though the HTTP layer says 200.
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
