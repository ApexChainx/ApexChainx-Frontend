# ApexChain Frontend

<div align="center">
  <strong>Enterprise Network Operations Intelligence Platform</strong>
  <br/>
  Real-time outage management, SLA enforcement, automated blockchain payments, and analytics.
  <br/>
  <br/>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green" />
</div>

<br/>

Frontend application for the ApexChain network operations intelligence system.

This repository is the user-facing layer in the 3-repo system:

- `apexchainx-frontend` → frontend (this repo)
- `apexchainx-backend` → backend and integration layer
- `apexchainx-contracts` → Soroban smart contracts

### System Flow

```
User → Frontend → Backend → Smart Contracts → Backend → Frontend
```

### Important Rule

- The frontend does not talk to contracts directly
- All contract interaction must go through `apexchainx-backend`

---

## Table of Contents

- [Overview](#overview)
- [Current App Surface](#current-app-surface)
- [Backend Integration](#backend-integration)
- [Local Setup](#local-setup)
- [Project Structure](#project-structure)
- [Stabilized Baseline](#stabilized-baseline)
- [Current Limitations](#current-limitations)
- [Contributing Notes](#contributing-notes)
- [Related Repositories](#related-repositories)

---

## Overview

`apexchainx-frontend` is a Next.js frontend for viewing outages, reviewing SLA outcomes, exposing payment and configuration screens, and managing webhooks and bulk data imports.

### Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Next.js 16** | React framework with App Router |
| **React 19** | UI component library |
| **TypeScript 5** | Type-safe development |
| **TanStack React Query** | Server state management and caching |
| **TanStack Table** | Data table with sorting, filtering, pagination |
| **Axios** | HTTP client for API communication |
| **Tailwind CSS 4** | Utility-first CSS framework |
| **Radix UI** | Unstyled, accessible UI primitives |
| **Vitest** | Unit and integration testing |

---

## Current App Surface

Active App Router routes live under `src/app`:

| Route | Description |
|-------|-------------|
| `/` | SLA dashboard with KPIs, trends, and analytics |
| `/outages` | Outages list with advanced filtering and export |
| `/outages/new` | Create new outage with validation |
| `/outages/[id]` | Outage details, timeline, resolution, and editing |
| `/payments` | Payment history and transaction tracking |
| `/config` | SLA configuration management |
| `/setting` | User and application settings |
| `/webhooks` | Webhook configuration and event management |
| `/bulk-import` | Bulk outage import with dry-run and history |
| `/login` | User authentication |
| `/register` | New user registration |

### Architecture & State Management

The shared shell and providers live in:

- `src/app/layout.tsx` — Root layout with providers
- `src/components/Navigation.tsx` — Main navigation shell
- `src/providers/react-query.tsx` — TanStack Query provider
- `src/providers/session.tsx` — Authentication and session management

Feature modules are organized under `src/features/` for domain-specific UI and hooks.

---

## Backend Integration

The frontend uses the backend API client in `src/lib/api.ts`.

**Base URL:** `http://localhost:8000/api/v1/`

Local development expects the backend running on port `8000`.

### Service Modules

| Module | Purpose |
|--------|---------|
| `src/services/outages.ts` | Outage CRUD operations |
| `src/services/paymentService.ts` | Payment processing and history |
| `src/services/dashboardService.ts` | Dashboard analytics and KPIs |
| `src/services/exportService.ts` | Data export (CSV, JSON) |
| `src/services/bulkImportService.ts` | Bulk outage import and dry-run |
| `src/services/sla.ts` | SLA status and configuration |
| `src/services/webhookService.ts` | Webhook management |

---

## Local Setup

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 9+
- Running backend from `apexchainx-backend`

### Quick Start

```bash
# Clone the repository
git clone https://github.com/ApexChainx/ApexChainx-Frontend.git
cd ApexChainx-Frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at **[http://localhost:3000](http://localhost:3000)**.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create optimized production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint for code quality |
| `npm run test` | Run Vitest test suite |

---

## Expected Local Setup

For the frontend to function meaningfully, start the backend as well:

1. Run `apexchainx-backend` on port `8000`
2. Ensure the backend API is reachable at `http://localhost:8000`
3. Start this frontend on `http://localhost:3000`

> **Note:** Without the backend, the app shell will load, but API-backed views such as outages, exports, bulk import, payments, and analytics will not have live data.

---

## Project Structure

```
apexchainx-frontend/
├── src/
│   ├── app/                  # Next.js App Router pages and layouts
│   ├── components/           # Shared UI components and dashboard widgets
│   │   ├── dashboard/        # SLA dashboard views and charts
│   │   ├── outages/          # Outage-specific UI components
│   │   ├── payments/         # Payment views and drawers
│   │   ├── bulk-import/      # Bulk import views
│   │   ├── shared/           # Shared error states and utilities
│   │   └── ui/               # Low-level UI primitives (button, table, card, etc.)
│   ├── features/             # Feature-specific modules
│   │   └── outages/          # Outage hooks, components, and helpers
│   ├── hooks/                # Shared React hooks (session, SLA config, focus trap)
│   ├── lib/                  # API client, auth helpers, URL utils, environment config
│   │   ├── config/           # Environment configuration
│   │   └── auth/             # Authentication redirect helpers
│   ├── providers/            # React context providers
│   ├── services/             # Backend-facing service modules
│   └── types/                # Shared TypeScript type definitions
├── docs/                     # Project documentation
├── tests/                    # Test files
├── vitest.config.ts          # Vitest test configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Project metadata and dependencies
```

---

## Stabilized Baseline

As of the latest stabilization pass:

- ✅ `npm run build` passes without errors
- ✅ `npm run lint` passes (one non-blocking TanStack Table warning)
- ✅ All local UI primitives restored and functional
- ✅ Stale `import.meta.env` usage removed from active service modules
- ✅ Outage pages aligned with backend response shapes
- ✅ Test suite passing with Vitest

---

## Current Limitations

This repository is actively being developed. Current areas of focus:

- `/payments` — transitioning from placeholder to full-featured payment views
- `/setting` — expanding settings capabilities
- `/` — enhancing the SLA dashboard with richer analytics
- Codebase consolidation: merging older page-style screens into the App Router pattern
- API alignment: some frontend flows depend on backend endpoints still being stabilized in `apexchainx-backend`

---

## Contributing Notes

When making frontend changes:

- **Preserve the system rule:** Frontend calls Backend, never Contracts directly
- **Prefer App Router:** Update the App Router implementation first
- **API alignment:** Keep API shapes synchronized with `apexchainx-backend`
- **Integration boundary:** Treat `src/services/` and `src/lib/api.ts` as the boundary
- **Type safety:** No `as` type assertions on raw API responses; use typed generics

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines.

---

## Related Repositories

| Repository | Description |
|-----------|-------------|
| [`apexchainx-backend`](https://github.com/ApexChainx/apexchainx-backend) | Backend API and integration layer |
| [`apexchainx-contracts`](https://github.com/ApexChainx/apexchainx-contracts) | Soroban smart contracts for SLA enforcement |

---

<div align="center">
  <sub>Built with ❤️ by the ApexChain team</sub>
</div>
