# NOC IQ Frontend

Frontend application for the NOC IQ system.

This repository is the user-facing layer in the 3-repo system:

- `noc-iq-fe` -> frontend
- `noc-iq-be` -> backend and integration layer
- `noc-iq-contracts` -> Soroban smart contracts

System flow:

`User -> FE -> BE -> Contracts -> BE -> FE`

Important rule:

- the frontend does not talk to contracts directly
- all contract interaction must go through `noc-iq-be`

## Overview

`noc-iq-fe` is a Next.js frontend for viewing outages, reviewing SLA outcomes, and exposing payment and configuration screens.

The current codebase uses:

- Next.js 16
- React 19
- TypeScript
- Axios
- TanStack React Query
- TanStack Table
- Tailwind utilities and small local UI primitives

## Current App Surface

Active App Router routes live under `src/app`:

- `/` -> dashboard placeholder
- `/outages` -> outages list
- `/outages/[id]` -> outage details and resolve flow
- `/payments` -> payments placeholder
- `/config` -> SLA configuration page
- `/setting` -> settings placeholder

The shared shell and providers live in:

- `src/app/layout.tsx`
- `src/components/Navigation.tsx`
- `src/providers/react-query.tsx`

There is also older UI and service code under `src/pages` and some feature modules under `src/features`. That code is still present, but the main runtime entrypoints are the App Router pages above.

## Backend Integration

The frontend currently uses the backend API client in `src/lib/api.ts`.

At the moment, the base URL is configured in code as:

- `http://localhost:8000/api/v1/`

That means local development assumes the backend is running on port `8000`.

Main FE service modules:

- `src/services/outages.ts`
- `src/services/paymentService.ts`
- `src/services/dashboardService.ts`
- `src/services/exportService.ts`
- `src/services/bulkImportService.ts`

## Local Setup

### Prerequisites

- Node.js 20+ recommended
- npm
- running backend from `noc-iq-be`

### Install

```bash
npm install
```

### Run In Development

```bash
npm run dev
```

The app will be available at:

- `http://localhost:3000`

### Build

```bash
npm run build
```

### Start Production Build

```bash
npm run start
```

### Lint

```bash
npm run lint
```

## Expected Local Setup

For the frontend to function meaningfully, start the backend as well:

1. run `noc-iq-be`
2. ensure the backend API is reachable at `http://localhost:8000`
3. then run this frontend on `http://localhost:3000`

Without the backend, the app shell will load, but API-backed views such as outages, exports, bulk import, payments, and analytics will not have live data.

## Project Structure

```text
noc-iq-fe/
├── src/
│   ├── app/                  # Next.js App Router pages
│   ├── components/           # shared UI and dashboard components
│   ├── features/             # feature-specific UI/hooks
│   ├── hooks/                # shared hooks
│   ├── lib/                  # API client and shared helpers
│   ├── pages/                # older page-based screens still in repo
│   ├── providers/            # app providers
│   ├── services/             # backend-facing service modules
│   └── types/                # shared frontend types
├── public/
├── package.json
└── README.md
```

## Stabilized Baseline

As of the latest stabilization pass:

- `npm run build` passes
- `npm run lint` passes with one non-blocking warning from TanStack Table usage
- missing local UI primitives were restored
- stale `import.meta.env` usage was removed from active service modules
- outage pages were aligned more closely with the backend response shape

## Current Limitations

This repo is healthier than before, but still not a finished product surface.

Examples:

- `/payments` in `src/app` is still a placeholder page
- `/setting` is still a placeholder page
- `/` is still a simple dashboard placeholder
- the codebase still contains a mix of newer App Router pages and older page-style screens
- some frontend flows depend on backend endpoints that are still being stabilized in `noc-iq-be`

## Contributing Notes

When making frontend changes:

- preserve the system rule: FE calls BE, never contracts directly
- prefer updating the App Router implementation first
- keep API shapes aligned with `noc-iq-be`
- treat `src/services` and `src/lib/api.ts` as the integration boundary

## Related Repositories

- `noc-iq-be` -> backend application
- `noc-iq-contracts` -> Soroban smart contracts
