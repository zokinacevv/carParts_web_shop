# ZONA Parts — Authentication baseline

The API now has a development authentication boundary:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me` with `Authorization: Bearer <token>`

Passwords are hashed with Node's `scrypt` and a random salt. Sessions use cryptographically random bearer tokens and return only safe user fields.

Before production, move sessions to Redis or a database, add refresh-token rotation or secure cookie sessions, email verification, password reset, account lockout, role guards, CSRF protection for cookie auth, and audit events. The current in-memory store is intentionally a local development adapter.

Admin endpoints now require `Authorization: Bearer <admin-token>` and accept only the `ADMIN` role. A seller role will be able to access only its own store and offer resources once those modules are added.
