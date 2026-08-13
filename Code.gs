/**
 * Expense Tracker Google Apps Script API.
 *
 * Google Sheets is a cloud/reporting layer. IndexedDB remains the local source
 * of truth for the React app. Keep SHEET_ID and SYNC_TOKEN private.
 */
const CONFIG = { SHEET_ID: 'REPLACE_ME', SYNC_TOKEN: 'REPLACE_ME' };

function doGet(e) {
  try {
    authenticate(e);
    const action = (e && e.parameter && e.parameter.action) || 'HEALTH';
    if (action === 'RESTORE_ALL') return json(restoreAll());
    if (action === 'GET_RECOVERY') return json(getRecovery());
    return json({ success: true, service: 'expense-tracker', time: new Date().toISOString() });
  } catch (err) { return json({ success: false, message: String(err) }); }
}

function doPost(e) {
  try {
    authenticate(e);
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'BATCH_SYNC') return json(batchSync(body.changes || []));
    if (body.action === 'RESTORE_ALL') return json(restoreAll());
    if (body.action === 'SET_RECOVERY') return json(setRecovery(body.recoveryHash || ''));
    if (body.action === 'GET_RECOVERY') return json(getRecovery());
    return json({ success: false, message: 'Unknown action' });
  } catch (err) { return json({ success: false, message: String(err) }); }
}

function authenticate(e) {
  if (CONFIG.SYNC_TOKEN === 'REPLACE_ME') return;
  const auth = (e && e.parameter && e.parameter.token) || '';
  const headerToken = e && e.headers ? (e.headers.Authorization || '') : '';
  if (auth !== CONFIG.SYNC_TOKEN && headerToken !== 'Bearer ' + CONFIG.SYNC_TOKEN) throw new Error('Unauthorized');
}


function getRecovery() {
  const props = PropertiesService.getScriptProperties();
  return { success:true, recoveryHash: props.getProperty('PIN_RECOVERY_HASH') || '' };
}
function setRecovery(hash) {
  if (!hash) throw new Error('Missing recovery hash');
  PropertiesService.getScriptProperties().setProperty('PIN_RECOVERY_HASH', String(hash));
  return { success:true };
}

function batchSync(changes) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let processed = 0, failed = 0, errors = [];
  changes.forEach(change => {
    try {
      const entity = String(change.entityType || '');
      const row = change.payload || {};
      if (!change.entityId && !row.id) throw new Error('Missing entity ID');
      if (change.operation === 'DELETE') { deleteEntity(ss, sheetNameFor(entity), String(change.entityId || row.id)); processed++; return; }
      if (entity === 'TRANSACTION') upsertEntity(ss, 'Transactions', transactionHeaders(), row, ['id','transactionDateTime','type','amount','accountId','categoryId','subcategoryId','merchant','notes','source','recurringRuleId','createdAt','updatedAt','deletedAt']);
      else if (entity === 'CATEGORY') upsertEntity(ss, 'Categories', categoryHeaders(), row, ['id','name','parentId','icon','defaultNeedWant','defaultEssentialDiscretionary','defaultFixedVariable','active','sortOrder','createdAt','updatedAt']);
      else if (entity === 'ACCOUNT') upsertEntity(ss, 'Accounts', accountHeaders(), row, ['id','name','type','institution','lastFourDigits','isDefault','active','createdAt','updatedAt']);
      else if (entity === 'RECURRING_RULE') upsertEntity(ss, 'RecurringRules', recurringHeaders(), row, ['id','name','amount','type','accountId','categoryId','subcategoryId','merchant','notes','frequency','dayOfMonth','startDate','endDate','active','lastGeneratedDate','nextDueDate','createdAt','updatedAt']);
      else if (entity === 'BUDGET') upsertEntity(ss, 'Budgets', budgetHeaders(), row, ['id','categoryId','amount','period','startDate','endDate','createdAt','updatedAt']);
      else if (entity === 'INVESTMENT') upsertEntity(ss, 'Investments', investmentHeaders(), row, ['id','date','name','assetType','type','amount','accountId','notes','createdAt','updatedAt','syncStatus']);
      else if (entity === 'INTEREST_DEPOSIT') upsertEntity(ss, 'InterestDeposits', interestHeaders(), row, ['id','name','type','principal','installment','annualRate','openingDate','maturityDate','termMonths','compounding','accountId','autoRecordInterest','active','notes','createdAt','updatedAt']);
      else if (entity === 'REVIEW_QUEUE') upsertEntity(ss, 'ReviewQueue', reviewHeaders(), row, ['id','externalId','amount','type','merchant','accountHint','transactionDateTime','rawMessage','source','status','suggestedCategoryId','suggestedSubcategoryId','suggestedAccountId','notes','createdAt','processedAt']);
      else return;
      processed++;
    } catch (err) { failed++; errors.push(String(err)); }
  });
  return { success: failed === 0, processed, failed, errors };
}

function upsertEntity(ss, sheetName, headers, row, fields) {
  const sheet = getOrCreateSheet(ss, sheetName, headers);
  const id = String(row.id || ''); if (!id) throw new Error(sheetName + ': missing id');
  const map = existingRowMap(sheet);
  const values = fields.map(f => row[f] == null ? '' : row[f]);
  if (map[id]) sheet.getRange(map[id], 1, 1, values.length).setValues([values]);
  else sheet.appendRow(values);
}

function restoreAll() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  return {
    success: true,
    transactions: sheetObjects(ss.getSheetByName('Transactions'), transactionHeaders()),
    accounts: sheetObjects(ss.getSheetByName('Accounts'), accountHeaders()),
    categories: sheetObjects(ss.getSheetByName('Categories'), categoryHeaders()),
    recurringRules: sheetObjects(ss.getSheetByName('RecurringRules'), recurringHeaders()),
    budgets: sheetObjects(ss.getSheetByName('Budgets'), budgetHeaders()),
    investments: sheetObjects(ss.getSheetByName('Investments'), investmentHeaders()),
    interestDeposits: sheetObjects(ss.getSheetByName('InterestDeposits'), interestHeaders()),
    reviewQueue: sheetObjects(ss.getSheetByName('ReviewQueue'), reviewHeaders())
  };
}

function sheetObjects(sheet, headers) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  return rows.filter(row => row[0] !== '').map(row => {
    const object = {};
    headers.forEach((header, i) => object[header] = row[i]);
    return object;
  });
}

function sheetNameFor(entity) { const map = { TRANSACTION:'Transactions', CATEGORY:'Categories', ACCOUNT:'Accounts', RECURRING_RULE:'RecurringRules', BUDGET:'Budgets', INVESTMENT:'Investments', INTEREST_DEPOSIT:'InterestDeposits', REVIEW_QUEUE:'ReviewQueue' }; return map[entity] || entity; }
function deleteEntity(ss, sheetName, id) { const sheet=ss.getSheetByName(sheetName); if(!sheet) return; const map=existingRowMap(sheet); if(map[id]) sheet.deleteRow(map[id]); }

function existingRowMap(sheet) {
  const map = {}; const lastRow = sheet.getLastRow(); if (lastRow < 2) return map;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  ids.forEach((id, index) => { if (id !== '') map[String(id)] = index + 2; });
  return map;
}

function transactionHeaders() { return ['id','transactionDateTime','type','amount','accountId','categoryId','subcategoryId','merchant','notes','source','recurringRuleId','createdAt','updatedAt','deletedAt']; }
function categoryHeaders() { return ['id','name','parentId','icon','defaultNeedWant','defaultEssentialDiscretionary','defaultFixedVariable','active','sortOrder','createdAt','updatedAt']; }
function accountHeaders() { return ['id','name','type','institution','lastFourDigits','isDefault','active','createdAt','updatedAt']; }
function recurringHeaders() { return ['id','name','amount','type','accountId','categoryId','subcategoryId','merchant','notes','frequency','dayOfMonth','startDate','endDate','active','lastGeneratedDate','nextDueDate','createdAt','updatedAt']; }
function budgetHeaders() { return ['id','categoryId','amount','period','startDate','endDate','createdAt','updatedAt']; }
function investmentHeaders() { return ['id','date','name','assetType','type','amount','accountId','notes','createdAt','updatedAt','syncStatus']; }
function interestHeaders() { return ['id','name','type','principal','installment','annualRate','openingDate','maturityDate','termMonths','compounding','accountId','autoRecordInterest','active','notes','createdAt','updatedAt']; }
function reviewHeaders() { return ['id','externalId','amount','type','merchant','accountHint','transactionDateTime','rawMessage','source','status','suggestedCategoryId','suggestedSubcategoryId','suggestedAccountId','notes','createdAt','processedAt']; }

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name); if (!sheet) sheet = ss.insertSheet(name); if (sheet.getLastRow() === 0) sheet.appendRow(headers); return sheet;
}
function json(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
