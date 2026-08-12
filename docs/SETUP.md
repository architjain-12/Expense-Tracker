# Detailed setup guide

## Step 1 — Install Node.js

Install a current Node.js LTS release.

Verify:

```bash
node --version
npm --version
```

## Step 2 — Open the project

```bash
cd expense-tracker
```

## Step 3 — Install dependencies

```bash
npm install
```

## Step 4 — Start the app

```bash
npm run dev
```

Open the URL Vite prints.

## Step 5 — Test the local database

1. Open Home.
2. Tap **Add Transaction**.
3. Enter an amount.
4. Choose a category.
5. Record it.
6. Open Transactions.
7. Close the browser tab.
8. Open the app again.
9. Verify the transaction is still there.

This proves the transaction is stored in IndexedDB rather than React memory.

## Step 6 — Test recurring payments

Open:

```text
More → Recurring Payments
```

Create a test rule with a small amount and today's date. Restart the app and verify the generated transaction appears with the `↻` indicator.

## Step 7 — Test the automation importer

Create a text file called `transaction-queue.ndjson` with one JSON object per line:

```text
{"externalId":"demo-1","source":"IOS_SHORTCUT","type":"EXPENSE","amount":649,"currency":"INR","merchant":"Netflix","accountHint":"HDFC Credit Card","transactionDateTime":"2026-08-12T00:05:00+05:30","rawMessage":"INR 649 spent at Netflix"}
```

Open:

```text
Review → Sync Automation
```

Select the file.

The transaction should appear in Review Queue.

Click Record. It should now appear in Transactions.

## Step 8 — Test backup

Open:

```text
More → Backup & restore
```

Export JSON, then import it again.

## Step 9 — Google Sheets setup

Follow:

```text
google-apps-script/README.md
```

The checked-in Apps Script uses placeholders. Replace them only in the Apps Script project you deploy; do not commit your personal values.

## Step 10 — GitHub Pages

Push the project to GitHub on `main`.

The workflow in `.github/workflows/deploy.yml` builds the Vite app and deploys it to GitHub Pages.

Recommended GitHub setting:

```text
Repository → Settings → Pages → Source: GitHub Actions
```

After the workflow finishes, GitHub will show the Pages URL.

## Step 11 — Install on iPhone

1. Open the HTTPS GitHub Pages URL in Safari.
2. Use Share → Add to Home Screen.
3. Open the Home Screen app.
4. Record a transaction.
5. Close/reopen it.
6. Verify the transaction is still present.

## Step 12 — Important production tests

Before trusting the app with real financial data, test:

- offline entry
- reload persistence
- delete
- edit
- recurring generation
- duplicate automation import
- backup/restore
- Google Sheets sync
- iPhone Safari
- desktop Chrome

## If `npm install` fails

Check:

```bash
node --version
npm --version
```

Then delete `node_modules` and `package-lock.json` and retry:

```bash
rm -rf node_modules package-lock.json
npm install
```

Do not commit `node_modules`.
