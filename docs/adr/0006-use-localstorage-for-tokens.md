# 0006: Store JWT Tokens in localStorage (Deprecated Path)

- **Status:** deprecated
- **Date:** 2026-07-24
- **Deciders:** ApexChain team

## Context

The application needs to persist authentication tokens across page reloads. Token storage location affects security posture and cross-tab synchronization.

## Decision

Store JWT tokens in localStorage. This decision is deprecated in favor of httpOnly cookies (see issue #43).

## Considered Options

1. localStorage (chosen, now deprecated)
2. httpOnly Secure SameSite cookies (current recommendation)
3. In-memory only (session-only auth)

## Decision Outcome

Chosen option: localStorage was chosen for simplicity and cross-tab sync via BroadcastChannel. However, this is deprecated because localStorage is accessible to any JavaScript on the page, making tokens vulnerable to XSS exfiltration.

### Positive Consequences

- Simple implementation
- Easy cross-tab sync
- Works without backend cookie support

### Negative Consequences

- Tokens accessible to XSS attacks
- No automatic expiration handling
- Browser extensions can access tokens

## Links

- Related: Issue #43 (Move JWT to httpOnly cookies)
- Related: Issue #44 (CSRF protection)
