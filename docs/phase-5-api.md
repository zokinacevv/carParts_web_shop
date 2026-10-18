# ZONA Parts — Phase 5 API layer

The first versioned API boundary is now in place as a dependency-free local adapter. It intentionally mirrors the future NestJS/Prisma contract so the frontend can migrate without changing domain concepts.

## Routes

- `GET /api/v1/health`
- `GET /api/v1/search?q=brembo`
- `GET /api/v1/products/:masterProductId`
- `GET /api/v1/stores`

## Why this intermediate layer exists

It gives the UI a stable API shape immediately while PostgreSQL migrations, authentication, and provider integrations are built behind it. The in-memory catalog is temporary and must be replaced by Prisma queries before production launch.

## Roadmap status

There are 8 major roadmap phases. ZONA Parts has completed the design/UI foundation and the database/contracts foundation through Phase 4; Phase 5 is now in progress with the first API boundary. Remaining: commerce, communication, admin, and production hardening.
