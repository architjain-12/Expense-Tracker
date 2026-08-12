# Google Apps Script setup

1. Create a private Google Spreadsheet.
2. Open **Extensions → Apps Script**.
3. Replace the default script with `Code.gs` from this folder.
4. Set `CONFIG.SHEET_ID` to the spreadsheet ID from the Google Sheets URL.
5. Optionally set `CONFIG.SYNC_TOKEN` to a private random value.
6. Deploy → New deployment → Web app.
7. Execute as: **Me**.
8. Choose the access setting appropriate for your personal setup.
9. Copy the `/exec` URL.
10. Enter that URL at runtime in the React app under **More → Google Sheets**.

For a personal app, do not commit the real spreadsheet ID/token to GitHub. The checked-in file uses placeholders intentionally.
