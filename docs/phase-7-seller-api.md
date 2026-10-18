# ZONA Parts — Seller API boundary

Seller operations now have protected development routes:

- `GET /api/v1/seller/overview`
- `GET /api/v1/seller/offers`

Both require `Authorization: Bearer <SELLER or ADMIN token>` and an `x-store-id` header. The adapter returns only offers for that store and a small dashboard summary.

In production, `storeId` must come from the authenticated seller-store relation, never from a client-controlled header. The next seller increment is create/edit offer, inventory transactions, seller order queue, and audit events.
