# ApexChain System

## Repositories

- apexchainx-frontend → frontend
- apexchainx-backend → backend
- apexchainx-contracts → smart contracts

## System Flow

User → Frontend → Backend → Contracts → Backend → Frontend

## Rules

- Frontend never talks to contracts directly
- Backend is the bridge
- Contracts are execution layer only
