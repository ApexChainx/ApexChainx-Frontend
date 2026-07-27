# ApexChain Architecture

This document contains architectural diagrams that visualize ApexChain's component structure and key data flows.

## Table of Contents
- [Frontend Component Tree](#frontend-component-tree)
- [Auth/Refresh Flow](#authrefresh-flow)
- [Outage Resolve Flow with SLA + Stellar Payment](#outage-resolve-flow-with-sla--stellar-payment)

---

## Frontend Component Tree

```mermaid
graph TD
    A[App Layout] --> B[Navigation]
    A --> C[RouteGuard]
    A --> D[SessionProvider]
    A --> E[ReactQueryProvider]
    
    %% Pages
    A --> F[Dashboard Page]
    A --> G[Outages Page]
    A --> H[Bulk Import Page]
    A --> I[Payments Page]
    A --> J[Retry Queue Page]
    A --> K[Settings Page]
    A --> L[Login/Register Pages]
    A --> M[Config Page]
    A --> N[Webhooks Page]
    
    %% Components
    F --> O[Dashboard Components<br>KPICard, SLATrendChart, etc.]
    G --> P[Outages Components<br>SLADisputesPanel, ResolveOutageModal, etc.]
    I --> Q[Payments Components<br>payment-detail-drawer, payments-view]
    J --> R[Retry Queue View<br>retry-queue-view.tsx]
    M --> S[Settings Components]
    N --> T[Webhook Settings]
    
    %% Shared UI Components
    B --> U[Shared UI Components<br>Button, Dialog, Table, Badge, etc.]
    P --> U
    Q --> U
    R --> U
    
    %% Hooks
    D --> V[Custom Hooks<br>useSession, useHealth, useOutagesTableState]
    E --> W[React Query Hooks<br>useQuery, useMutation]
    P --> V
    P --> W
    R --> V
    R --> W
    
    %% Services
    X[API Services<br>paymentService, outages, sla, webhookService] --> Y[API Layer<br>axios, circuit breaker, token refresh]
    Y --> Z[Backend API]
```

---

## Auth/Refresh Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant SessionProvider
    participant API
    participant BackendAuth
    
    %% Initial Authentication
    User->>Frontend: Navigates to app
    Frontend->>SessionProvider: Initialize session
    SessionProvider->>API: GET /auth/me (with cookies)
    API->>BackendAuth: Validate session
    BackendAuth-->>API: Return user data
    API-->>SessionProvider: User authenticated
    SessionProvider-->>Frontend: Render protected routes
    
    %% Token Refresh Flow
    Note over Frontend,BackendAuth: 401 Unauthorized occurs (token expired)
    API->>API: Intercept 401 error
    API->>API: Check circuit breaker state
    alt Circuit breaker closed
        API->>BackendAuth: POST /auth/refresh with refresh token
        BackendAuth-->>API: New access token
        API->>API: Update stored tokens
        API->>API: Retry original request with new token
        API-->>Frontend: Return original request data
    else Refresh fails or circuit open
        API->>SessionProvider: Clear session
        SessionProvider->>Frontend: Redirect to login
        Frontend-->>User: Show login page
    end
    
    %% Logout Flow
    User->>Frontend: Clicks "Sign out"
    Frontend->>API: POST /auth/logout
    API->>SessionProvider: Clear tokens
    SessionProvider->>Frontend: Update state to unauthenticated
    Frontend-->>User: Redirect to login
```

---

## Outage Resolve Flow with SLA + Stellar Payment

```mermaid
sequenceDiagram
    participant Operator
    participant Frontend
    participant OutageMutations
    participant API
    participant Backend
    participant SLAEngine
    participant StellarNetwork
    participant PaymentService
    
    %% Outage Resolution Initiation
    Operator->>Frontend: Opens outage details
    Frontend->>Frontend: Clicks "Resolve Outage"
    Frontend->>Frontend: Enters MTTR minutes
    Frontend->>OutageMutations: Calls resolveOutage mutation
    OutageMutations->>API: POST /outages/{id}/resolve
    
    %% Backend Processing
    API->>Backend: Resolve outage request
    Backend->>SLAEngine: Calculate SLA with MTTR
    SLAEngine->>SLAEngine: Compare MTTR to threshold
    SLAEngine-->>Backend: Return SLA result<br>(met/violated, penalty/reward amount)
    
    %% Payment Processing
    Backend->>PaymentService: Initiate Stellar payment
    PaymentService->>StellarNetwork: Submit transaction
    StellarNetwork-->>PaymentService: Transaction confirmed
    PaymentService-->>Backend: Payment complete with tx hash
    
    %% Update Frontend State
    Backend-->>API: Return resolution response<br>outage, sla, payment objects
    API-->>OutageMutations: Success response
    OutageMutations->>Frontend: Invalidate queries, refresh data
    Frontend->>Frontend: Update UI, show success message
    Frontend-->>Operator: Outage resolved, payment processed
    
    %% Failed Payment Handling
    Note over Operator,PaymentService: If payment fails
    StellarNetwork-->>PaymentService: Transaction failed
    PaymentService-->>Backend: Payment status = "failed"
    Backend-->>API: Return resolution with failed payment
    API-->>Frontend: Show payment failed warning
    Frontend->>Frontend: Add to retry queue
    Operator->>Frontend: Can retry from /payments/retry-queue
```

---

## Key Code Path References

### Frontend Component Tree Implementation
- **Session Provider**: [`src/providers/session.tsx`](../src/providers/session.tsx) - Manages authentication state
- **React Query Provider**: [`src/providers/react-query.tsx`](../src/providers/react-query.tsx) - Manages server state caching
- **Retry Queue View**: [`src/components/payments/retry-queue-view.tsx`](../src/components/payments/retry-queue-view.tsx) - Failed payments retry interface
- **Route Guard**: [`src/components/RouteGuard.tsx`](../src/components/RouteGuard.tsx) - Protects authenticated routes

### Auth Flow Implementation
- **Token Refresh Logic**: [`src/lib/api.ts`](../src/lib/api.ts) - Axios interceptors with circuit breaker pattern
- **Session Management**: [`src/providers/session.tsx`](../src/providers/session.tsx) - Cross-tab session sync, login/logout
- **API Layer**: [`src/lib/api.ts`](../src/lib/api.ts) - Deduplication, circuit breaker, auto-refresh

### Outage Resolution Flow
- **Outage Mutations**: [`src/features/outages/hooks/useOutageMutations.ts`](../src/features/outages/hooks/useOutageMutations.ts) - React Query mutations for outages
- **Resolve Outage Service**: [`src/services/outages.ts`](../src/services/outages.ts) - API calls for outage operations
- **Payment Service**: [`src/services/paymentService.ts`](../src/services/paymentService.ts) - Payment retry and management
- **SLA Types**: [`src/types/outages.ts`](../src/types/outages.ts) - SLAResult, OutageResolutionPayment interfaces

### Stellar Integration
- **Stellar Documentation**: [`docs/STELLAR_INTEGRATION.md`](./STELLAR_INTEGRATION.md) - Complete Stellar integration guide
- **Payment Endpoints**: [`src/lib/endpoints.ts`](../src/lib/endpoints.ts) - `/payments/{id}/retry` endpoint