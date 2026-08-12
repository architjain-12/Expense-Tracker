/**
 * Expense Tracker Google Apps Script API
 *
 * This is intentionally small. React talks to this web app only when the user
 * chooses to sync. Google Sheets is a cloud reporting/backup layer; IndexedDB
 * remains the primary local application database.
 *
 * Before deploying, replace SHEET_ID with YOUR private spreadsheet ID.
 * Keep the optional SYNC_TOKEN private. Never commit a real token to Git.
 */

const CONFIG = {
  SHEET_ID: 'REPLACE_ME',
  SYNC_TOKEN: 'REPLACE_ME',
};

function doGet() {
  return json({ success: true, service: 'expense-tracker', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    if (CONFIG.SYNC_TOKEN !== 'REPLACE_ME') {
      const auth = (e && e.parameter && e.parameter.token) || '';
      const headerToken = e && e.headers ? e.headers.Authorization || '' : '';
      if (auth !== CONFIG.SYNC_TOKEN && headerToken !== 'Bearer ' + CONFIG.SYNC_TOKEN) {
        return json({ success: false, message: 'Unauthorized' });
      }
    }

    const body = JSON.parse(e.postData.contents || '{}');
    if (body.action === 'BATCH_SYNC') {
      return json(batchSync(body.changes || []));
    }

    return json({ success: false, message: 'Unknown action' });
  } catch (err) {
    return json({ success: false, message: String(err) });
  }
}

function batchSync(changes) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = getOrCreateSheet(ss, 'Transactions', [
    'ID', 'Date', 'Type', 'Amount', 'Account ID', 'Category ID', 'Subcategory ID',
    'Merchant', 'Notes', 'Source', 'Recurring Rule ID', 'Created At', 'Updated At', 'Deleted At'
  ]);

  const rowById = existingRowMap(sheet);
  let processed = 0;
  let failed = 0;
  const errors = [];

  changes.forEach(change => {
    try {
      if (change.entityType !== 'TRANSACTION') return;
      const row = change.payload || {};
      if (!row.id) throw new Error('Transaction missing id');

      const id = String(row.id);
      const sheetRow = rowById[id];

      if (change.operation === 'CREATE') {
        if (sheetRow) {
          processed++;
          return;
        }
        const values = transactionValues(row);
        sheet.appendRow(values);
        rowById[id] = sheet.getLastRow();
        processed++;
        return;
      }

      if (change.operation === 'UPDATE') {
        if (!sheetRow) {
          sheet.appendRow(transactionValues(row));
          rowById[id] = sheet.getLastRow();
        } else {
          sheet.getRange(sheetRow, 1, 1, 14).setValues([transactionValues(row)]);
        }
        processed++;
        return;
      }

      if (change.operation === 'DELETE') {
        if (sheetRow) {
          const existing = sheet.getRange(sheetRow, 1, 1, 14).getValues()[0];
          existing[13] = new Date().toISOString();
          sheet.getRange(sheetRow, 1, 1, 14).setValues([existing]);
        }
        processed++;
      }
    } catch (err) {
      failed++;
      errors.push(String(err));
    }
  });

  return { success: failed === 0, processed, failed, errors };
}

function transactionValues(row) {
  return [
    row.id,
    row.transactionDateTime || '',
    row.type || '',
    row.amount || 0,
    row.accountId || '',
    row.categoryId || '',
    row.subcategoryId || '',
    row.merchant || '',
    row.notes || '',
    row.source || '',
    row.recurringRuleId || '',
    row.createdAt || '',
    row.updatedAt || '',
    row.deletedAt || '',
  ];
}

function existingRowMap(sheet) {
  const map = {};
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return map;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  ids.forEach((id, index) => {
    if (id !== '') map[String(id)] = index + 2;
  });
  return map;
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
