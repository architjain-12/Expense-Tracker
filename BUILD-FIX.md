# Build fix included in this revision

The deployment build errors were caused by three issues:

1. React/Node TypeScript declaration packages were missing.
2. `vite.config.ts` referenced `process.env`, which is not typed in the Vite config.
3. A few components relied on TypeScript control-flow narrowing inside nested functions.

This revision fixes these by:
- adding `@types/react`, `@types/react-dom`, and `@types/node`
- using Vite `loadEnv()` instead of `process.env`
- making local settings/transaction values explicitly narrowed
- keeping Recharts pie click handlers based on array indexes
- adding a GitHub Pages Actions workflow that runs `npm install` then `npm run build`

After extracting the project:

```bash
npm install
npm run build
```

The CI workflow uses `npm install` so a fresh lockfile update can be created by npm if the dependency declaration packages were not present in the original lockfile.
