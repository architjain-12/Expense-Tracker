# Frontend - beginner guide

## What each folder does

- `src/main.tsx`: starts React and enables React Query + routing.
- `src/App.tsx`: navigation and application pages.
- `src/api/client.ts`: every HTTP call to Apps Script.
- `src/types/finance.ts`: TypeScript data model matching Sheet columns.
- `src/features/transactions/`: transaction entry and transaction history.
- `src/features/dashboard/`: monthly dashboard.
- `src/features/reports/`: yearly reports and net worth.
- `src/features/manage/`: budgets, recurring items, subscriptions, goals, investments, assets, liabilities, merchants, categories, accounts and settings.
- `src/features/categories/useCategories.ts`: loads categories/accounts and caches them.
- `index.css`: mobile/desktop layout and visual styling.

## How to make a small frontend change

1. Find the screen in `src/features/`.
2. Change the JSX/text/class in that file.
3. Run `npm run build` locally.
4. Commit the change.
5. Push to `main`.
6. GitHub Actions runs `npm ci`, `npm run build` and deploys the result.
7. Open the GitHub Pages URL. Because the app is a PWA, refresh once if an older cached version is displayed.

## How to change categories/accounts

You no longer need to edit the Sheet manually for normal changes.

1. Open the app.
2. Open **Manage**.
3. Open **Categories** to add a category or subcategory.
4. Open **Accounts** to add an account.
5. The app writes to the corresponding Sheet and invalidates its cached query.
6. New values become available in the Add Transaction form.

You can still edit the Sheets directly. Use stable IDs and do not rename the ID columns.

## GitHub Actions secrets

In GitHub: Settings -> Secrets and variables -> Actions -> New repository secret.

Create:

- `VITE_API_BASE_URL`: Apps Script `/exec` URL.
- `VITE_API_TOKEN`: Script Properties API token.

Never commit `frontend/.env`.
