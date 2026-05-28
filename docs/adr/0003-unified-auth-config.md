# ADR-0003: Unified Auth Config

**Date:** 2026-05-28

## Context

Auth configuration was scattered across 14+ files: each module read its own environment variables, had its own defaults, and some had duplicate or contradictory logic (e.g., `JWT_SECRET` read 3 ways, `CSRF_SECRET_FILE` declared but never consumed). The `rememberMe` flag set a 30-day cookie while the underlying Redis session had a 7-day TTL, causing silent login failures after day 7.

## Decision

1. **Single config module** (`lib/config/auth-config.ts`) — all auth-related environment variables, defaults, and typed exports live here. Consumers call `getAuthConfig()` to get a typed config object.

2. **Session TTL: 900 seconds (15 minutes)** — down from 7 days. No `rememberMe` flag. Rationale: short-lived sessions reduce the window for stolen-token abuse. Users who need longer sessions can extend via the env-var-backed config.

3. **Cached config with `resetAuthConfig()`** — the config is built once and cached. Tests call `resetAuthConfig()` to flush the cache when they mutate environment variables between test cases.

4. **All `_FILE` secrets resolved through `getRequiredSecret`/`getOptionalSecret`** — `CSRF_SECRET_FILE` was declared but never read; now it is properly resolved via the same mechanism as `JWT_SECRET_FILE`.

## Alternatives considered

- **Per-module config readers** — rejected: duplicates env-var reads and defaults, making it harder to audit which environment variables exist.
- **Keep `rememberMe` with a 30-day session** — rejected: longer sessions increase risk. If operators need longer sessions, they set a larger TTL in the config.
- **No caching** — rejected: `JWT_SECRET` is parsed into a `Uint8Array` for use with `jose`; re-parsing on every request is wasted work.
- **`env-validation.ts` owns all config** — rejected: env-validation validates startup secrets; auth-config owns defaults and derived values.

## Consequences

- One place to add or change auth-related environment variables.
- All consumers get consistent `_FILE` support.
- No silent `rememberMe`/session-TTL mismatch.
- Tests must call `resetAuthConfig()` when mutating env vars.
- Currently a single interface, single adapter — if a second adapter is ever needed (e.g., alternative config source), the seam is already defined.
