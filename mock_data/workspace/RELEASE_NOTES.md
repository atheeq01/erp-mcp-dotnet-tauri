# Release Notes - SPIL Operations Platform

## Version 2.4.2 (Upcoming Release Candidate)
- **order-service**:
  - Hotfix: Restore inventory-service call timeout to 30000ms and reinstate exponential backoff retries.
  - Drain order queue backlog and restore circuit breaker to CLOSED.
- **auth-service**:
  - Optimized Redis session token lookup caching.
  - Verified healthy and READY for release.
- **inventory-service**:
  - Re-indexing warehouse stock tables following rollback of v3.1.2.

## Version 2.4.1 (Deployed 2026-11-20 - Unhealthy)
- **order-service**:
  - Lowered inventory-service call timeout from 30000ms to 3000ms (set max_retries: 0).
  - Note: Deployed with no rollback plan documented.

## Version 2.4.0 (Stable Release)
- **order-service**:
  - Added support for batch order fulfillment.
  - Routine dependency security updates.
