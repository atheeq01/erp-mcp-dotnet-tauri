# Runbook: auth-service

## Service Overview
The `auth-service` manages user identity, password hashing, session tokens, JWT issuance, and OAuth2 federation.

## Incident Classification
- **SEV-1 (CRITICAL)**: Total inability for users to log in or validate session tokens across ERP and customer portals.
- **SEV-2 (HIGH)**: Redis session store unreachable, falling back to database token lookup with elevated latency.
- **SEV-3 (MEDIUM)**: Single OAuth provider (e.g., Google or Microsoft) handshake failures.

## Troubleshooting Steps

### 1. Redis Session Store Latency / Cache Misses
1. Verify Redis cluster memory utilization (`INFO memory`).
2. If memory > 90%, inspect cache eviction policy (`maxmemory-policy volatile-lru`).
3. Flush expired sessions if zombie keys accumulate.

### 2. JWT Signing Key Invalidation
1. If clients report `Invalid signature` errors en masse:
   - Check JWKS endpoint synchronization.
   - Verify server clock synchronization (NTP drift > 5000ms invalidates tokens).

## Escalation Path
1. **Primary On-Call**: Identity & Security Team (`oncall-auth`).
2. **Secondary On-Call**: SRE Lead (`sre-lead`).
