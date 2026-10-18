# ZONA Parts — Phase 8 production hardening

The API adapter now includes the first production-safety layer.

## Implemented

- request IDs for tracing API calls;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- strict referrer policy;
- restrictive content security policy for the API;
- per-client in-memory rate limiting for local development;
- health response includes the request ID.

## Production checklist

- replace in-memory rate limiting with Redis;
- add secure sessions/JWT refresh rotation and ADMIN/SELLER role guards;
- add Prisma migrations and transactional stock decrement;
- validate every DTO with a shared schema library;
- add structured logging, error tracking, audit logs, backups, and metrics;
- add unit, integration, API, and critical E2E tests;
- configure real CORS origins, secure cookies, HTTPS, upload validation, and secrets management;
- move search, catalog, cart, and order state from the adapter to PostgreSQL.

This completes the first end-to-end architecture pass. The next work is production implementation depth rather than adding disconnected screens.
