# ZONA Parts — Phase 4 data layer

This phase adds the first production-oriented data contracts and PostgreSQL/Prisma schema.

## Implemented

- `packages/db/schema.prisma` defines users, sellers, stores, vehicle hierarchy, structured compatibility, master products, seller offers, inventory, carts, parent orders, seller orders, and historical order snapshots.
- `packages/contracts/src/index.ts` defines shared types for frontend/API boundaries.
- `.env.example` defines the minimum environment contract without committing secrets.

## Important invariants

- Compatibility is relational and never inferred from frontend text.
- One physical product is one `MasterProduct`; store price and stock live on `SellerOffer`.
- Cart items point to seller offers, enabling a multi-seller cart.
- Checkout creates one `Order` plus one `SellerOrder` per store.
- `OrderItem` stores product name, SKU, quantity, and price snapshots.
- Seller ownership and stock mutations must be checked inside database transactions.

## Next implementation

Add the NestJS API modules and Prisma migrations, seed Macedonia's initial cities/categories/brands, and replace the frontend fixtures with `GET /api/v1/search`, product offers, and cart endpoints.
