# Frontend refactoring guide

The frontend should evolve by feature while preserving its current rendered interface and API behavior.

## Invariants

- Keep existing JSX structure, Tailwind classes, copy, navigation, and accessibility semantics unless a product change is explicitly requested.
- Keep `src/services/api.ts` as the compatibility facade while domain clients move into focused modules.
- Treat server responses as the source of identity and authorization. Never send requester roles or requester IDs as proof of access.
- Fail closed in production. Development fallback data remains opt-in through `VITE_ENABLE_API_FALLBACK=true`.
- Add types at boundaries and centralize transport errors instead of repeating response parsing.
- Extract behavior before extracting visual components so each step stays reviewable and low risk.

## Target structure

```text
src/
  features/          # feature-specific hooks and components
  services/
    httpClient.ts    # transport, credentials, errors, session expiry
    authApi.ts       # authentication and account recovery
    api.ts           # temporary compatibility facade
  components/        # reusable presentation components
  hooks/             # cross-feature behavior
  types/             # shared contracts
  utils/             # pure helpers
```

## Completed foundation

- Centralized credentialed requests, JSON validation, typed errors, and session-expiry events in `httpClient.ts`.
- Moved login, logout, registration, invitation lookup, and password recovery into `authApi.ts`.
- Preserved the existing `api` facade so component call sites and rendered output remain stable.
- Replaced browser-readable JWT storage with HttpOnly cookie sessions.

## Next safe extractions

1. Move discussion, moderation, cohort, and content calls into domain API modules.
2. Move opt-in demo state into a dedicated development adapter.
3. Extract stateful feature hooks from `App.tsx` and `ClinicianDashboard.tsx` without moving presentation markup in the same change.
4. Split large presentation files along existing modal and tab boundaries after behavior is isolated.
5. Add route-level lazy loading to reduce the main bundle after visual parity is established.
