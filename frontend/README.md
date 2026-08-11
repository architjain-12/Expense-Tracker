# Frontend

React + TypeScript + Vite PWA. Talks directly to the Apps Script backend —
no server of your own to run.

## Local setup

```bash
npm install
cp .env.example .env      # fill in VITE_API_BASE_URL and VITE_API_TOKEN
npm run dev
```

Open the printed localhost URL — works on your phone too if you're on the
same wifi (use your computer's LAN IP instead of localhost).

## Deploying free to GitHub Pages

1. Push this `frontend/` folder (or the whole repo) to a GitHub repo.
2. In `vite.config.ts`, set `REPO_NAME` to your actual repo name.
3. `npm install` (adds `gh-pages` as a dev dependency, already in package.json).
4. `npm run deploy` — builds and pushes `dist/` to a `gh-pages` branch.
5. In the GitHub repo settings → Pages → set source to the `gh-pages` branch.
6. Your app is now at `https://<your-username>.github.io/<repo-name>/`.

Because `.env` is not committed (it's gitignored), your token isn't in the
repo — but it *is* baked into the built JS bundle that ships to the browser,
per the security note in `docs/ARCHITECTURE.md`. If you want a private-ish
URL, keep the exact GitHub Pages URL out of anywhere public.

## Installing as an app on iPhone

Once deployed, open the URL in Safari → Share → "Add to Home Screen". This
gives you a standalone app icon (PWA), no App Store needed.

## What's not built yet

Budgets, Recurring/Subscriptions, Goals, Investments detail, Net Worth,
Merchants management, Yearly reports, Category management UI (edit via the
Google Sheet directly for now). Each follows the same pattern as
`features/transactions/` — a query hook + a form/list component + a route.
