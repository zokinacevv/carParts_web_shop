# ZONA Parts — Phase 6 commerce

Commerce endpoints now model the core marketplace checkout boundary.

## Routes

- `GET /api/v1/cart`
- `POST /api/v1/cart/items` with `{ productId, storeId, quantity }`
- `POST /api/v1/orders` with customer data and grouped `sellerOrders`

## Rules implemented

- Cart lines point to a specific seller offer, not just a master product.
- Stock is checked before adding a line.
- Checkout groups lines by store.
- One parent order contains one seller order per store.
- Pickup has zero delivery fee in this adapter; delivery currently uses a placeholder local fee of 150 MKD.
- All seller order statuses start at `PENDING` and are ready for the seller workflow.

This is a development adapter. The production implementation will move cart/order state and stock decrement into Prisma transactions, with authentication and idempotency keys before launch.
