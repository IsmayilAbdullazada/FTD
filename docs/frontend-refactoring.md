# Frontend refactoring guide

The frontend should evolve by feature while preserving its current rendered interface and API behavior.

## Invariants

- Keep existing JSX structure, Tailwind classes, copy, navigation, and accessibility semantics unless a product change is explicitly requested.
- Import feature-owned API adapters directly; do not introduce an application-wide API service object.
- Treat server responses as the source of identity and authorization. Never send requester roles or requester IDs as proof of access.
- Fail closed in production. Development fallback data remains opt-in through `VITE_ENABLE_API_FALLBACK=true`.
- Add types at boundaries and centralize transport errors instead of repeating response parsing.
- Extract behavior before extracting visual components so each step stays reviewable and low risk.

## Target structure

```text
src/
  app/               # application shell, providers, routing/navigation, orchestration
    components/
    hooks/
    lib/
    providers/
  features/          # business capabilities; each owns its UI and API adapter
    auth/
      api/
      components/
      index.ts       # public UI entry point
    discussions/
    moderation/
    knowledge/
    content/
    notifications/
  shared/            # code with multiple feature consumers and no feature policy
    api/             # HTTP transport shared by feature API adapters
    components/
    dev/             # explicitly opt-in development fixtures and stores
    hooks/
    lib/
  types/             # shared contracts pending gradual feature ownership
```

Features may import from `shared`, while `shared` must not import feature UI.
The app shell imports feature public entry points instead of reaching into their
internal component folders. Domain API adapters remain feature-owned, and UI
code imports only the adapters it actually uses.

## Completed foundation

- Centralized credentialed requests, JSON validation, typed errors, and session-expiry events in `httpClient.ts`.
- Moved login, logout, registration, invitation lookup, and password recovery into `authApi.ts`.
- Moved invitations, resources, updates, calendar events, guide management, notifications, private messaging, and database administration into focused domain clients.
- Moved user/cohort, discussion, moderation, and knowledge behavior into focused domain clients.
- Moved extracted opt-in demo content and notification data into `devFallbackStore.ts`.
- Removed the application-wide API facade after migrating callers to feature-owned adapters.
- Added a typed cross-feature auto-dismiss hook for transient notices.
- Extracted API-backed app data, view state, browser location handling, and orchestration from `App.tsx` into `app`.
- Reorganized the frontend around feature ownership, public feature entry points, and a small cross-feature `shared` layer.
- Replaced browser-readable JWT storage with HttpOnly cookie sessions.

## Next safe extractions

1. Extract stateful feature hooks from `ClinicianDashboard.tsx` without moving presentation markup in the same change.
2. Split large presentation files along existing modal and tab boundaries after behavior is isolated.
3. Add route-level lazy loading to reduce the main bundle after visual parity is established.
