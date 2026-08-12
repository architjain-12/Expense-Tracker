# Google Apps Script setup

## 1. Create a private Google Spreadsheet

Create a spreadsheet such as `Expense Tracker Cloud`.

The script creates these sheets on demand:

- Transactions
- Accounts
- Categories
- RecurringRules
- Budgets
- Investments

## 2. Create the Apps Script

Google Sheets → Extensions → Apps Script.

Replace the generated file with `Code.gs` from this folder.

## 3. Configure the script

Change only the Apps Script project's private copy:

```js
const CONFIG = {
  SHEET_ID: 'YOUR_PRIVATE_SPREADSHEET_ID',
  SYNC_TOKEN: 'YOUR_PRIVATE_SYNC_TOKEN',
};
```

Do not commit the real values to GitHub.

## 4. Deploy

Deploy → New deployment → Web app.

Recommended access for a personal project depends on your Google account/security requirements. The app's sync token provides an additional application-level check.

Copy the `/exec` URL.

## 5. Connect from the PWA

Open:

```text
Options → Settings → Google Sheets
```

Enter:

- Apps Script endpoint
- Sync token

Press **Save connection**.

Then press **Sync now**.

## 6. Smart restore

The app can call:

```text
GET /exec?action=RESTORE_ALL&token=...
```

If an existing local database contains no transactions and a valid saved Google Sheets connection exists, the app attempts an automatic restore once per browser session.

A manual restore is always available under Settings.

## 7. Important security note

A token stored in a browser is not a secure secret vault. The purpose of runtime configuration is to keep your personal URL/token out of the public GitHub repository. The Apps Script endpoint must still validate inputs and the token. A future server-backed implementation can provide stronger authentication.
