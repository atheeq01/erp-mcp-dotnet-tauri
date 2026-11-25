# Runbook: inventory-service

## Service Overview
The `inventory-service` manages warehouse inventory levels, stock reservation for incoming orders, SKU tracking, and catalog reconciliation across warehouses.

## Incident Classification
- **SEV-1 (CRITICAL)**: Database deadlock or complete inability to perform stock reservations, blocking checkout.
- **SEV-2 (HIGH)**: Inventory query p95 latency > 3000ms during peak load or warehouse sync.
- **SEV-3 (MEDIUM)**: Background warehouse batch sync delayed.

## Troubleshooting Steps

### 1. Elevated Query Latency & Stock Reservation Delays
1. Inspect active database queries on `inventory_reservations` and warehouse stock tables:
   - Run `SELECT count(*) FROM pg_stat_activity WHERE state = 'active';`.
2. Check if background warehouse re-indexing is running concurrently with checkout traffic.
3. If recent deployment introduced a regression:
   - Roll back to the previous stable release commit:
     `kubectl rollout undo deployment/inventory-service`.
4. Scale up service replicas: `kubectl scale deployment inventory-service --replicas=4`.

### 2. Stock Allocation Deadlocks
1. Inspect locking order on SKU reservation transactions.
2. Terminate blocking backend queries if deadlock persists.

## Escalation Path
1. **Primary On-Call**: Inventory Team (`oncall-inventory`).
2. **Secondary On-Call**: SRE Lead (`sre-lead`).
