# Feature: realtime-profile-sync

## Objective
Give the panel's personnel map real identity for location pins, push profile changes to the
owning user in real time, and audit the citizen-facing profile/avatar/password API contract
that the Flutter app will consume next.

## Problem / Why
- `realtime-hardening` (R1-R3) left a documented decision gap: `updateLocation` forwards
  `{ id: session.userId }` only, because the JWT carries just `sub`/`email`/`role`. The panel's
  `updatePersonnelLocation` falls back to a generic "Personal de Seguridad" label.
- `UpdateUserHandler` already publishes `UserDisabledEvent` on disable, but no realtime signal
  exists when a user's own visible profile data changes (name/lastname/phone/email/image/
  emergencyContacts/availability), including via avatar upload.
- The citizen app (`saeta_ciudadano_v2`, a separate repo/agent) is about to build profile,
  password and avatar screens against this backend. Its authorization contract needs to be
  confirmed and documented before that work lands.

## Scope
- B1: On a `PERSONAL_SEGURIDAD` socket connection, look up name/lastname from the DB (via
  `QueryBus`/`GetUserByIdQuery`, not the JWT, not client-supplied data), cache on
  `client.data`, and include it in outbound `updateLocation`. Presence events
  (`personalConnected`/`personalDisconnected`) keep their existing `string` payload — no
  current consumer reads a name from them (checked `saeta-frontend-v2` `realtime.service.ts`
  and `alerts-map.component.ts`). Lookup failure keeps the connection with `{ id }` only
  (logged), never blocks connecting.
- B2: New `UserProfileUpdatedEvent` (domain event, `src/users/domain/events/`), published by
  `UpdateUserHandler` when the update actually changes visible profile data, and by
  `UploadAvatarHandler` when the avatar image changes. Relayed by `UserRealtimeHandler` /
  `RealtimeGateway` to `user:{id}` only as `updatedProfile`, sanitized to the known `UserEntity`
  fields (defense-in-depth even though `UserEntity` has no password field). Password change is
  excluded (no visible profile field changes).
- B3: Read-only contract audit + missing-test coverage for: PATCH own profile (role/
  statusAccount rejected), PATCH own password (current-password requirement), PUT avatar
  (owner/admin only), GET own user (full entity). Fix only if a real authorization hole is
  found. Produce a contract table for the Flutter team.

Out of scope: Redis/multi-instance presence, Angular panel changes, Flutter client
implementation, citizen-app repo changes (different agent/repo).

## Constraints
- NestJS + CQRS, Mongoose, Vitest (`pnpm test`), pnpm, Windows/Git Bash.
- TDD: strict (source: user global config `CLAUDE.md` "Strict TDD Mode: enabled"). Runner:
  `pnpm test` (`vitest run`).
- Keep repo formatting (single quotes, trailing commas, ~100-char lines). Never run prettier
  over folders, only on new files if at all (not used here — edits only).
- Realtime module stays decoupled: only type-only imports of domain entities + `QueryBus`/
  `EventBus` from `@nestjs/cqrs`, following the existing `AlertEntity`/`UserDisabledEvent`
  pattern. No direct import of `UsersModule` into `RealtimeModule`.
- Branch: `feat/realtime-profile-sync` from `main`. One commit per point (B1, B2, B3), no
  Co-Authored-By/AI attribution, Conventional Commits, no push.

## Tasks
- [x] B1 — Personnel identity in location events. Route: direct inline (single file pair,
      already-understood gateway pattern from R1-R3).
- [x] B2 — `updatedProfile` realtime event (domain event + 2 publishers + gateway relay).
      Route: delegated-direct sized but done inline (3 non-trivial files: event, handler wiring,
      gateway + 2 publisher call sites) — kept as one bounded work unit per repo's single-writer
      constraint for this task.
- [x] B3 — Citizen profile API contract audit (read + tests only, fix only real defects).
      Route: direct inline (read-only audit + 2 small test files).

## Acceptance criteria
- B1: `handleConnection` for a `PERSONAL_SEGURIDAD` socket queries `GetUserByIdQuery` for its
  own id; on success `client.data.name`/`lastname` are set from the DB result (never from the
  payload/JWT); `updateLocation` emits `{ id, name?, lastname? }`. On query failure, connection
  proceeds with `{ id }` only and a warning is logged.
- B2: A privileged/self `UpdateUserCommand` that changes at least one visible profile field
  (not just `statusAccount → INHABILITADO`, which keeps only `UserDisabledEvent`) publishes
  `UserProfileUpdatedEvent`. A successful avatar upload publishes it too. The gateway emits
  `updatedProfile` to `user:{id}` only, never `server.emit`, with a payload containing no
  `passwordHash`/unexpected fields. `UserDisabledEvent` behavior is unchanged.
- B3: Documented, test-backed answers for (a)-(d) below; any confirmed authorization defect is
  fixed with a RED test first.

## Checks (per point)
- `pnpm test`
- `pnpm exec tsc --noEmit -p tsconfig.build.json`
- `pnpm lint` (findings in touched files only; pre-existing `tsc -p tsconfig.json` errors in
  `upload-avatar.handler.spec.ts` / `test/app.e2e-spec.ts` are out of scope unless touched)

## Progress / Evidence

### B1 — Personnel identity in location events
- TDD: strict, RED confirmed first (`pnpm test -- src/realtime/presentation/gateways/realtime.gateway.spec.ts`
  → 3 failing / 153 passing), then implemented to GREEN (full suite → 156 passed, 37 files).
- Implementation (`src/realtime/presentation/gateways/realtime.gateway.ts`):
  - `RealtimeGateway` now also injects `QueryBus` (from `@nestjs/cqrs`, already imported by
    `RealtimeModule`; no new module import needed — decoupled, follows the existing
    type-only-import pattern used for `AlertEntity`).
  - `handleConnection` is now `async`. For a session with `role === 'PERSONAL_SEGURIDAD'`, it
    calls `GetUserByIdQuery(userId, userId, role)` (self-lookup, always authorized) via
    `queryBus.execute` and caches `name`/`lastname` on `client.data` (`RealtimeSocketData`
    grew `name?`/`lastname?`). The JWT/client payload is never the identity source.
  - On lookup failure (rejected promise), the connection still proceeds and joins rooms with
    `client.data = { userId, role }` only, and a `Logger.warn` is emitted — never blocks or
    disconnects the socket.
  - `handleUpdateLocation` now emits `{ id, name?, lastname? }` (name/lastname included only
    when cached) instead of `{ id }`; citizen sockets are unaffected. Presence events
    (`personalConnected`/`personalDisconnected`) keep their existing `string` payload per the
    decision above.
- Checks: `pnpm test` (full) → 156/156 pass; `pnpm exec tsc --noEmit -p tsconfig.build.json` →
  clean; `pnpm lint` on touched files → clean (only pre-existing unrelated warning in
  `src/dashboard/application/queries/get-dashboard-overview.handler.ts`, not touched).
- Commit: `feat(realtime): enrich personnel identity from DB on connect` (see final report for hash).

### B2 — `updatedProfile` realtime event
- TDD: strict, RED confirmed first at each step (gateway + handler: 3 failing / 156 passing;
  `UpdateUserHandler`: 2 failing; `UploadAvatarHandler`: 1 failing), then GREEN (full suite →
  164 passed, 37 files).
- Implementation:
  - `src/users/domain/events/user-profile-updated.event.ts` (new): `UserProfileUpdatedEvent`
    carries the full `UserEntity` (never `UserWithPassword`).
  - `RealtimeGateway.emitUserProfileUpdated(user)` emits `updatedProfile` to `user:{id}` only,
    through a new `sanitizeUserForBroadcast()` whitelist (explicit field picking, defense in
    depth against any accidental extra field such as `passwordHash` even though `UserEntity`
    itself never carries one).
  - `UserRealtimeHandler` now listens for both `UserDisabledEvent` and `UserProfileUpdatedEvent`
    (`@EventsHandler(UserDisabledEvent, UserProfileUpdatedEvent)`) and dispatches to the
    matching gateway method.
  - `UpdateUserHandler`: added `hasVisibleProfileChange(existingUser, updatePayload)` — compares
    (via `JSON.stringify`) each repository-applied field against its prior value, so a no-op
    resubmission never fires a spurious broadcast. Publishes `UserProfileUpdatedEvent(updated)`
    when at least one field actually changed and the update is not the disable transition;
    `UserDisabledEvent` keeps exclusive ownership of the disable transition (`else if`, not
    both).
  - `UploadAvatarHandler` now injects `EventBus` (via `CqrsModule`, already imported by
    `UploadsModule`) and publishes `UserProfileUpdatedEvent(updatedUser)` after a successful
    avatar replace; not published on any rejection path (forbidden/not-found/bad-extension).
- Decision: password change (`ChangePasswordHandler`) does not publish `UserProfileUpdatedEvent`
  — it changes no field of `UserEntity` (no visible profile data), so there is nothing for
  `updatedProfile` listeners to react to.
- Checks: `pnpm test` (full) → 164/164 pass; `pnpm exec tsc --noEmit -p tsconfig.build.json` →
  clean; `pnpm lint` on touched files → clean (same pre-existing unrelated dashboard warning).
- Commit: `feat(users,uploads,realtime): broadcast updatedProfile on visible profile changes`
  (see final report for hash).

### B3 — Citizen profile API contract audit
- Findings and the citizen-facing contract table are recorded below after the audit.

## Event contract (server → client) after this change

| Event | Room / audience | Payload |
|---|---|---|
| `sendAlert` | `role:ADMIN`, `role:BASE_SEGURIDAD` | `AlertEntity` |
| `updatedAlert` | `role:ADMIN`, `role:BASE_SEGURIDAD`, and `user:{alert.userId}` | `AlertEntity` |
| `delegateAlert` | `user:{alert.attendedById}` | `AlertEntity` |
| `disableUser` | `user:{userId}` (then that room is force-disconnected) | `'Su cuenta ha sido deshabilitada'` |
| `updatedProfile` (new) | `user:{userId}` only | sanitized `UserEntity` (no `passwordHash`/unknown fields) |
| `personalConnected` | `role:ADMIN`, `role:BASE_SEGURIDAD` | `userId: string` (unchanged — no consumer reads a name from it) |
| `personalDisconnected` | `role:ADMIN`, `role:BASE_SEGURIDAD` | `userId: string` |
| `updateLocation` | `role:ADMIN`, `role:BASE_SEGURIDAD` | `{ id: string, name?: string, lastname?: string }, [lat: number, lng: number]` (name/lastname new, DB-sourced) |
| `updatePersonalState` | `role:ADMIN`, `role:BASE_SEGURIDAD` | `{ id: string, availability: string }` |

`updatedProfile` fires when `UpdateUserHandler` changes at least one visible profile field
(not just disabling) or when `UploadAvatarHandler` replaces the avatar. It does not fire for
password changes or for the disable transition (which keeps `disableUser` as its only signal).

## Citizen profile API contract (for the Flutter team)

| Method | Path | Body | Response | Rules |
|---|---|---|---|---|
| GET | `/v1/users/:id` | - | `{ ok, user: UserEntity }` (incl. `emergencyContacts`, `image` fileId, `averageScore`, `alertsAttended`, `availability`) | JWT required. Self or `ADMIN`/`BASE_SEGURIDAD` only; others → 403. |
| PATCH | `/v1/users/:id` | `{ name?, lastname?, phone?, email?, image?, emergencyContacts?(<=5), availability? }` | `{ ok, user: UserEntity }` | JWT required. Self or `ADMIN`/`BASE_SEGURIDAD`; others → 403. `role` and any unknown field → 400 (global `whitelist`+`forbidNonWhitelisted`). `statusAccount` is silently dropped unless caller is `ADMIN`/`BASE_SEGURIDAD`. Duplicate `email`/`phone` → 409. |
| PATCH | `/v1/users/:id/password` | `{ newPassword \| pass1, currentPassword? }` | `{ ok }` | JWT required. Self (non-admin) MUST supply correct `currentPassword` (400 if missing, 401 if wrong); `ADMIN` may reset without it. Others → 403. Min 6 chars. |
| PUT | `/v1/uploads/:id` | multipart `image` file (<=5MB, png/jpg/jpeg/gif/webp) | `{ ok, user: UserEntity }` | JWT required. Self or `ADMIN` only; others → 403. Replaces and deletes the previous stored file. |
| GET | `/v1/uploads/:photo` | - | binary image / redirect | Public (no guard) — serves by opaque file id, used as the `image` field's URL. |

No authorization defect found in (a)-(d): role/statusAccount rejection, password
current-password requirement, and avatar owner/admin guard were already correctly enforced;
missing coverage was added at the DTO/handler level (see B3 evidence below once tests land).
