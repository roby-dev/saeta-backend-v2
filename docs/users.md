# Users Module

The Users module manages user identity profiles, roles, and administrative user operations within SAETA. It maintains compatibility with the legacy `users` MongoDB collection while enforcing Clean Architecture, CQRS, and role-based access control (RBAC).

## Architecture Boundaries

- `domain`: Owns the `UserEntity`, `EmergencyContact` value object, `AccountStatus` types, and the `UserRepository` port.
- `application`: Houses CQRS commands (`CreateUserCommand`, `UpdateUserCommand`, `ChangePasswordCommand`, `VerifyPasswordCommand`) and queries (`GetUsersQuery`, `GetUserByIdQuery`, `GetSecurityPersonnelQuery`).
- `infrastructure`: Maps the MongoDB `users` collection via Mongoose (`UserSchema`) and implements the `UserRepository` interface in `MongooseUserRepository`.
- `presentation`: Exposes `/v1/users` endpoints protected by `JwtAuthGuard` and `RolesGuard`, parsing input via declarative DTOs (`class-validator`).

## HTTP Contract

### Create User
`POST /v1/users` (Public or Authenticated)
- When called unauthenticated or by non-admin users, assigns the default `CIUDADANO` role to prevent privilege escalation.
- When called by `ADMIN` or `BASE_SEGURIDAD`, allows provisioning elevated roles (`PERSONAL_SEGURIDAD`, `BASE_SEGURIDAD`, `ADMIN`).
- Enforces unique DNI (8 digits), unique phone (9 digits), and unique email.

```json
{
  "name": "Juan",
  "lastname": "Perez",
  "dni": "12345678",
  "phone": "987654321",
  "email": "juan.perez@example.com",
  "password": "securePassword123",
  "role": "CIUDADANO"
}
```

### List Users (Paginated)
`GET /v1/users?page=1&limit=10&role=CIUDADANO`
- Protected: `ADMIN`, `BASE_SEGURIDAD`.
- Returns `{ ok: true, users: [], total: 0, page: 1, limit: 10, totalPages: 0 }`.

### List Security Personnel
`GET /v1/users/security-personnel` (and alias `GET /v1/users/personal/all`)
- Protected: `ADMIN`, `BASE_SEGURIDAD`.
- Returns all users with role `PERSONAL_SEGURIDAD` and status `HABILITADO`.

### Get User Profile
`GET /v1/users/:id` (and alias `GET /v1/users/id/:id`)
- Protected: `ADMIN`, `BASE_SEGURIDAD`, or self (`id === user.sub`).

### Update User Profile
`PATCH /v1/users/:id` (and alias `PUT /v1/users/:id`)
- Protected: `ADMIN`, `BASE_SEGURIDAD`, or self.
- Updating `statusAccount` is restricted to privileged roles (`ADMIN`, `BASE_SEGURIDAD`).
- Maximum 5 emergency contacts permitted.

### Change Password
`PATCH /v1/users/:id/password` (and alias `POST /v1/users/change`)
- Protected: `ADMIN` or self.
- When performed by self, requires `currentPassword` verification.

### Verify Password
`POST /v1/users/pass`
- Protected: `ADMIN` or self.
- Validates password against current user hash. Returns `{ ok: boolean, msg: string }`.
