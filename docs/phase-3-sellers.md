# ZONA Parts — Phase 3 seller network

Phase 3 establishes the seller side of the marketplace before connecting it to a production API.

## Seller lifecycle

`PENDING_APPROVAL -> APPROVED -> SUSPENDED` with `REJECTED` as a terminal review outcome. A seller cannot publish an offer until its store is approved.

## Store profile

Every store needs a public profile with name, slug, logo, address, city, coordinates, working hours, rating, review count, delivery zones, pickup availability, preparation time, contact channels, and active status.

## Offer rules

- A seller attaches an offer to an existing `MasterProduct` whenever the product already exists.
- Price and stock belong to the offer, never to the master product.
- Seller SKU is unique inside a store.
- Inventory changes are audited and cannot be edited by another seller.
- Out-of-stock offers remain visible only when explicitly enabled; they cannot be added to cart.
- Promoted offers must remain relevant to the selected vehicle and search query.

## Seller dashboard MVP

1. Store profile and approval state.
2. Offer list with price, old price, stock, SKU, delivery, pickup, active state.
3. Add existing master product / request a new product.
4. Inventory adjustments with low-stock threshold.
5. Seller order queue with accept/reject and status transitions.
6. Messages, reviews, and basic views/clicks/orders metrics.

## Authorization boundary

Seller users can read and mutate only their own seller profile, stores, offers, inventory, seller orders, messages, and reviews. Admin can approve sellers, merge duplicate master products, correct compatibility, and suspend stores. Customers see only public store and offer data.

## Next implementation step

Create the API and database modules for `SellerProfile`, `Store`, `StoreWorkingHours`, `StoreDeliveryZone`, `SellerOffer`, and `Inventory`; then replace the current frontend offer fixtures with API responses without changing the customer-facing `MasterProduct -> Offers` experience.
