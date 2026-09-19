# Temps Module (Temporary Passwords)

The Temps module provides secure temporary password provisioning for users, typically issued by `BASE_SEGURIDAD` or `ADMIN` operators during support, account recovery, or field operations.

## Architecture Boundaries

- **`domain`**:
  - `TempEntity` and `TempUserSummary`.
  - `TempRepository` port contract and `TEMP_REPOSITORY` injection token.
- **`application`**:
  - CQRS Commands: `CreateTempCommand`, `DeleteTempCommand`.
  - CQRS Queries: `GetTempsQuery`, `GetTempByUserQuery`, `GetTempByIdQuery`.
- **`infrastructure`**:
  - `MongooseTempRepository` mapping MongoDB `temps` collection with populated user details (`name`, `lastname`, `DNI`, `image`, `role`).
- **`presentation`**:
  - `TempsController` exposing `/v1/temps`.
  - RBAC guards: `JwtAuthGuard` and `RolesGuard` restricted to `ADMIN` and `BASE_SEGURIDAD`.

---

## HTTP Contract (`/v1/temps`)

### List All Temporary Passwords
`GET /v1/temps`
- Protected: `ADMIN`, `BASE_SEGURIDAD`.
- Returns: `{ ok: true, temps: TempEntity[], total: number }`.

### Get Temporary Password by User ID
`GET /v1/temps/user/:userId`
- Protected: `ADMIN`, `BASE_SEGURIDAD`.
- Returns: `{ ok: true, temp: TempEntity }` or `{ ok: false, msg: "No se encontro temporal." }`.

### Legacy Get Route (by User ID or Temp ID)
`GET /v1/temps/:id`
- Protected: `ADMIN`, `BASE_SEGURIDAD`.
- Searches by `userId` first (preserving legacy mobile/frontend contract), then falls back to `_id`.

### Create Temporary Password
`POST /v1/temps`
- Protected: `ADMIN`, `BASE_SEGURIDAD`.
- Payload:
```json
{
  "user": "618d4ca9b4f7ff5bf2d8c82f",
  "tempPassword": "temporal12345",
  "date": "20/09/2026"
}
```
*(Note: `date` is optional and defaults to America/Lima current date `DD/MM/YYYY`)*
- Returns: `{ ok: true, temp: TempEntity }` with status 201.

### Delete Temporary Password
`DELETE /v1/temps/:id`
- Protected: `ADMIN`, `BASE_SEGURIDAD`.
- Returns: `{ ok: true, msg: "Temporal eliminado" }`.
