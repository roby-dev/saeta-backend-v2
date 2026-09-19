# Alerts Module

The Alerts module is the incident management core of SAETA. It coordinates emergency alerts triggered by citizens, tracking alert status lifecycle (Pendiente -> En proceso -> Resuelta / Cancelada), assigning attending security personnel, and capturing citizen rating feedback.

## Architecture Boundaries

- `domain`: Owns `AlertEntity`, summaries (`AlertUserSummary`, `AlertTypeSummary`, `AlertStateSummary`), and `AlertRepository` port.
- `application`: CQRS Commands (`CreateAlertCommand`, `UpdateAlertCommand`, `UpdateAlertFeedbackCommand`, `DeletePendingAlertsCommand`) and Queries (`GetAlertsQuery`, `GetAlertByIdQuery`, `GetAlertsByUserQuery`, `GetAlertsByAttendedUserQuery`).
- `infrastructure`: Maps MongoDB `alerts`, `types`, and `states` collections via Mongoose schemas.
- `presentation`: Exposes `/v1/alerts` routes with `JwtAuthGuard` and `RolesGuard` authentication.

## HTTP Contract

### Create Alert
`POST /v1/alerts`
- Protected: Citizen / Authenticated user.
- Enforces:
  - Account must not be `INHABILITADO`.
  - User cannot trigger a new alert if they already have an active alert with status `Pendiente`.
  - Generates creation timestamp in America/Lima timezone (`DD/MM/YYYY,HH:mm:ss`).

```json
{
  "latitude": -18.0134,
  "longitude": -70.2512,
  "type": "615e3b0c55bc167109440f36"
}
```

### List Alerts (Paginated)
`GET /v1/alerts?page=1&limit=20&stateId=...&typeId=...`
- Protected: `ADMIN`, `BASE_SEGURIDAD`, `PERSONAL_SEGURIDAD`.
- Returns `{ ok: true, alerts: [], total: 0, page: 1, limit: 20, totalPages: 0 }` with populated user, attending personnel, type, and state information.

### Get Alert By ID
`GET /v1/alerts/:id`
- Protected: Authenticated users.
- Returns `{ ok: true, alerts: AlertEntity }`.

### Update Alert
`PATCH /v1/alerts/:id` (and alias `PUT /v1/alerts/:id`)
- Protected: `ADMIN`, `BASE_SEGURIDAD`, `PERSONAL_SEGURIDAD`.
- When updated by `PERSONAL_SEGURIDAD`, auto-assigns `attendedBy` and records `attentionDate`.

```json
{
  "state": "6163a83ec89043838a76243a",
  "attendedBy": "615e3edaffa76545b2518743"
}
```

### Rate / Add Feedback to Alert
`PATCH /v1/alerts/:id/feedback` (and alias `PUT /v1/alerts/commentary/:id`)
- Protected: Owner citizen or `ADMIN`.
- Allows rating the intervention from 1 to 5 and adding closing commentary.

```json
{
  "commentary": "Llegaron rápido al lugar",
  "score": 5
}
```

### Get Alerts by Citizen
`GET /v1/alerts/user/:id`
- Protected: Resource owner citizen or `ADMIN`, `BASE_SEGURIDAD`.

### Get Alerts by Attending Personnel
`GET /v1/alerts/attended/:id`
- Protected: Attending personnel themselves or `ADMIN`, `BASE_SEGURIDAD`.

### Delete Pending Alerts
`DELETE /v1/alerts`
- Protected: `ADMIN`, `BASE_SEGURIDAD`.
