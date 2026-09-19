# SAETA Backend v2

Modern municipal emergency alert and security dispatch backend for the **SAETA** platform. Migrated from legacy Express + Mongoose to a modular **NestJS v12** architecture applying **Clean/Hexagonal Architecture**, **CQRS (Command Query Responsibility Segregation)**, strict **RBAC (Role-Based Access Control)**, and **Grafana-ready Telemetry**.

---

## Architecture Principles

The codebase strictly enforces Clean / Hexagonal Architecture boundaries across all modules:

```text
src/<module>/
├── domain/            # Entities, value objects, domain logic, and Repository port interfaces
├── application/       # CQRS Command Handlers, Query Handlers, and application use cases
├── infrastructure/    # Persistence (Mongoose Schemas/Repositories) and external adapters
└── presentation/      # HTTP Controllers, Guards, Interceptors, and DTOs (class-validator)
```

- **Independent Domain**: Zero framework dependencies in domain entities and repository contracts.
- **CQRS Pattern**: Every write operation is an isolated Command Handler; every read operation is an isolated Query Handler.
- **100% Database Parity**: Directly compatible with existing MongoDB Atlas (`SaetaDB`) collections (`users`, `alerts`, `states`, `types`, `temps`).
- **Observability First**: Structured NDJSON logs for Grafana Loki, native Prometheus metrics on `/metrics`, and distributed request correlation via `x-correlation-id`.

---

## Modules Directory

| Module          | Description                                                                   | Endpoints                                                                     | Documentation                                  |
| --------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| **`auth`**      | JWT authentication, role guards, token issuance, and profile verification     | `POST /v1/auth/login`, `GET /v1/auth/me`                                      | [`docs/auth.md`](docs/auth.md)                 |
| **`users`**     | Citizen & security personnel management, password changes, emergency contacts | `GET`, `POST`, `PUT`, `PATCH /v1/users`, `/v1/users/pass`                     | [`docs/users.md`](docs/users.md)               |
| **`alerts`**    | Emergency incident tracking, personnel dispatch, status lifecycle, ratings    | `GET`, `POST`, `PUT`, `PATCH`, `DELETE /v1/alerts`, `/v1/alerts/:id/feedback` | [`docs/alerts.md`](docs/alerts.md)             |
| **`states`**    | Alert lifecycle status catalog (`Pendiente`, `En proceso`, `Resuelta`, etc.)  | `GET`, `POST`, `PUT`, `PATCH /v1/states`, `/v1/states/:id`                    | [`docs/states-types.md`](docs/states-types.md) |
| **`types`**     | Alert incident type catalog (`Robo`, `Incendio`, `Emergencia Médica`, etc.)   | `GET`, `POST`, `PUT`, `PATCH /v1/types`, `/v1/types/:id`                      | [`docs/states-types.md`](docs/states-types.md) |
| **`temps`**     | Temporary password management for operators and field security personnel      | `GET`, `POST`, `DELETE /v1/temps`, `/v1/temps/user/:userId`                   | [`docs/temps.md`](docs/temps.md)               |
| **`uploads`**   | Decoupled media storage (local UUID storage with Google Drive fallback)       | `PUT /v1/uploads/:id`, `GET /v1/uploads/:photo`                               | [`docs/uploads.md`](docs/uploads.md)           |
| **`telemetry`** | Prometheus metrics, structured JSON logger, and global exception filtering    | `GET /metrics`                                                                | [`docs/telemetry.md`](docs/telemetry.md)       |

---

## Role-Based Access Control (RBAC)

SAETA defines four hierarchical roles:

1. **`ADMIN`**: Full municipal administrator access across all records, catalog mutations, and personnel rosters.
2. **`BASE_SEGURIDAD`**: Security dispatch base operators. Manages alerts, changes alert states, and provisions temporary passwords.
3. **`PERSONAL_SEGURIDAD`**: Field patrol and security personnel. Attends assigned alerts and updates status.
4. **`CIUDADANO`**: Registered citizens. Can emit emergency alerts, view own alert history, and rate attended interventions.

---

## Environment Configuration

Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/saeta
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=15m
CORS_ORIGIN=http://localhost:4200,http://localhost:3000
LOG_FORMAT=json # Optional: 'json' forces NDJSON for Loki in development
```

---

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Development

```bash
# Run with hot-reload
npm run start:dev

# Run in debug mode
npm run start:debug
```

### 3. Production Build

```bash
# Compile TypeScript to dist/
npm run build

# Run production server
npm run start:prod
```

---

## Observability & Grafana Stack

A complete telemetry stack pre-configured with Prometheus, Loki, Promtail, and Grafana is included:

```bash
docker compose -f docker-compose.telemetry.yml up -d
```

| Service        | Port   | Default Credentials | Description                                        |
| -------------- | ------ | ------------------- | -------------------------------------------------- |
| **Grafana**    | `3001` | `admin` / `admin`   | Dashboards & log exploration                       |
| **Prometheus** | `9090` | —                   | Scrapes `http://host.docker.internal:3000/metrics` |
| **Loki**       | `3100` | —                   | Centralized log ingestion                          |

---

## Quality Assurance & Testing

```bash
# Run unit tests (75+ tests across all modules)
npm test

# Run tests in watch mode
npm run test:watch

# Run linter with type-aware analysis (Oxlint)
npm run lint

# Format code with Prettier
npm run format
```

---

## API Testing with Postman

A pre-configured Postman collection is included in the root directory:

📁 [`saeta-v2.postman_collection.json`](saeta-v2.postman_collection.json)

- Pre-configured folders for all 7 modules: **Auth**, **Users**, **Alerts**, **States**, **Types**, **Temps**, and **Uploads**.
- Automated test scripts that auto-capture and propagate authentication tokens and entity IDs (`userId`, `alertId`, `stateId`, `typeId`, `tempId`).
