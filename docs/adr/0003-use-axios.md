# 0003: Use Axios as HTTP Client

- **Status:** accepted
- **Date:** 2026-07-24
- **Deciders:** ApexChain team

## Context

The frontend needs an HTTP client for API communication. The choice affects interceptors, error handling, and token management patterns.

## Decision

Use Axios for HTTP requests with interceptor-based token refresh.

## Considered Options

1. Axios (chosen)
2. Native fetch API
3. ky (fetch wrapper)

## Decision Outcome

Chosen option: Axios, because it provides built-in request/response interceptors for automatic token refresh, request cancellation, and a familiar API surface. The interceptor pattern is critical for the single-flight refresh dedup logic.

### Positive Consequences

- Built-in interceptors for auth token injection
- Request/response transformation
- Automatic JSON parsing
- Request cancellation via AbortController

### Negative Consequences

- Larger bundle than native fetch
- Slightly redundant with fetch capabilities in modern browsers

## Links

- [Axios docs](https://axios-http.com)
