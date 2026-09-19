# States & Types Modules (Catalogs)

The States and Types modules provide the domain catalogs that categorize alerts and manage their lifecycle in SAETA.

## Architecture Boundaries

- **`domain`**:
  - `StateEntity` and `StateRepository` port.
  - `TypeEntity` and `TypeRepository` port.
- **`application`**:
  - CQRS Commands: `CreateStateCommand`, `UpdateStateCommand`, `CreateTypeCommand`, `UpdateTypeCommand`.
  - CQRS Queries: `GetStatesQuery`, `GetStateByIdQuery`, `GetTypesQuery`, `GetTypeByIdQuery`.
- **`infrastructure`**:
  - `MongooseStateRepository` mapping MongoDB `states` collection.
  - `MongooseTypeRepository` mapping MongoDB `types` collection.
- **`presentation`**:
  - `StatesController` exposing `/v1/states`.
  - `TypesController` exposing `/v1/types`.

---

## HTTP Contract: States (`/v1/states`)

### List States
`GET /v1/states`
- Protected: Authenticated users (`JwtAuthGuard`).
- Returns: `{ ok: true, states: StateEntity[], total: number }`.

### Get State by ID
`GET /v1/states/:id` (and legacy alias `GET /v1/states/id/:id`)
- Protected: Authenticated users (`JwtAuthGuard`).
- Returns: `{ ok: true, state: StateEntity }`.

### Create State
`POST /v1/states`
- Protected: `ADMIN`, `BASE_SEGURIDAD` (`JwtAuthGuard`, `RolesGuard`).
- Payload:
```json
{
  "name": "CANCELADO"
}
```
- Returns: `{ ok: true, state: StateEntity }`.

### Update State
`PUT /v1/states/:id` (and alias `PATCH /v1/states/:id`)
- Protected: `ADMIN`, `BASE_SEGURIDAD` (`JwtAuthGuard`, `RolesGuard`).
- Payload:
```json
{
  "name": "CANCELADO DEFINITIVO"
}
```
- Returns: `{ ok: true, state: StateEntity }`.

---

## HTTP Contract: Types (`/v1/types`)

### List Types
`GET /v1/types?desde=0`
- Protected: Authenticated users (`JwtAuthGuard`).
- Supports pagination via query param `desde` (default offset 0, limit 100).
- Returns: `{ ok: true, types: TypeEntity[], total: number }`.

### Get Type by ID
`GET /v1/types/:id` (and legacy alias `GET /v1/types/id/:id`)
- Protected: Authenticated users (`JwtAuthGuard`).
- Returns: `{ ok: true, type: TypeEntity }`.

### Create Type
`POST /v1/types`
- Protected: `ADMIN`, `BASE_SEGURIDAD` (`JwtAuthGuard`, `RolesGuard`).
- Payload:
```json
{
  "name": "Incendio Forestal",
  "priority": 1
}
```
- Returns: `{ ok: true, type: TypeEntity }`.

### Update Type
`PUT /v1/types/:id` (and alias `PATCH /v1/types/:id`)
- Protected: `ADMIN`, `BASE_SEGURIDAD` (`JwtAuthGuard`, `RolesGuard`).
- Payload:
```json
{
  "name": "Incendio Urbano",
  "priority": 2
}
```
- Returns: `{ ok: true, type: TypeEntity }`.
