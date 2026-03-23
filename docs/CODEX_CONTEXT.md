# NOC IQ Frontend (noc-iq-fe) – Codex Context

## Overview

This repository contains the frontend application for NOCIQ.

It provides the user interface for:

- managing outages
- viewing SLA performance
- tracking payments
- interacting with wallets
- monitoring analytics dashboards

The frontend consumes the backend API (noc-iq-be) and integrates with Stellar wallets.

---

## Tech Stack (assumed)

- Framework: Next.js / React
- Language: TypeScript
- State: Zustand or React Query
- Styling: Tailwind CSS
- Wallet: Freighter / Stellar wallet APIs

---

## Core Features

### 1. Outage Management UI

- create outage
- view outage list
- filter outages
- view outage details
- update outage status

Depends on:
- /api/v1/outages

---

### 2. SLA Visualization

- show SLA status
- show MTTR
- show penalty/reward
- display SLA timeline

Depends on:
- /api/v1/sla/status
- /api/v1/sla/calculate

---

### 3. Payments UI

- show payment history
- show transaction status
- display blockchain explorer links

Depends on:
- /api/v1/payments/history

---

### 4. Wallet Integration

- connect wallet (Freighter)
- display balances
- show wallet address

Depends on:
- Stellar wallet APIs
- /api/v1/wallets

---

### 5. Analytics Dashboard

- MTTR charts
- SLA compliance metrics
- payment trends

Depends on:
- /api/v1/analytics

---

## Architecture

- UI Components
- State Management
- API Layer (services/hooks)
- Wallet Integration Layer

---

## Important Constraints

- UI must reflect backend truth
- must handle async loading states
- must handle API failures gracefully
- must handle wallet connection states

---

## Known Risk Areas (Generate Issues)

### API Integration
- inconsistent API responses
- missing error handling
- duplicated fetch logic

### State Management
- stale data
- inconsistent caching
- race conditions

### Wallet Integration
- connection failures
- network mismatch (testnet vs mainnet)
- signing errors

### UX
- poor loading states
- unclear error messages
- lack of feedback on actions

---

## Coding Rules

- separate UI from data fetching
- use hooks for API calls
- centralize API logic
- keep components reusable

---

## Cross-Repo Dependencies

- noc-iq-be → data source
- noc-iq-contracts → indirectly via backend

Important:
- API changes must reflect in frontend
- SLA/payment logic must match backend output

---

## Goal for Codex

Generate issues that:

- improve UI reliability
- ensure correct API integration
- improve UX for critical flows
- stabilize wallet interactions
