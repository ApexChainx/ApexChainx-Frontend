# 0001: Record Architecture Decision Records

- **Status:** accepted
- **Date:** 2026-07-24
- **Deciders:** ApexChain team

## Context

The codebase makes several architectural decisions that are not documented anywhere outside of code. New contributors cannot tell whether a change risks violating an existing decision.

## Decision

We will use Architecture Decision Records (ADRs) to document architectural decisions. Each ADR will follow the MADR template format.

## Considered Options

1. MADR template (chosen)
2. Markdown decision log
3. Wiki pages

## Decision Outcome

Chosen option: MADR template, because it is lightweight, widely used (CNCF, Kubernetes), and can be reviewed in pull requests.

## Links

- [MADR](https://adr.github.io/madr/)
