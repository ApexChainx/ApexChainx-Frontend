# SLA Operations Workspace

This directory is the dedicated, project-specific contribution area for the ApexChainx Frontend.

## Purpose
`src/features/sla-operations/` is reserved for contributor-built SLA operations modules that extend the platform's network operations intelligence experience (outage visibility, SLA analysis, settlement/payment insights, webhook and import tooling UIs) without modifying the stabilized core application flows.

## Why this location fits the project
- The app is organized with domain feature modules under `src/features/` (e.g. `dashboard`, `outages`, `payments`, `settings`).
- SLA calculation, outage management, and settlement visibility are core product concerns of ApexChainx.
- Keeping new contributor work in a dedicated feature namespace preserves isolation while remaining architecturally native to the frontend.

## Boundaries
- **Do primary implementation work here:** `src/features/sla-operations/**`
- **Avoid unrelated edits** to core routes (`src/app/**` outside explicit integration needs), shared providers, core services, or existing stabilized features unless an assigned issue explicitly requires and documents a minimal integration change.
- If integration outside this area is required, document the exact reason, files, and scope in the issue/PR.

## Suggested structure (as needed per issue)
- `components/` – isolated UI components and widgets
- `hooks/` – feature-scoped hooks
- `services/` – feature-scoped adapters/helpers (must not bypass existing API boundaries)
- `utils/` – pure utilities and formatters
- `types/` – local TypeScript types
- `__tests__/` or `*.test.ts(x)` – tests for contributed modules
- `docs/` – module-level documentation

## Contributor workflow
1. Select an assigned issue scoped to `src/features/sla-operations/`.
2. Create a branch: `feat/issue-<number>-short-description` or `fix/issue-<number>-short-description`.
3. Implement only the requested work inside this workspace.
4. Add/update tests relevant to your changes.
5. Run checks before opening a PR:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run build` (when applicable)
6. Open a PR referencing the issue and clearly note any approved exception that touches files outside this workspace.

## Quality expectations
- Follow existing TypeScript, React, and Tailwind/Radix patterns used in the repo.
- Keep modules composable and well-typed (no unsafe `as` casts on raw API responses).
- Do not introduce direct contract interactions; frontend communicates with backend APIs only.
- Preserve accessibility, responsive behavior, and existing app stability.
