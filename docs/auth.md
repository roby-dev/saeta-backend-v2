# Auth Module

Auth is the first migrated SAETA module. It reads the legacy `users` MongoDB collection without exposing registration or user-management endpoints.

## Boundary

- `domain` owns roles and the repository contract.
- `application` owns `SignInCommand` and `GetCurrentUserQuery` handlers.
- `infrastructure` maps the legacy user document through Mongoose.
- `presentation` validates HTTP input and applies JWT authentication.

## HTTP Contract

`POST /v1/auth/login`

```json
{ "email": "operator@example.com", "password": "password" }
```

Returns a short-lived `accessToken`. Supply it to protected endpoints as `Authorization: Bearer <token>`.

`GET /v1/auth/me` returns only `id`, `email`, and `role`. The handler reads the user again, so disabling or deleting an account invalidates the token for protected operations.

## Migration Rule

Do not point this service at the legacy production database until all leaked credentials have been rotated. Use a dedicated database user with the minimum permissions required for the current migration phase.
