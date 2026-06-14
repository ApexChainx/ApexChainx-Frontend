# Changelog

All notable changes to the ApexChain Frontend project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- SLA dashboard with KPI cards, SLA trend charts, and penalties/rewards charts
- Outage management with create, edit, resolve, and delete workflows
- Outage timeline view with event tracking
- Bulk outage import with dry-run validation and history
- Payment history view with transaction tracking and detail drawer
- SLA configuration management page
- Webhook configuration and event management
- Advanced outage table filtering and saved presets
- Outage export functionality (CSV, JSON)
- SLA disputes panel for reviewing and managing disputes
- BroadcastChannel-based cross-tab session synchronization
- Route guard component for authenticated page protection
- Comprehensive test suite with Vitest and Testing Library
- Stellar wallet integration documentation
- Automated SLA enforcement via Soroban smart contracts

### Changed
- **Major rebrand**: Project renamed from NOC IQ to ApexChain
- Repository renamed from `noc-iq-fe` to `apexchainx-frontend`
- All documentation updated with ApexChain branding
- Package name updated to `apexchainx-frontend`
- BroadcastChannel session names updated to `apexchain_session`
- GitHub URLs updated to `ApexChainx/ApexChainx-Frontend`
- Token references updated from NOCIQ to APEX

### Fixed
- Stale `import.meta.env` usage removed from active service modules
- Outage pages aligned with backend response shapes
- Local UI primitives restored and functional
- SLA dispute service methods aligned

## [0.1.0] - 2026-06-14

### Added
- Initial project setup with Next.js 16, React 19, TypeScript 5
- TanStack React Query for server state management
- TanStack Table for data table functionality
- Tailwind CSS 4 with utility primitives
- Radix UI primitives for accessible components
- Axios-based API client with authentication support
- App Router page structure with layout and navigation
- Session management with cross-tab synchronization
- Outage CRUD operations and service modules
- Payment processing service
- SLA configuration and calculation services
- Bulk import service with dry-run support
- Export service (CSV, JSON)
- Webhook management service
- Vitest test configuration with Testing Library setup
- ESLint configuration
- TypeScript strict mode configuration
