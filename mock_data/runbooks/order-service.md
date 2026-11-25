# Runbook: order-service

## Service Overview
The `order-service` manages inbound customer and ERP orders, checkout workflows, inventory reservation calls, and transaction finalization.

## Incident Classification
- **SEV-1 (CRITICAL)**: Error rate > 5%, order queue backlog > 5,000, or upstream inventory-service dependency failure.
- **SEV-2 (HIGH)**: P95 latency > 2000ms, partial checkout failures, or intermittent upstream timeouts.
- **SEV-3 (MEDIUM)**: Order processing queue depth rising, non-blocking notification delays.

## Troubleshooting Steps

### 1. Upstream Timeout Calling inventory-service
If logs display `Order creation failed: upstream timeout calling inventory-service after 3000ms`:
1. Check `service-config.yaml` for client timeout settings:
   - Default safe timeout is 30000ms. If timeout was reduced to 3000ms with `max_retries: 0`, revert timeout configuration.
2. Check upstream `inventory-service` health and p95 latency:
   - If `inventory-service` p95 is ~3200ms, the 3000ms client timeout causes immediate timeouts.
3. If order queue backlog is growing:
   - Increase timeout to 30000ms and restore retry policies.
   - Note: If no automated rollback plan exists for v2.4.1, manually deploy previous stable image v2.4.0.
   - Command: `kubectl rollout restart deployment/order-service`.

### 2. Order Queue Backlog Remediation
1. Verify consumer concurrency in order processing pipeline.
2. Scale up order-service worker replicas: `kubectl scale deployment order-service --replicas=6`.
3. Monitor queue depth until backlog drains below 100 orders.

## Escalation Path
1. **Primary On-Call**: Orders Platform Team (`oncall-orders`).
2. **Secondary On-Call**: SRE Lead (`sre-lead`).
3. **Incident Commander**: Designate Commander for any SEV-1 incident lasting > 15 minutes.
