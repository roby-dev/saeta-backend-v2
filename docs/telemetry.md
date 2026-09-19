# Telemetry & Observability Module

SAETA Backend v2 implements production-grade observability designed for **Grafana** (Prometheus metrics + Loki structured logs) and containerized microservice architectures.

---

## Architecture Boundaries

- **`domain`**:
  - `CorrelationContext`: Request-scoped context backed by Node.js `AsyncLocalStorage`. Propagates `traceId` across async calls without passing variables through function arguments.
- **`infrastructure`**:
  - `StructuredLoggerService`: NDJSON (Newline Delimited JSON) logging to `stdout` in production, colorized in development. Injects `traceId`, `timestamp`, `level`, and serialized error stacks.
  - `PrometheusService`: Centralized metrics registry exposing standard Node.js runtime metrics (Heap, Event Loop lag, CPU) and custom HTTP traffic metrics.
- **`presentation`**:
  - `CorrelationMiddleware`: Extracts or generates `x-correlation-id` / `x-request-id` header for request tracing.
  - `LoggingInterceptor`: Measures request latency (`durationMs`), observes duration histograms, and logs traffic.
  - `GlobalExceptionFilter`: Intercepts unhandled exceptions, sanitizes client responses, records error metrics, and emits full error stack traces with request metadata.
  - `MetricsController`: Exposes `GET /metrics` for Prometheus scraping.

---

## Exposed Metrics (`GET /metrics`)

| Metric Name | Type | Labels | Description |
|---|---|---|---|
| `http_requests_total` | Counter | `method`, `route`, `status_code` | Total HTTP requests handled |
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | Latency distribution with buckets (5ms to 5s) |
| `http_errors_total` | Counter | `method`, `route`, `error_type` | Total errors categorized by exception type |
| `saeta_nodejs_eventloop_lag_seconds` | Gauge | — | Event loop delay indicator |
| `saeta_process_cpu_user_seconds_total` | Counter | — | CPU utilization |
| `saeta_nodejs_heap_size_used_bytes` | Gauge | — | Memory footprint |

---

## Quickstart: Running Grafana Observability Stack

A complete pre-configured Docker Compose environment is provided:

```bash
docker compose -f docker-compose.telemetry.yml up -d
```

### Services & Ports:

- **Grafana**: [http://localhost:3001](http://localhost:3001) (`admin` / `admin`)
  - Datasources (Prometheus & Loki) are pre-provisioned automatically.
- **Prometheus**: [http://localhost:9090](http://localhost:9090)
- **Loki**: [http://localhost:3100](http://localhost:3100)

### Grafana LogQL Examples:
```logql
# Filter errors in SAETA backend
{container="saeta-backend"} | json | level="ERROR"

# Search logs by a specific Trace ID
{container="saeta-backend"} | json | traceId="c2a5e4d2-..."
```
