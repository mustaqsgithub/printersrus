# Project: PrintersRUs E-Commerce

## Test Commands

| Command | Description |
|---|---|
| `npm test` | Run **all** Playwright tests (smoke + integration + visual) |
| `npm run test:smoke` | Smoke tests – UI page loads, navigation, cart, checkout flow |
| `npm run test:integration` | Integration tests – API-level auth, cart, checkout, payments, notifications |
| `npm run test:visual` | Visual regression tests – screenshot comparisons (local baselines) |
| `npm run test:applitools` | Applitools Eyes visual tests – requires `APPLITOOLS_API_KEY` env var |

### Applitools Setup

1. Set your API key: `export APPLITOOLS_API_KEY=<your-key>`
2. Run: `npm run test:applitools`
3. For Ultrafast Grid (cross-browser): `USE_ULTRAFAST_GRID=true npm run test:applitools`

## Dev Server

```bash
npm run dev          # starts on http://localhost:3000
```

## Database

- SQLite at `data/printers.db`
- Seed: `npm run db:seed`
