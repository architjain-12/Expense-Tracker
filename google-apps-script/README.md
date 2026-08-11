# Deploying the backend

This is the entire "server" — Google hosts it for free, you never manage
infrastructure.

## 1. Create the Sheet + script

1. Go to sheets.google.com → create a new blank spreadsheet. Rename it
   something like "Personal Finance Tracker".
2. Extensions → Apps Script. Delete the default empty `Code.gs` content and
   paste in this repo's `Code.gs`.
3. Save (Ctrl/Cmd+S), name the project e.g. "finance-api".

## 2. Run setup once

1. In the Apps Script editor toolbar, select the function dropdown → `setup`.
2. Click Run. The first time, Google will ask you to authorize the script —
   approve it (it's your own script touching your own Sheet).
3. Check the Sheet — you should now see tabs: Dashboard, Transactions,
   Categories, Subcategories, Accounts, with Categories/Subcategories
   pre-filled and three starter Accounts (Cash, Bank, Credit Card) — edit
   these to match your actual accounts.

The **Dashboard** tab is entirely live Sheet formulas (no script needed to
refresh it) — a month cell you can type over, income/expense/investment/
savings totals, a category breakdown table, and a native bar chart. This is
your "check it without the app" view: open the Sheet on your phone's Sheets
app or in any browser and it's always current, since every add/edit the web
app or Shortcut makes is a normal row write.

## 3. Generate your API token

1. Function dropdown → `generateApiToken`. Run it.
2. View → Logs (or Ctrl+Enter). Copy the long token string shown.
3. This token is stored server-side in Script Properties — it never lives
   in the Sheet itself. Treat it like a password: it's the only thing
   standing between the public internet and your data.

## 4. Deploy as a Web App

1. Deploy → New deployment.
2. Click the gear icon next to "Select type" → Web app.
3. Description: anything. Execute as: **Me**. Who has access: **Anyone**.
   (This has to be "Anyone" so the iOS Shortcut can call it without an
   interactive Google login — see the security note in
   `docs/ARCHITECTURE.md` for what this trades off.)
4. Deploy. Copy the Web App URL — it looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`
5. This URL + your token go into `frontend/.env` (see frontend README) and
   into the iOS Shortcut.

## Redeploying after changes

Editing `Code.gs` does **not** update a live deployment. After any change:
Deploy → Manage deployments → pick the active deployment → pencil icon →
Version: "New version" → Deploy. The URL stays the same.

## Testing it directly

```
https://script.google.com/macros/s/YOUR_ID/exec?action=categories&token=YOUR_TOKEN
```
Paste that in a browser — you should get back JSON with your seeded
categories.
