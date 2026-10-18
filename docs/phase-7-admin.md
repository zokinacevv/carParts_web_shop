# ZONA Parts — Phase 7 admin and seller operations

The operations boundary now has a development adapter for platform moderation.

## Routes

- `GET /api/v1/admin/overview`
- `GET /api/v1/admin/stores`
- `PATCH /api/v1/admin/stores/:storeId/status` with `{ "status": "APPROVED" }`

## Admin responsibilities

- approve, reject, suspend, and review stores;
- monitor active users, pending stores, master products, offers, orders, and zero-result searches;
- later manage product duplicates, compatibility, categories, brands, reviews, promotions, and notifications.

The adapter is intentionally small and unauthenticated for local development. Before production, admin routes require authentication, an ADMIN role guard, audit logs, and authorization tests. The next phase is production hardening: authentication, Prisma migrations, validation, rate limiting, observability, and E2E regression coverage.
