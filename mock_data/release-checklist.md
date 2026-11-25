# Mandatory Pre-Release Verification Checklist

All services undergoing staging promotion or production release must satisfy the following criteria:

## 1. Automated Testing & Verification
- [x] Unit & integration test pass rate must be 100%.
- [x] Code coverage threshold of at least 80% maintained on newly added code paths.
- [x] Static analysis security scan (SAST) passed with zero HIGH or CRITICAL severity vulnerabilities.

## 2. Telemetry & Log Health
- [x] Zero FATAL or unhandled ERROR logs in staging during the 2-hour soak period.
- [x] Target service health endpoint returns HTTP 200 OK with p99 latency under 200ms.
- [x] Error rate across all service endpoints must remain below 0.1%.

## 3. Database & Migrations
- [x] Database schema migrations tested forward and backward in staging.
- [x] Connection pool sizing verified against peak connection load (`max_connections` < 80% database server capacity).
- [x] All database queries in new endpoints profiled with `EXPLAIN ANALYZE` to avoid table scans.

## 4. Deployment Safety & Rollback Readiness
- [x] Rollback plan documented with target container tag and previous stable commit SHA.
- [x] Automated health check probes (`readinessProbe` and `livenessProbe`) configured.
- [x] Feature flags configured for high-risk capabilities with default disabled.
- [x] Primary on-call engineer acknowledged and monitoring active during release window (`oncall-auth`, `oncall-orders`, `oncall-inventory`, or `sre-lead`).

## Service Release Readiness Status
- **auth-service** (v1.9.0): Status: **READY** for release. Verified by `oncall-auth` and approved by `sre-lead`. All checklist criteria met.
- **order-service** (v2.4.1): Status: **BLOCKED** / UNHEALTHY. Violates Section 2 (FATAL order queue backlog) and Section 4 (NO rollback plan documented). Assigned to `oncall-orders`.
- **inventory-service** (v3.1.2): Status: **ROLLED BACK** to v3.1.1. Previous deployment failed. Assigned to `oncall-inventory`.
