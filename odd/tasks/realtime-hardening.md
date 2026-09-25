# Feature: realtime-hardening

## Objective
Make the Socket.IO gateway deliver each event only to the users entitled to it, and accept only authenticated, server-authoritative state changes.

## Problem / Why
Findings in `src/realtime/presentation/gateways/realtime.gateway.ts`:
1. Per-user events are broadcast to every socket (`server.emit(\`updatedAlert-${userId}\`)`): any client can listen to another citizen's alerts, location and account events. `sendAlert` reaches every connected citizen.
2. Unauthenticated sockets stay connected; `handshake.query.id` lets anyone claim a user id and be marked as security personnel. The Angular panel sends `query.id` too, so every panel user is currently tracked as "personnel".
3. Client-originated events (`updatedAlert`, `updateLocation`, `updatePersonalState`) are re-broadcast to everyone with unvalidated payloads (spoofing).
4. Presence is in-memory (single-instance only). Documented, not fixed here.

The legacy Android app never reached production (thesis project), so `query.id` support is dropped without a transition period.

## Scope
- Mandatory JWT on connection; disconnect otherwise. Remove `query.id` fallback. Reject refresh tokens (`tokenType === 'refresh'`), like `jwt.strategy.ts`.
- Rooms: on connect join `user:{id}` and `role:{role}`.
- Server-authoritative delivery:
  - Alert created → staff rooms (`role:ADMIN`, `role:BASE_SEGURIDAD`) as `sendAlert`.
  - Alert updated → staff rooms as `updatedAlert`; owner citizen room `user:{userId}` as `updatedAlert`; assigned personnel `user:{attendedById}` as `delegateAlert`.
  - User disabled → `user:{id}` as `disableUser`, then force-disconnect that user's sockets.
- Client events:
  - `updatedAlert` (client relay): removed. Alert changes come only from domain events.
  - `updateLocation` / `updatePersonalState`: accepted only from `PERSONAL_SEGURIDAD`; identity taken from the socket session, not the payload; payload validated; forwarded only to staff rooms.
  - Presence (`personalConnected`/`personalDisconnected`): only for role `PERSONAL_SEGURIDAD`, sent only to staff rooms.
- Keep event names used by the Angular panel (`sendAlert`, `updatedAlert`, `updateLocation`, `personalConnected`, `personalDisconnected`, `updatePersonalState`) so it keeps working.
- CORS: keep behavior but read allowed origins from config if the HTTP app already does; otherwise leave `*` and note it.

Out of scope: Redis adapter / multi-instance, Angular panel changes (only report required ones), Flutter client (T3 in the citizen app).

## Constraints
- NestJS + CQRS, domain events → realtime handlers (existing pattern). Vitest.
- TDD: strict (source: user global config). Runner: `pnpm test` (`vitest run`).
- Keep repo formatting style (lines up to ~100 chars); do NOT run prettier over whole folders (repo is not prettier-clean at default width).
- Branch: `refactor/realtime-rooms-auth` (based on `feat/realtime-user-disabled`).

## Tasks
- [x] R1 — Authenticated connections + rooms (drop `query.id`, reject invalid/refresh tokens, join `user:`/`role:` rooms, presence only for personnel to staff rooms). Route: delegated direct.
- [x] R2 — Room-scoped server emissions (alert created/updated/delegated, user disabled + force disconnect). Route: delegated direct.
- [ ] R3 — Harden client events (remove `updatedAlert` relay; role-gated, session-identity, validated `updateLocation`/`updatePersonalState` to staff only). Route: delegated direct.

## Acceptance criteria
- A socket without a valid access token is disconnected; `query.id` alone grants nothing.
- A citizen socket never receives another citizen's alert events or any `sendAlert`.
- Staff sockets receive `sendAlert`/`updatedAlert`/location/presence as before (panel compatible).
- `disableUser` reaches only the target user, whose sockets are then disconnected.
- Non-personnel sockets cannot emit location/state; spoofed `user` in payload is ignored.

## Checks
- `pnpm test`
- `pnpm exec tsc --noEmit -p tsconfig.build.json`
- `pnpm lint`

## Progress / Evidence
- Engram mirror: PENDING (engram project for this workspace is ambiguous).

### R1 — Authenticated connections + rooms
- TDD: strict, RED confirmed first (`pnpm test -- src/realtime/presentation/gateways/realtime.gateway.spec.ts` → 8 failing / 121 passing), then implemented to GREEN (`pnpm test -- src/realtime` → 129 passed, 36 files).
- Implementation (`src/realtime/presentation/gateways/realtime.gateway.ts`):
  - `handleConnection` now requires a verified JWT (`auth.token` / `query.token` / `Authorization` header). No token, invalid signature, or `tokenType === 'refresh'` → `client.disconnect(true)`, no room join. `handshake.query.id` is no longer read at all (dropped, no transition period per doc).
  - On success, session (`userId`, `role`) is stored on `client.data` (server-verified, not client-claimed) and the socket joins `user:{id}` and `role:{role}` (helpers `userRoom`/`roleRoom`).
  - Presence (`personalConnected`/`personalDisconnected`) is emitted only for role `PERSONAL_SEGURIDAD`, and only to staff rooms (`role:ADMIN`, `role:BASE_SEGURIDAD`) via `server.to(staffRooms())`, replacing the previous `broadcast.emit`/`server.emit` to everyone.
  - CORS: gateway now reads `CORS_ORIGIN` from `process.env` (decorator metadata is evaluated at module load, before Nest DI is available, so `ConfigService` cannot be injected there) via `resolveCorsOrigin()`, mirroring `main.ts`'s `corsOrigin` logic exactly (comma-split list, or `true` for `*`).
- Checks: `pnpm test` → 129/129 realtime tests pass (full suite run scoped to `src/realtime`, not run repo-wide here); `pnpm exec tsc --noEmit -p tsconfig.build.json` → clean; `pnpm lint` → clean for touched files (one `no-floating-promises` finding on `client.join(...)` fixed with `void`).
- Commit: `f167960` — `feat(realtime): require authenticated sockets and join user/role rooms`.

### R2 — Room-scoped server emissions
- TDD: strict, RED confirmed first (`pnpm test -- src/realtime/presentation/gateways/realtime.gateway.spec.ts` → 4 failing / 127 passing), then implemented to GREEN (`pnpm test -- src/realtime` → 131 passed, 36 files).
- Implementation (`src/realtime/presentation/gateways/realtime.gateway.ts`):
  - `emitAlertCreated` → `server.to(staffRooms()).emit('sendAlert', alert)` (staff only, was `server.emit` to everyone).
  - `emitAlertUpdated` → `updatedAlert` to staff rooms and, when `alert.userId` is set, to `user:{userId}` (owner citizen); `delegateAlert` (no longer a per-user suffixed event name) to `user:{attendedById}` only when `alert.attendedById` is set.
  - `emitUserDisabled` → `disableUser` to `user:{userId}` only, then `server.in(user:{userId}).disconnectSockets(true)` to force-disconnect that user's sockets (was a broadcast-style `disableUser-${userId}` event to everyone, and did not disconnect anyone).
- Checks: `pnpm test -- src/realtime` → 131/131 pass; `pnpm exec tsc --noEmit -p tsconfig.build.json` → clean; `pnpm lint` → clean (no new floating-promise finding on `disconnectSockets`).
- Commit: pending (see below).


