# ZONA Parts — Architecture baseline

This document translates `auto_parts_marketplace_master_specification.pdf` into the first implementation baseline.

## A. Architecture review

- The current app is a Vite/React presentation demo. Products, categories, prices, cart state, and image URLs are hard-coded in the frontend.
- The marketplace cannot be safely extended with only frontend state: compatibility, stock, seller ownership, order snapshots, and multi-seller checkout require a database and transactional API.
- A physical product and a seller's price must be separate records. `MasterProduct` owns identity and compatibility; `SellerOffer` owns price, stock, delivery, and seller-specific data.
- A single customer checkout must create one parent `Order` and one `SellerOrder` per store. This preserves the future payment/split-payment boundary.
- Compatibility must be relational (`ProductCompatibility -> VehicleVariant`), never a free-text claim in the UI.
- Categories, brands, vehicles, sellers, prices, users, and products must come from the API/database rather than frontend constants.
- V1 deliberately excludes online payment, VIN decoding, AI features, native apps, and an owned courier network, while keeping provider interfaces for them.

## B. Final technology stack

- Frontend: React + TypeScript during the current migration; Next.js can be introduced when public SEO routes are implemented.
- Backend: NestJS + TypeScript, versioned REST API under `/api/v1`.
- Database: PostgreSQL with Prisma.
- Search MVP: PostgreSQL full-text/trigram indexes; provider abstraction for Meilisearch/Elasticsearch later.
- Auth: secure sessions or short-lived JWT plus refresh tokens; RBAC for CUSTOMER, SELLER, and ADMIN.
- Files: S3-compatible storage or Cloudinary through a storage provider.
- Cache/queues: Redis when search, notifications, or delivery integrations require it.
- Validation/testing: strict TypeScript, DTO validation, unit/integration/API/E2E tests.

## C. Project structure

```text
apps/
  web/                 # customer, seller, and admin web clients
  api/                 # NestJS REST API
packages/
  db/                  # Prisma schema, migrations, seed
  contracts/            # shared DTOs and API types
  config/               # environment parsing and validation
  providers/           # payment, VIN, search, storage, delivery, notifications
docs/
  architecture.md
```

API modules: auth, users, sellers, stores, products, offers, categories, brands, vehicles, compatibility, search, cart, orders, inventory, reservations, messages, reviews, notifications, promotions, and admin.

## D. Database architecture

The central relationships are:

```text
VehicleMake -> VehicleModel -> VehicleGeneration -> VehicleEngine -> VehicleVariant
MasterProduct -> ProductCompatibility -> VehicleVariant
MasterProduct -> SellerOffer -> Store -> SellerProfile
Cart -> CartItem -> SellerOffer
Order -> SellerOrder -> OrderItem -> SellerOffer
```

Core entities: User, UserAddress, SellerProfile, Store, StoreWorkingHours, StoreDeliveryZone, vehicle entities, Category, Brand, MasterProduct, ProductImage, ProductOEM, ProductCompatibility, SellerOffer, Inventory, Cart, CartItem, Order, SellerOrder, OrderItem, Reservation, MessageThread, Message, Review, Favorite, Notification, Promotion, Subscription, AuditLog.

## E. Prisma schema baseline

The first schema must enforce:

- unique normalized OEM numbers and seller SKU per store;
- one seller offer per store/master-product combination;
- unique product compatibility pairs;
- immutable order item snapshots for name, SKU, quantity, and price;
- explicit order and seller-order status enums;
- indexes for OEM, part number, EAN, brand, category, vehicle, price, stock, and store;
- timestamps and soft-deactivation/status fields instead of unsafe hard deletes for marketplace records.

## F. API architecture

Public examples:

```text
GET  /api/v1/search?q=brembo&vehicleId=...
GET  /api/v1/products/:slug
GET  /api/v1/stores/:slug
GET  /api/v1/vehicles/makes
POST /api/v1/carts/items
POST /api/v1/orders
```

Protected areas use role guards and resource ownership checks. Seller routes can access only that seller's stores, offers, inventory, and seller orders. Admin routes have global access. Mutations use DTO validation and database transactions.

## G. Search architecture

Normalize the query, classify it as OEM/SKU/part number/brand/product/category/vehicle/natural language, then rank exact automotive identifiers and compatibility before name, stock, location, rating, and promotion. A promoted item may never bypass compatibility or relevance.

## H. Vehicle compatibility

The selector is Make -> Model -> Generation -> Year -> Engine -> Fuel -> Power. A saved `UserVehicle` becomes the active vehicle and filters results. The UI displays green/yellow/red compatibility only when the API returns structured evidence; unknown is never presented as a fit.

## I. Order architecture

The API creates one `Order` for the customer and one `SellerOrder` for each store. Each seller order has its own subtotal, delivery fee, delivery/pickup type, and status. Stock is decremented transactionally after validation to prevent overselling. V1 supports cash on delivery and pay at store; a future payment provider can attach without changing this model.

## J. Development roadmap

1. Foundation: monorepo, API, database, environment validation, auth, roles.
2. Automotive data: vehicles, brands, categories, master products, OEM, compatibility.
3. Sellers: registration, store approval, offers, inventory, seller dashboard.
4. Customer marketplace: home, search, store/product pages, Garage, favorites.
5. Commerce: multi-seller cart, checkout, delivery/pickup, orders, status, inventory.
6. Communication: messages, notifications, reviews.
7. Admin: seller/product/category/vehicle/order management and reports.
8. Hardening: SEO, caching, search optimization, security, migrations, and regression tests.

The existing demo UI will be retained only as a temporary shell while each data-backed flow replaces hard-coded state.

## Competitive benchmark and ZONA Parts direction

The benchmark is deliberately a combination of specialized strengths rather than a copy of any one product:

| Reference | Strength to learn from | ZONA Parts adaptation |
| --- | --- | --- |
| AUTODOC | Very large catalog, vehicle/key-number search, fitment guidance, maintenance planning, professional support, and a newer third-party marketplace | Start with trustworthy local inventory and structured compatibility; add Garage, service kits, repair history, and seller offers in later phases |
| RockAuto | Extremely direct catalog and part-number search with saved vehicles | Keep the speed and exact-identifier search, but provide a much clearer mobile UX, local stores, delivery/pickup, and compatibility confidence |
| PartSouq | OEM/part-number and VIN/frame-oriented lookup with genuine-part alternatives | Build OEM normalization and cross-reference search; keep VIN as a replaceable provider rather than a V1 dependency |
| Wolt | Product-first discovery, local merchant marketplace, pickup/delivery choice, merchant tooling, and a single order journey | Make the active vehicle the equivalent of Wolt's delivery location: it should shape every result, seller, offer, and order decision |

AUTODOC publicly describes vehicle/key-number search, compatibility assistance, maintenance planning, and a third-party marketplace; RockAuto exposes catalog and part-number search; PartSouq documents part-number and VIN/frame search; Wolt describes product-first discovery and local merchant commerce. These references support the direction, but do not replace ZONA's own product and data model.

## Product principles for a first Macedonian, then Balkan platform

1. **Trust before breadth.** A smaller catalog with verified compatibility, visible source, stock age, delivery promise, and seller rating is more valuable than thousands of uncertain listings.
2. **Local-first operations.** Start with Skopje, then Veles, Bitola, Stip, and Kumanovo; support Macedonian and English initially, then Albanian and neighboring-market localization through translation and currency modules.
3. **Search is the product.** Search by vehicle, OEM, manufacturer part number, brand, category, and natural language, but always rank exact automotive identifiers and structured fitment above promotion.
4. **One product, many offers.** Customers compare local sellers on one product page instead of navigating duplicate listings.
5. **Hybrid delivery.** Seller delivery and pickup are V1; platform courier integration is an adapter, not a database rewrite.
6. **Mobile-first, PWA-ready.** The responsive web app should install like an app and share contracts with future iOS/Android clients.
7. **AI as an assistant, never as fitment authority.** AI may interpret a request or suggest a category, but only verified structured compatibility can claim that a part fits.

## Recommended implementation choices

- Keep the current React client temporarily, but move toward a monorepo with `apps/web` and `apps/api` before adding more screens.
- Use Next.js for the customer-facing web layer once public product/store/brand routes and SEO are introduced; keep the API independent so mobile clients and integrations do not depend on the web framework.
- Use PostgreSQL + Prisma as the source of truth. Add Redis only for measured caching, queues, rate limits, and notifications—not as primary product state.
- Use OpenAPI-generated contracts and shared TypeScript DTOs so web, admin, seller tools, and mobile clients cannot drift.
- Add observability from the foundation: structured logs, request IDs, error tracking, audit logs for admin/seller mutations, and basic business metrics.
- Design provider interfaces now for search, VIN, storage, delivery, notifications, and payment; implement only the V1 providers needed for launch.

## Quality bar for launch

Every core flow must work on a phone and desktop, have loading/empty/error states, be keyboard accessible, and be covered by API and critical E2E tests. No page should present a compatibility claim, price, stock level, seller, or category that was invented in the frontend.
