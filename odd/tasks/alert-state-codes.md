# Feature: alert-state-codes

Locator: `saeta-backend-v2/odd/tasks/alert-state-codes.md` (Engram mirror: `odd/alert-state-codes/tasks`)
Repos: `saeta-backend-v2` (branch `feat/alert-state-codes`), `saeta-frontend-v2` (branch `feat/alert-state-codes`)

## Objective
Move alert-state business rules out of the frontend: states get a stable `code`, the backend decides allowed actions per alert and exposes explicit `reject` / `delegate` actions. The frontend only renders what the backend returns.

## Problem / Why
States are `{ id, name }` only. Frontend and backend classify states with `name.includes('pendiente' | 'proceso' | 'resuelt' | 'rechazad' | 'cancelad')`. Renaming a state silently breaks colors, filters, buttons, counts and transition rules. The frontend also decides which actions are allowed and picks the reject/delegate target state by name (same smell as frontend v1).

## Scope
- Backend: `StateCode` enum (`PENDING`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`) on states; idempotent startup backfill of codes for existing states (the only remaining name matching, one-time); replace name matching in update-alert rules, alert repository counts/default pending state and dashboard with `code`; alert responses include `state.code` and `allowedActions`; `POST /v1/alerts/:id/reject` and `POST /v1/alerts/:id/delegate`.
- Frontend v2: consume `state.code` and `allowedActions`; call reject/delegate endpoints; single shared state-style mapping keyed by code; remove all state-name matching.

## Out of scope
- Flutter citizen app (`saeta_ciudadano_v2`) still matches by name: follow-up (adding `code` is additive, nothing breaks).
- Other audit items (security-personnel endpoint, search to backend, payload cleanup, component split).

## Constraints / decisions
- `allowedActions` mirrors current UI behavior: PENDING → `delegate`, `reject`, `manage`; IN_PROGRESS → `reject`, `manage`; RESOLVED / REJECTED → `manage`. Generic `PUT /alerts/:id` stays for "manage".
- `code` is optional on custom admin-created states (unique + sparse); system states carry a code.
- Backfill runs on module init, only touches states without `code`, maps by name once.
- TDD: strict (source: project/session config). Backend runner `pnpm test` (vitest). Frontend runner `npx ng test --watch=false` (vitest via Angular).
- RDD: off (global) → verification via writer self-checks + parent spot check.
- Delivery: ask-on-risk; backend and frontend are separate repos → separate PRs. Forecast ~900 authored lines total; PR slicing decided before any PR is opened.

## Tasks
- [x] T1 (backend, delegated writer) State `code`: domain enum, entity, schema (unique sparse), create/update DTOs (optional code), repository `findByCode`, startup backfill. Tests. — commit `ece841e`; RED: 3 failing suites/4 failing tests (create/update-state code-conflict specs + new backfill spec importing missing files) → GREEN: 39/39 files, 179/179 tests.
- [ ] T2 (backend, delegated writer) Replace name matching with `code` in `update-alert.handler.ts` rules, `mongoose-alert.repository.ts` counts + default pending state, dashboard overview handler. Tests.
- [ ] T3 (backend, delegated writer) Alert response: populate `state.code`; domain policy `getAllowedActions(code)`; `allowedActions` on alert entity/response. Tests.
- [ ] T4 (backend, delegated writer) `POST /alerts/:id/reject` (optional commentary) and `POST /alerts/:id/delegate` (`attendedById`, optional commentary): commands resolve target state by code, reject disallowed transitions (409), emit existing `AlertUpdatedEvent`. Tests.
- [ ] T5 (frontend, delegated writer) Models + service methods; shared state-style helper by code; map and list use `allowedActions` and new endpoints; remove all name matching. Tests.

## Acceptance criteria
- No `includes('pendient…')`-style state name matching remains outside the one-time backfill.
- Renaming a state does not change behavior.
- All backend and frontend tests + builds pass.

## Progress / evidence
- T1 done (commit `ece841e`). `pnpm test`: 39 files / 179 tests passing.

## Next step
T2.
