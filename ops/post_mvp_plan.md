# Post-MVP System Plan: Monitoring, Queue Architecture, and Roadmap

---

## 2. Monitoring Dashboard

### Core Metrics

- Evaluations per minute
- Success vs failure counts
- Retry count and average attempts
- Time to sellable status (latency)
- State distribution (NOT_READY, ELIGIBLE, SELLABLE, PUBLISHED)

### Dashboard Layout

1. **System Health:** success rate, failures, retries
2. **Pipeline Timing:** average and max latency
3. **Funnel:** supplier progression through states
4. **Errors:** NotFoundError frequency and unexpected errors

### Implementation

- Use logs or SQL queries for initial metrics
- Example: evaluations per hour query

---

## 3. Queue-Based V2 (Durability Upgrade)

### Problem

Current system uses in-memory async execution (`setImmediate`), which can lose jobs on crash.

### Solution

Introduce a job queue system for durability and retries.

#### Option A: Database-backed Queue

`jobs` table structure:
- `id`, `type`, `payload` (JSONB), `status`, `attempts`, `run_at`, `created_at`

**Flow:**
- Onboarding inserts job
- Worker polls jobs and executes `evaluateSupplier`
- Retries update `attempts` and `run_at`

#### Option B: External Queue (future)

- Redis + BullMQ, SQS, or Kafka

### Retry Strategy

- attempt 1: immediate
- attempt 2: +10s
- attempt 3: +30s
- attempt 4: +2min

### Benefits

- No lost evaluations
- Persistent retries
- Visibility into failed jobs

---

## 4. Post-MVP Roadmap (V2)

### Reliability

- Replace `setImmediate` with queue
- Persist retries
- Dead-letter queue

### Observability

- Metrics dashboard
- Alerting on failures
- Correlation tracing

### Performance

- Batch processing
- Worker concurrency

### Data Integrity

- Prevent duplicate evaluations
- Add constraints if needed

### UX / Product

- Admin re-evaluation tools
- Display evaluation history

### AI Pipeline

- Retry scoring separately
- Track latency

### Infrastructure

- Introduce queue system
- Separate worker service

---

## Known Limitations (MVP)

- In-memory async execution
- Limited retry window
- No guaranteed execution on crash

## Upgrade Priority

1. Queue system
2. Monitoring dashboard
3. Alerting
4. Admin tools
