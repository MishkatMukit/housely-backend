# Housely Backend API Documentation

This document describes the routes currently registered by the Express application. The application mounts 60 routes below `/api` and one root route, for 61 documented routes total. The route files are the source of truth for the paths and middleware shown here.

Base URL: `https://housely-backend-seven.vercel.app` (deployed). For local development use `http://localhost:5000` (the port comes from `PORT`).

## Endpoint index

The index contains 61 routes: the root route and every current `/api` route. Authentication uses the role names in the **Auth** column.

| # | Method | Path | Auth roles |
|---:|---|---|---|
| 1 | `GET` | `/` | Public |
| 2 | `POST` | `/api/auth/register` | Public |
| 3 | `POST` | `/api/auth/verify-email` | Public |
| 4 | `POST` | `/api/auth/login` | Public |
| 5 | `GET` | `/api/auth/me` | `ADMIN`, `SUPERADMIN`, `OWNER`, `TENANT` |
| 6 | `POST` | `/api/auth/refresh-token` | Any authenticated role |
| 7 | `POST` | `/api/auth/google` | Public |
| 8 | `POST` | `/api/auth/forgot-password` | Public |
| 9 | `POST` | `/api/auth/reset-password` | Public |
| 10 | `PATCH` | `/api/users/profile` | `ADMIN`, `SUPERADMIN`, `OWNER`, `TENANT` |
| 11 | `PATCH` | `/api/users/profile-image` | `ADMIN`, `SUPERADMIN`, `OWNER`, `TENANT` |
| 12 | `GET` | `/api/analytics/admin` | `ADMIN`, `SUPERADMIN` |
| 13 | `GET` | `/api/analytics/owner` | `OWNER` |
| 14 | `GET` | `/api/analytics/tenant` | `TENANT` |
| 15 | `GET` | `/api/admin/users` | `ADMIN`, `SUPERADMIN` |
| 16 | `GET` | `/api/admin/users/:id` | `ADMIN`, `SUPERADMIN` |
| 17 | `GET` | `/api/admin/tenants` | `ADMIN`, `SUPERADMIN` |
| 18 | `GET` | `/api/admin/owners` | `ADMIN`, `SUPERADMIN` |
| 19 | `GET` | `/api/admin/owners/applications` | `ADMIN`, `SUPERADMIN` |
| 20 | `PATCH` | `/api/admin/owners/:id/approve` | `ADMIN`, `SUPERADMIN` |
| 21 | `PATCH` | `/api/admin/owners/:id/reject` | `ADMIN`, `SUPERADMIN` |
| 22 | `PATCH` | `/api/admin/users/:id/make-admin` | `SUPERADMIN` |
| 23 | `PATCH` | `/api/admin/users/:id/block` | `ADMIN`, `SUPERADMIN` |
| 24 | `PATCH` | `/api/admin/users/:id/unblock` | `ADMIN`, `SUPERADMIN` |
| 25 | `DELETE` | `/api/admin/users/:id` | `ADMIN`, `SUPERADMIN` |
| 26 | `POST` | `/api/owner/apply` | `TENANT` |
| 27 | `GET` | `/api/owner/profile` | `OWNER` |
| 28 | `PATCH` | `/api/owner/update-profile` | `OWNER` |
| 29 | `GET` | `/api/owner/applications` | `OWNER` |
| 30 | `GET` | `/api/tenants/me` | `TENANT` |
| 31 | `PATCH` | `/api/tenants/me` | `TENANT` |
| 32 | `POST` | `/api/properties/` | `OWNER` (approved owner) |
| 33 | `GET` | `/api/properties/` | Public |
| 34 | `GET` | `/api/properties/:id` | Public |
| 35 | `GET` | `/api/properties/vacancy/:propertyId` | Public |
| 36 | `POST` | `/api/applications/` | `TENANT` |
| 37 | `GET` | `/api/applications/me` | `TENANT` |
| 38 | `GET` | `/api/applications/property/:propertyId` | `OWNER` |
| 39 | `DELETE` | `/api/applications/:id/withdraw` | `TENANT` |
| 40 | `GET` | `/api/applications/:id` | `OWNER`, `ADMIN`, `SUPERADMIN` |
| 41 | `PATCH` | `/api/applications/:id/approve` | `OWNER` |
| 42 | `PATCH` | `/api/applications/:id/reject` | `OWNER` |
| 43 | `GET` | `/api/leases/me` | `TENANT` |
| 44 | `GET` | `/api/leases/owner` | `OWNER` |
| 45 | `GET` | `/api/leases/:id` | `ADMIN`, `SUPERADMIN`, `OWNER`, `TENANT` |
| 46 | `PATCH` | `/api/leases/:id/terminate` | `OWNER`, `ADMIN`, `SUPERADMIN` |
| 47 | `POST` | `/api/payments/:id/checkout` | `TENANT` |
| 48 | `GET` | `/api/payments/callback` | Public |
| 49 | `POST` | `/api/payments/verify` | `TENANT`, `OWNER` |
| 50 | `GET` | `/api/payments/me` | `TENANT` |
| 51 | `GET` | `/api/payments/owner` | `OWNER`, `ADMIN`, `SUPERADMIN` |
| 52 | `POST` | `/api/variants/:propertyId` | `OWNER` |
| 53 | `GET` | `/api/variants/` | Public |
| 54 | `GET` | `/api/variants/:propertyId` | Public |
| 55 | `PATCH` | `/api/variants/:id` | `OWNER` |
| 56 | `DELETE` | `/api/variants/:id` | `OWNER` |
| 57 | `POST` | `/api/flats/variants/:id` | `OWNER` |
| 58 | `GET` | `/api/flats/` | Public |
| 59 | `GET` | `/api/flats/properties/:propertyId/` | Public |
| 60 | `PATCH` | `/api/flats/:id` | `OWNER` |
| 61 | `DELETE` | `/api/flats/:id` | `OWNER` |

There is no separate user-management route under `/api/users`; user listing and moderation are mounted under `/api/admin`. Owner application listing is `/api/owner/applications`, while the administrative review queue is `/api/admin/owners/applications`.

## Shared conventions

### Authentication and cookies

Protected routes accept an access JWT in either of these forms:

- `accessToken` cookie.
- `Authorization: Bearer <access-token>`.
- A raw `Authorization: <access-token>` value.

If both credentials are present, the `accessToken` cookie takes precedence. The role list on each route is enforced from the JWT role claim, while the freshly loaded database user supplies `req.user`. An authenticated user whose database status is `BLOCKED` is rejected; `DELETED` is not explicitly rejected by this middleware. Login, email verification, Google login, and token refresh set `accessToken` and `refreshToken` cookies with `httpOnly: true`, `secure: false`, and `sameSite: "none"`. The cookie max ages are 24 hours for the access token and 7 days for the refresh token. CORS is configured for `APP_URL` with credentials enabled.

`POST /api/auth/refresh-token` first passes the normal access-token middleware and then requires the `refreshToken` cookie; it does not accept a refresh token in a request body or query string.

### Successful response envelope

Controllers that use `sendResponse` return this JSON envelope. Properties whose value is `undefined` are omitted by JSON serialization.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Example message",
  "data": {}
}
```

List services return their pagination object inside `data`, not in the envelope's top-level `meta` field. Most list results therefore look like this:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Example list fetched successfully",
  "data": {
    "data": [],
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 0
  }
}
```

The payment list services are different: their `data` contains `data` and a `meta` object with only `page`, `limit`, and `total`; they do not return `totalPages`.

Dates in responses are ISO date-time strings. Prisma `Decimal` values (`monthlyIncome`, rent and advance amounts, overrides, lease amounts, and payment amounts) are JSON strings such as `"15000.00"`. Analytics totals are JavaScript numbers, not strings.

### Errors and unknown routes

Intentional `AppError` responses have this shape. `AppError` does not override JavaScript's `name`, so the current implementation reports `"Error"`, not `"AppError"`:

```json
{
  "success": false,
  "statusCode": 400,
  "name": "Error",
  "message": "Exact implementation message"
}
```

When `NODE_ENV=development`, Zod body, query, route, and parameter failures return status `400`, `name: "ZodError"`, `message: "Validation Error"`, and a comma-separated `path: message` string in the `error` property. In production, Zod is not an `AppError`, so the same failures are masked as:

```json
{
  "success": false,
  "statusCode": 500,
  "name": "Internal Server Error",
  "message": "Internal Server Error"
}
```

Common intentional statuses are `400` (validation/business rule), `401` (missing or invalid authentication), `403` (role/status/scope denial), `404` (resource or route not found), `409` (state conflict), and `500` (unexpected server error). Prisma errors are not specially mapped: duplicate keys, missing required records, and other Prisma errors currently become `500`. In development, non-`AppError` responses also include the original `name`, serialized `error`, and `stack`; production hides those fields and replaces the message with `Internal Server Error`.

An unknown route is not sent through `sendResponse`:

```http
GET /api/does-not-exist
```

```json
{
  "message": "Route not found",
  "path": "/api/does-not-exist",
  "date": "2026-09-25T10:00:00.000Z"
}
```

### Pagination

Validated list queries accept `page` and `limit` as positive integer query strings. The usual defaults are `page=1` and `limit=10`; validated limits are capped at `100`. Application, property, lease, user, tenant, owner, and flat list services calculate `totalPages` as `Math.ceil(total / limit)`. Payment lists return `meta.total` but no `totalPages`, and their query validation is currently not wired (see `GET /api/payments/me` and `GET /api/payments/owner`).

### Enums

| Enum | Values |
|---|---|
| `Role` | `TENANT`, `OWNER`, `ADMIN`, `SUPERADMIN` |
| `AuthProvider` | `CREDENTIAL`, `GOOGLE` |
| `UserStatus` | `ACTIVE`, `BLOCKED`, `DELETED` |
| `TenantStatus` | `ACTIVE`, `INACTIVE` |
| `OwnerStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `FlatStatus` | `AVAILABLE`, `OCCUPIED`, `MAINTENANCE`, `UNAVAILABLE` |
| `ApplicationStatus` | `PENDING`, `APPROVED`, `REJECTED`, `WITHDRAWN` |
| `LeaseStatus` | `PENDING`, `ACTIVE`, `INACTIVE`, `COMPLETED`, `TERMINATED`, `CANCELLED` |
| `PaymentStatus` | `PENDING`, `COMPLETED`, `FAILED` |
| `PaymentType` | `ADVANCE`, `MONTHLY_RENT` |

### Uploads

Upload endpoints use `multipart/form-data` and Multer memory storage, then Cloudinary. Multer accepts `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`, with a 5 MB per-file limit. The global Multer instance also sets a maximum of 4 files per request; therefore the `images` limits of 5 declared on property and variant routes are not effective beyond 4 files. The profile uploader lets Cloudinary infer the resource type, so a PDF can be uploaded there. Property and variant image uploaders force Cloudinary `resource_type: "image"`; a PDF passes Multer validation but can then fail during Cloudinary processing. Route-specific field names and count limits are documented with each endpoint.

### Validation and current implementation notes

- Body schemas marked strict reject unknown JSON fields. Query validation removes keys that are not in the route's Zod schema.
- On routes where `validateParams` or `validateQuery` appears before `auth`, malformed IDs/queries can produce `400` before an unauthenticated request would produce `401`. This is current middleware ordering, not an authorization bypass.
- The exact error text `No varients found` (including the typo) is returned by the property-scoped variant list when no variants exist.
- The exact error text `Property no found` (including the typo) is returned by the property-scoped flat list when the property does not exist.

### Example identifiers

The examples use these UUIDs consistently:

- Tenant user: `11111111-1111-4111-8111-111111111111`
- Tenant: `22222222-2222-4222-8222-222222222222`
- Owner user legacy tenant: `eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee`
- Owner user: `33333333-3333-4333-8333-333333333333`
- Owner: `44444444-4444-4444-8444-444444444444`
- Admin: `55555555-5555-4555-8555-555555555555`
- Property: `77777777-7777-4777-8777-777777777777`
- Variant: `88888888-8888-4888-8888-888888888888`
- Flat: `99999999-9999-4999-8999-999999999999`
- Application: `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`
- Lease: `cccccccc-cccc-4ccc-8ccc-cccccccccccc`
- Payment: `dddddddd-dddd-4ddd-8ddd-dddddddddddd`

Values such as names, URLs, dates, and analytics totals are representative. The field names, nesting, nulls, enums, and numeric/Decimal types follow the implementation.

## Root

### GET /

- **Auth:** Public.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** None.

**Request example**

```http
GET /
```

**Successful response — `200`**

```json
{
  "message": "Server is running",
  "author": "Mishkat Mahabub"
}
```

## Auth — `/api/auth`

### POST /api/auth/register

- **Auth:** Public.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** JSON, strict object. `name` is trimmed and must be 2–100 characters, `email` must be valid, and `password` must be 6–72 characters. The service stores a bcrypt hash, puts the registration data and six-digit OTP in Redis for five minutes, and sends the OTP by email. The user is not created until email verification.

**Request example**

```json
{
  "name": "Tenant One",
  "email": "tenant@example.com",
  "password": "secret123"
}
```

**Successful response — `201`**

The service returns `undefined`, so the `data` property is omitted from the serialized response.

```json
{
  "success": true,
  "statusCode": 201,
  "message": "OTP has been sent to tenant@example.com. Please verify your email to complete the registration process."
}
```

### POST /api/auth/verify-email

- **Auth:** Public.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** JSON, strict object with `email` and a six-digit `otp`. The OTP and temporary registration data expire after five minutes. Success creates an active `TENANT` user, creates its tenant profile, sends a welcome email, and sets both auth cookies.

**Request example**

```json
{
  "email": "tenant@example.com",
  "otp": "123456"
}
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Email verified successfully. Welcome aboard!",
  "data": {
    "user": {
      "id": "11111111-1111-4111-8111-111111111111",
      "email": "tenant@example.com",
      "address": null,
      "nationalIdNumber": null,
      "googleId": null,
      "authProvider": "CREDENTIAL",
      "emailVerified": true,
      "role": "TENANT",
      "createdAt": "2026-09-25T10:00:00.000Z",
      "updatedAt": "2026-09-25T10:00:00.000Z",
      "name": "Tenant One",
      "status": "ACTIVE",
      "deletedAt": null,
      "imagePublicId": "",
      "imageUrl": null,
      "isDeleted": false,
      "needPasswordChange": false,
      "gender": null
    },
    "tenant": {
      "id": "22222222-2222-4222-8222-222222222222",
      "userId": "11111111-1111-4111-8111-111111111111",
      "status": "ACTIVE",
      "employmentStatus": null,
      "aboutMe": null,
      "createdAt": "2026-09-25T10:00:00.000Z",
      "updatedAt": "2026-09-25T10:00:00.000Z",
      "contactNumber": null,
      "email": "tenant@example.com",
      "name": "Tenant One"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiJ9.access-token",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9.refresh-token"
  }
}
```

### POST /api/auth/login

- **Auth:** Public.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** JSON, strict object with `email` and a non-empty `password`. Credential users receive access and refresh tokens in both the JSON data and cookies. Errors are explicit: `404 User Not Found`, `403 User Is Blocked`, `403 User Is Deleted`, `400 Account Already Registered With Google` for Google-only accounts, and `401 Invalid Credentials` on a password mismatch.

**Request example**

```json
{
  "email": "tenant@example.com",
  "password": "secret123"
}
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User logged in successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9.access-token",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9.refresh-token"
  }
}
```

### GET /api/auth/me

- **Auth:** `ADMIN`, `SUPERADMIN`, `OWNER`, or `TENANT`.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** None.

**Request example**

```http
GET /api/auth/me
Authorization: Bearer <access-token>
```

**Successful response — `200`**

The returned user omits `password` and includes its `tenant` relation when one exists.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile fetched successfully",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "tenant@example.com",
    "address": "12 Road 5, Dhaka",
    "nationalIdNumber": "1234567890",
    "googleId": null,
    "authProvider": "CREDENTIAL",
    "emailVerified": true,
    "role": "TENANT",
    "createdAt": "2026-09-20T10:00:00.000Z",
    "updatedAt": "2026-09-25T10:00:00.000Z",
    "name": "Tenant One",
    "status": "ACTIVE",
    "deletedAt": null,
    "imagePublicId": "",
    "imageUrl": null,
    "isDeleted": false,
    "needPasswordChange": false,
    "gender": "MALE",
    "tenant": {
      "id": "22222222-2222-4222-8222-222222222222",
      "userId": "11111111-1111-4111-8111-111111111111",
      "status": "ACTIVE",
      "employmentStatus": "Software Engineer",
      "aboutMe": "Looking for a quiet home.",
      "createdAt": "2026-09-20T10:00:00.000Z",
      "updatedAt": "2026-09-25T10:00:00.000Z",
      "contactNumber": "01712345678",
      "email": "tenant@example.com",
      "name": "Tenant One"
    }
  }
}
```

### POST /api/auth/refresh-token

- **Auth:** Any authenticated role.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** None. The `refreshToken` cookie is required; an access token is also required by the route's auth middleware.

**Request example**

```http
POST /api/auth/refresh-token
Cookie: accessToken=<access-token>; refreshToken=<refresh-token>
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "New tokens generated successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9.new-access-token",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9.new-refresh-token"
  }
}
```

### POST /api/auth/google

- **Auth:** Public.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** JSON, strict object with a non-empty Google `idToken`. A verified Google tenant is logged in; an existing verified credential tenant is linked to the Google identity; otherwise a tenant user and profile are created. Tokens are returned in JSON and cookies.

**Request example**

```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6Imdvb2dsZSJ9.google-id-token"
}
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "New tokens generated successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9.google-access-token",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9.google-refresh-token"
  }
}
```

### POST /api/auth/forgot-password

- **Auth:** Public.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** JSON, strict object with a valid `email`. A six-digit OTP is stored in Redis for five minutes and emailed. This endpoint reveals account state instead of always returning `200`: an unknown email returns `404 User Not Found`, a blocked account `403 User Is Blocked`, an unverified account `403 Email Not Verified`, a deleted account `403 User Is Deleted`, and a Google-only account `400 Account Already Registered With Google`.

**Request example**

```json
{
  "email": "tenant@example.com"
}
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP sent to tenant@example.com successfully",
  "data": {}
}
```

### POST /api/auth/reset-password

- **Auth:** Public.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** JSON, strict object with `email`, six-digit `otp`, and `newPassword` (6–72 characters). The same account-state rules as `POST /api/auth/forgot-password` apply first; then a missing Redis key returns `400 OTP Expired. Please Request New OTP` and a mismatch returns `400 Invalid OTP`. The OTP is deleted after a successful reset and a reset-success email is sent. Password reset does not revoke already issued access or refresh JWTs.

**Request example**

```json
{
  "email": "tenant@example.com",
  "otp": "123456",
  "newPassword": "newsecret123"
}
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset successfully",
  "data": {}
}
```

## Users — `/api/users`

### PATCH /api/users/profile

- **Auth:** `ADMIN`, `SUPERADMIN`, `OWNER`, or `TENANT`.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** JSON, strict object. At least one field is required. `name` is 2–100 characters, `address` has at least 1 character, `gender` is `MALE` or `FEMALE`, and `nationalIdNumber` is 1–50 characters.
- **Current caveat:** Unlike `PATCH /api/tenants/me`, this endpoint writes only the `User` row. It does not update the linked `Tenant` or `Owner` records, so their denormalized `name` and `email` can become stale.

**Request example**

```json
{
  "name": "Tenant One Updated",
  "address": "12 Road 5, Dhaka",
  "gender": "MALE",
  "nationalIdNumber": "1234567890"
}
```

**Successful response — `200`**

The service returns the updated user with `password` omitted.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile updated successfully",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "tenant@example.com",
    "address": "12 Road 5, Dhaka",
    "nationalIdNumber": "1234567890",
    "googleId": null,
    "authProvider": "CREDENTIAL",
    "emailVerified": true,
    "role": "TENANT",
    "createdAt": "2026-09-20T10:00:00.000Z",
    "updatedAt": "2026-09-25T11:00:00.000Z",
    "name": "Tenant One Updated",
    "status": "ACTIVE",
    "deletedAt": null,
    "imagePublicId": "",
    "imageUrl": null,
    "isDeleted": false,
    "needPasswordChange": false,
    "gender": "MALE"
  }
}
```

### PATCH /api/users/profile-image

- **Auth:** `ADMIN`, `SUPERADMIN`, `OWNER`, or `TENANT`.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** `multipart/form-data` with exactly one binary field named `profileImage`. There are no JSON body fields. Multer accepts JPG, PNG, WEBP, or PDF up to 5 MB, despite the endpoint name. The previous Cloudinary asset is destroyed before the replacement is uploaded.

**Request example (multipart)**

```text
Content-Type: multipart/form-data

profileImage: <binary file, for example profile.jpg>
```

**Successful response — `201`**

The response omits `password`, `isDeleted`, `deletedAt`, `createdAt`, and `updatedAt` because the service explicitly omits those fields.

```json
{
  "success": true,
  "statusCode": 201,
  "message": "profile photo uploaded successfully",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "tenant@example.com",
    "address": "12 Road 5, Dhaka",
    "nationalIdNumber": "1234567890",
    "googleId": null,
    "authProvider": "CREDENTIAL",
    "emailVerified": true,
    "role": "TENANT",
    "name": "Tenant One Updated",
    "status": "ACTIVE",
    "imagePublicId": "housely/profile/tenant-one",
    "imageUrl": "https://res.cloudinary.com/housely/image/upload/profile.jpg",
    "needPasswordChange": false,
    "gender": "MALE"
  }
}
```

## Analytics — `/api/analytics`

Analytics values are calculated at request time. Counts and monetary totals in these responses are numbers.

### GET /api/analytics/admin

- **Auth:** `ADMIN` or `SUPERADMIN`.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** None.

**Request example**

```http
GET /api/analytics/admin
Authorization: Bearer <access-token>
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Admin analytics fetched successfully",
  "data": {
    "totalOwners": 12,
    "totalPendingOwnerApplications": 3,
    "totalApprovedOwners": 8,
    "totalRejectedOwners": 1,
    "totalTenants": 48,
    "totalProperties": 9,
    "totalFlats": 36,
    "availableFlats": 21,
    "totalActiveLeases": 15,
    "totalApplications": 64,
    "totalRevenue": 1250000
  }
}
```

### GET /api/analytics/owner

- **Auth:** `OWNER`.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** None.

**Request example**

```http
GET /api/analytics/owner
Authorization: Bearer <access-token>
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Owner analytics fetched successfully",
  "data": {
    "totalProperties": 3,
    "totalFlats": 12,
    "availableFlats": 7,
    "totalApplications": 18,
    "totalActiveLeases": 5,
    "totalEarnings": 450000,
    "pendingPayments": 8
  }
}
```

### GET /api/analytics/tenant

- **Auth:** `TENANT`.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** None.

**Request example**

```http
GET /api/analytics/tenant
Authorization: Bearer <access-token>
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tenant analytics fetched successfully",
  "data": {
    "totalApplications": 4,
    "totalApprovedApplications": 1,
    "totalRejectedApplications": 1,
    "totalActiveLeases": 1,
    "totalCompletedPayments": 14,
    "totalPendingPayments": 2,
    "totalSpent": 180000
  }
}
```

## Administration — `/api/admin`

Administration routes are mounted at `/api/admin`, not at the old `/api/owner` paths. Except where noted, their query or path validation runs before the role middleware.

### GET /api/admin/users

- **Auth:** `ADMIN` or `SUPERADMIN`.
- **Path parameters:** None.
- **Query parameters:** `page` (integer >= 1), `limit` (integer 1–100), `status` (`ACTIVE`, `BLOCKED`, or `DELETED`), `role` (`TENANT`, `OWNER`, `ADMIN`, or `SUPERADMIN`), and `search`. `search` matches user email or name case-insensitively. Defaults are `page=1` and `limit=10`. The service always adds `isDeleted=false`, so the accepted `status=DELETED` filter cannot match any row.
- **Request body:** None.

**Request example**

```http
GET /api/admin/users?page=1&limit=10&role=TENANT&status=ACTIVE&search=tenant
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users fetched successfully",
  "data": {
    "data": [
      {
        "id": "11111111-1111-4111-8111-111111111111",
        "email": "tenant@example.com",
        "name": "Tenant One",
        "role": "TENANT",
        "status": "ACTIVE",
        "emailVerified": true,
        "createdAt": "2026-09-20T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### GET /api/admin/users/:id

- **Auth:** `ADMIN` or `SUPERADMIN`.
- **Path parameters:** `id` (required UUID).
- **Query parameters:** None.
- **Request body:** None.

**Request example**

```http
GET /api/admin/users/33333333-3333-4333-8333-333333333333
Authorization: Bearer <access-token>
```

**Successful response — `200`**

The user omits `password` and includes nullable `tenant` and `owner` relations. This example shows an upgraded account that has both relations.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User fetched successfully",
  "data": {
    "id": "33333333-3333-4333-8333-333333333333",
    "email": "owner@example.com",
    "address": "12 Road 5, Dhaka",
    "nationalIdNumber": "1234567890",
    "googleId": null,
    "authProvider": "CREDENTIAL",
    "emailVerified": true,
    "role": "OWNER",
    "createdAt": "2026-09-20T10:00:00.000Z",
    "updatedAt": "2026-09-25T10:00:00.000Z",
    "name": "Owner One",
    "status": "ACTIVE",
    "deletedAt": null,
    "imagePublicId": "",
    "imageUrl": null,
    "isDeleted": false,
    "needPasswordChange": false,
    "gender": "MALE",
    "tenant": {
      "id": "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      "userId": "33333333-3333-4333-8333-333333333333",
      "status": "INACTIVE",
      "employmentStatus": null,
      "aboutMe": null,
      "createdAt": "2026-09-20T10:00:00.000Z",
      "updatedAt": "2026-09-25T10:00:00.000Z",
      "contactNumber": "01811112222",
      "email": "owner@example.com",
      "name": "Owner One"
    },
    "owner": {
      "id": "44444444-4444-4444-8444-444444444444",
      "userId": "33333333-3333-4333-8333-333333333333",
      "status": "APPROVED",
      "contactNumber": "01811112222",
      "verificationDocuments": [
        {
          "url": "https://res.cloudinary.com/housely/owner-verification/nid.jpg",
          "publicId": "housely/owner-verifications/owner-one/nid"
        }
      ],
      "rejectionReason": null,
      "reviewedBy": "55555555-5555-4555-8555-555555555555",
      "reviewedAt": "2026-09-22T09:00:00.000Z",
      "averageRating": null,
      "totalReviews": 0,
      "createdAt": "2026-09-21T09:00:00.000Z",
      "updatedAt": "2026-09-22T09:00:00.000Z",
      "rejectionHistory": []
    }
  }
}
```

### GET /api/admin/tenants

- **Auth:** `ADMIN` or `SUPERADMIN`.
- **Path parameters:** None.
- **Query parameters:** `page` (integer >= 1), `limit` (integer 1–100), `status` (`ACTIVE` or `INACTIVE`), and `search`. Search matches tenant name, email, contact number, or related user name/email case-insensitively.
- **Request body:** None.

**Request example**

```http
GET /api/admin/tenants?page=1&limit=10&status=ACTIVE&search=Tenant
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tenants fetched successfully",
  "data": {
    "data": [
      {
        "id": "22222222-2222-4222-8222-222222222222",
        "userId": "11111111-1111-4111-8111-111111111111",
        "status": "ACTIVE",
        "employmentStatus": "Software Engineer",
        "aboutMe": "Looking for a quiet home.",
        "createdAt": "2026-09-20T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z",
        "contactNumber": "01712345678",
        "email": "tenant@example.com",
        "name": "Tenant One",
        "user": {
          "id": "11111111-1111-4111-8111-111111111111",
          "email": "tenant@example.com",
          "address": "12 Road 5, Dhaka",
          "nationalIdNumber": "1234567890",
          "googleId": null,
          "authProvider": "CREDENTIAL",
          "emailVerified": true,
          "role": "TENANT",
          "createdAt": "2026-09-20T10:00:00.000Z",
          "updatedAt": "2026-09-25T10:00:00.000Z",
          "name": "Tenant One",
          "status": "ACTIVE",
          "deletedAt": null,
          "imagePublicId": "",
          "imageUrl": null,
          "isDeleted": false,
          "needPasswordChange": false,
          "gender": "MALE"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### GET /api/admin/owners

- **Auth:** `ADMIN` or `SUPERADMIN`.
- **Path parameters:** None.
- **Query parameters:** `page` (integer >= 1), `limit` (integer 1–100), `status` (`PENDING`, `APPROVED`, or `REJECTED`), and `search` matching related user name or email case-insensitively.
- **Request body:** None.

**Request example**

```http
GET /api/admin/owners?page=1&limit=10&status=APPROVED&search=owner
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Owners fetched successfully",
  "data": {
    "data": [
      {
        "id": "44444444-4444-4444-8444-444444444444",
        "userId": "33333333-3333-4333-8333-333333333333",
        "status": "APPROVED",
        "contactNumber": "01811112222",
        "verificationDocuments": [
          {
            "url": "https://res.cloudinary.com/housely/owner-verification/nid.jpg",
            "publicId": "housely/owner-verifications/owner-one/nid"
          }
        ],
        "rejectionReason": null,
        "reviewedBy": "55555555-5555-4555-8555-555555555555",
        "reviewedAt": "2026-09-22T09:00:00.000Z",
        "averageRating": null,
        "totalReviews": 0,
        "createdAt": "2026-09-21T09:00:00.000Z",
        "updatedAt": "2026-09-22T09:00:00.000Z",
        "rejectionHistory": [],
        "user": {
          "id": "33333333-3333-4333-8333-333333333333",
          "email": "owner@example.com",
          "address": "12 Road 5, Dhaka",
          "nationalIdNumber": "1234567890",
          "googleId": null,
          "authProvider": "CREDENTIAL",
          "emailVerified": true,
          "role": "OWNER",
          "createdAt": "2026-09-20T10:00:00.000Z",
          "updatedAt": "2026-09-25T10:00:00.000Z",
          "name": "Owner One",
          "status": "ACTIVE",
          "deletedAt": null,
          "imagePublicId": "",
          "imageUrl": null,
          "isDeleted": false,
          "needPasswordChange": false,
          "gender": "MALE"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### GET /api/admin/owners/applications

- **Auth:** `ADMIN` or `SUPERADMIN`.
- **Path parameters:** None.
- **Query parameters:** `page`, `limit`, `status` (`PENDING`, `APPROVED`, or `REJECTED`), and `search`. The service defaults `status` to `PENDING`; search matches applicant name, email, or contact number.
- **Request body:** None.

**Request example**

```http
GET /api/admin/owners/applications?page=1&limit=10&status=PENDING&search=owner
```

**Successful response — `200`**

The user object in this review-queue response is deliberately narrower than the user object returned by the owner-directory endpoint.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Owner applications fetched successfully",
  "data": {
    "data": [
      {
        "id": "44444444-4444-4444-8444-444444444444",
        "status": "PENDING",
        "contactNumber": "01811112222",
        "verificationDocuments": [
          {
            "url": "https://res.cloudinary.com/housely/owner-verification/nid.jpg",
            "publicId": "housely/owner-verifications/owner-one/nid"
          }
        ],
        "rejectionReason": null,
        "rejectionHistory": [],
        "reviewedBy": null,
        "reviewedAt": null,
        "createdAt": "2026-09-21T09:00:00.000Z",
        "updatedAt": "2026-09-21T09:00:00.000Z",
        "user": {
          "id": "33333333-3333-4333-8333-333333333333",
          "name": "Owner One",
          "email": "owner@example.com",
          "emailVerified": true,
          "address": "12 Road 5, Dhaka",
          "nationalIdNumber": "1234567890",
          "imageUrl": null,
          "createdAt": "2026-09-20T10:00:00.000Z"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### PATCH /api/admin/owners/:id/approve

- **Auth:** `ADMIN` or `SUPERADMIN`.
- **Path parameters:** `id` (required owner UUID).
- **Query parameters:** None.
- **Request body:** None.

**Request example**

```http
PATCH /api/admin/owners/44444444-4444-4444-8444-444444444444/approve
```

**Successful response — `200`**

Approval changes the owner to `APPROVED`, changes the related user's role to `OWNER`, sets the tenant profile to `INACTIVE`, records `reviewedBy` and `reviewedAt`, and sends a welcome email on a best-effort basis. The owner update is executed before the related user update in the transaction, so the nested `user` snapshot in this response can still show the pre-approval role `TENANT` even though the persisted role becomes `OWNER`.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Owner approved successfully",
  "data": {
    "id": "44444444-4444-4444-8444-444444444444",
    "userId": "33333333-3333-4333-8333-333333333333",
    "status": "APPROVED",
    "contactNumber": "01811112222",
    "verificationDocuments": [
      {
        "url": "https://res.cloudinary.com/housely/owner-verification/nid.jpg",
        "publicId": "housely/owner-verifications/owner-one/nid"
      }
    ],
    "rejectionReason": null,
    "reviewedBy": "55555555-5555-4555-8555-555555555555",
    "reviewedAt": "2026-09-22T09:00:00.000Z",
    "averageRating": null,
    "totalReviews": 0,
    "createdAt": "2026-09-21T09:00:00.000Z",
    "updatedAt": "2026-09-22T09:00:00.000Z",
    "rejectionHistory": [],
    "user": {
      "id": "33333333-3333-4333-8333-333333333333",
      "email": "owner@example.com",
      "address": "12 Road 5, Dhaka",
      "nationalIdNumber": "1234567890",
      "googleId": null,
      "authProvider": "CREDENTIAL",
      "emailVerified": true,
      "role": "TENANT",
      "createdAt": "2026-09-20T10:00:00.000Z",
      "updatedAt": "2026-09-25T10:00:00.000Z",
      "name": "Owner One",
      "status": "ACTIVE",
      "deletedAt": null,
      "imagePublicId": "",
      "imageUrl": null,
      "isDeleted": false,
      "needPasswordChange": false,
      "gender": "MALE"
    }
  }
}
```

### PATCH /api/admin/owners/:id/reject

- **Auth:** `ADMIN` or `SUPERADMIN`.
- **Path parameters:** `id` (required owner UUID).
- **Query parameters:** None.
- **Request body:** JSON, strict object with required `rejectionReason` (trimmed, 1–500 characters). The reason is appended to `rejectionHistory` as `{ "reason", "rejectedBy", "rejectedAt" }` and a rejection email is sent on a best-effort basis.

**Request example**

```json
{
  "rejectionReason": "Verification documents are not clear."
}
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Owner rejected successfully",
  "data": {
    "id": "44444444-4444-4444-8444-444444444444",
    "userId": "33333333-3333-4333-8333-333333333333",
    "status": "REJECTED",
    "contactNumber": "01811112222",
    "verificationDocuments": [
      {
        "url": "https://res.cloudinary.com/housely/owner-verification/nid.jpg",
        "publicId": "housely/owner-verifications/owner-one/nid"
      }
    ],
    "rejectionReason": "Verification documents are not clear.",
    "reviewedBy": "55555555-5555-4555-8555-555555555555",
    "reviewedAt": "2026-09-22T09:00:00.000Z",
    "averageRating": null,
    "totalReviews": 0,
    "createdAt": "2026-09-21T09:00:00.000Z",
    "updatedAt": "2026-09-22T09:00:00.000Z",
    "rejectionHistory": [
      {
        "reason": "Verification documents are not clear.",
        "rejectedBy": "55555555-5555-4555-8555-555555555555",
        "rejectedAt": "2026-09-22T09:00:00.000Z"
      }
    ],
    "user": {
      "id": "33333333-3333-4333-8333-333333333333",
      "email": "owner@example.com",
      "address": "12 Road 5, Dhaka",
      "nationalIdNumber": "1234567890",
      "googleId": null,
      "authProvider": "CREDENTIAL",
      "emailVerified": true,
      "role": "TENANT",
      "createdAt": "2026-09-20T10:00:00.000Z",
      "updatedAt": "2026-09-25T10:00:00.000Z",
      "name": "Owner One",
      "status": "ACTIVE",
      "deletedAt": null,
      "imagePublicId": "",
      "imageUrl": null,
      "isDeleted": false,
      "needPasswordChange": false,
      "gender": "MALE"
    }
  }
}
```

### PATCH /api/admin/users/:id/make-admin

- **Auth:** `SUPERADMIN` only.
- **Path parameters:** `id` (required user UUID).
- **Query parameters:** None.
- **Request body:** None.

**Request example**

```http
PATCH /api/admin/users/11111111-1111-4111-8111-111111111111/make-admin
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User promoted to admin successfully",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "tenant@example.com",
    "address": "12 Road 5, Dhaka",
    "nationalIdNumber": "1234567890",
    "googleId": null,
    "authProvider": "CREDENTIAL",
    "emailVerified": true,
    "role": "ADMIN",
    "createdAt": "2026-09-20T10:00:00.000Z",
    "updatedAt": "2026-09-25T12:00:00.000Z",
    "name": "Tenant One",
    "status": "ACTIVE",
    "deletedAt": null,
    "imagePublicId": "",
    "imageUrl": null,
    "isDeleted": false,
    "needPasswordChange": false,
    "gender": "MALE"
  }
}
```

### PATCH /api/admin/users/:id/block

- **Auth:** `ADMIN` or `SUPERADMIN`.
- **Path parameters:** `id` (required user UUID).
- **Query parameters:** None.
- **Request body:** None.

The actor cannot manage their own account; admins cannot manage staff, and superadmins cannot manage another superadmin. A blocked user is rejected by later authenticated requests.

**Request example**

```http
PATCH /api/admin/users/11111111-1111-4111-8111-111111111111/block
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User blocked successfully",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "tenant@example.com",
    "address": "12 Road 5, Dhaka",
    "nationalIdNumber": "1234567890",
    "googleId": null,
    "authProvider": "CREDENTIAL",
    "emailVerified": true,
    "role": "TENANT",
    "createdAt": "2026-09-20T10:00:00.000Z",
    "updatedAt": "2026-09-25T12:00:00.000Z",
    "name": "Tenant One",
    "status": "BLOCKED",
    "deletedAt": null,
    "imagePublicId": "",
    "imageUrl": null,
    "isDeleted": false,
    "needPasswordChange": false,
    "gender": "MALE"
  }
}
```

### PATCH /api/admin/users/:id/unblock

- **Auth:** `ADMIN` or `SUPERADMIN`.
- **Path parameters:** `id` (required user UUID).
- **Query parameters:** None.
- **Request body:** None.

Unblocking sets the user status to `ACTIVE`. The same actor and staff-management restrictions as blocking apply.

**Request example**

```http
PATCH /api/admin/users/11111111-1111-4111-8111-111111111111/unblock
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User unblocked successfully",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "tenant@example.com",
    "address": "12 Road 5, Dhaka",
    "nationalIdNumber": "1234567890",
    "googleId": null,
    "authProvider": "CREDENTIAL",
    "emailVerified": true,
    "role": "TENANT",
    "createdAt": "2026-09-20T10:00:00.000Z",
    "updatedAt": "2026-09-25T12:00:00.000Z",
    "name": "Tenant One",
    "status": "ACTIVE",
    "deletedAt": null,
    "imagePublicId": "",
    "imageUrl": null,
    "isDeleted": false,
    "needPasswordChange": false,
    "gender": "MALE"
  }
}
```

### DELETE /api/admin/users/:id

- **Auth:** `ADMIN` or `SUPERADMIN`.
- **Path parameters:** `id` (required user UUID).
- **Query parameters:** None.
- **Request body:** None.

This is a soft delete: `status` becomes `DELETED`, `isDeleted` becomes `true`, and `deletedAt` is set. The service returns a small deletion result rather than the user row.

**Request example**

```http
DELETE /api/admin/users/11111111-1111-4111-8111-111111111111
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User deleted successfully",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "message": "User Deleted Successfully"
  }
}
```

## Owner — `/api/owner`

### POST /api/owner/apply

- **Auth:** `TENANT`.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** `multipart/form-data` with a `data` text field containing strict JSON and 1–4 binary files in `verificationDocuments`. `contactNumber` is 6–20 characters, `address` is 5–255 characters, and `nationalIdNumber` is 4–50 characters. The controller also accepts the three fields directly when the multipart body is parsed without a `data` JSON string.
- **Files:** `verificationDocuments` must contain at least one file. Multer accepts JPG, PNG, WEBP, or PDF, up to 5 MB each.

**Request example (multipart)**

```text
Content-Type: multipart/form-data

data: {"contactNumber":"01712345678","address":"12 Road 5, Dhaka","nationalIdNumber":"1234567890"}
verificationDocuments: <binary NID file and binary ownership-proof file>
```

**Successful response — `201`**

A rejected application may be resubmitted; the response then uses the message `Your owner application has been resubmitted successfully.` New applications receive the message shown below.

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Your application as owner has been submitted successfully.",
  "data": {
    "id": "44444444-4444-4444-8444-444444444444",
    "userId": "11111111-1111-4111-8111-111111111111",
    "status": "PENDING",
    "contactNumber": "01712345678",
    "verificationDocuments": [
      {
        "url": "https://res.cloudinary.com/housely/owner-verification/nid.jpg",
        "publicId": "housely/owner-verifications/tenant-one/nid"
      },
      {
        "url": "https://res.cloudinary.com/housely/owner-verification/proof.pdf",
        "publicId": "housely/owner-verifications/tenant-one/proof"
      }
    ],
    "rejectionReason": null,
    "reviewedBy": null,
    "reviewedAt": null,
    "averageRating": null,
    "totalReviews": 0,
    "createdAt": "2026-09-25T10:00:00.000Z",
    "updatedAt": "2026-09-25T10:00:00.000Z",
    "rejectionHistory": [],
    "user": {
      "id": "11111111-1111-4111-8111-111111111111",
      "email": "tenant@example.com",
      "address": "12 Road 5, Dhaka",
      "nationalIdNumber": "1234567890",
      "googleId": null,
      "authProvider": "CREDENTIAL",
      "emailVerified": true,
      "role": "TENANT",
      "createdAt": "2026-09-20T10:00:00.000Z",
      "updatedAt": "2026-09-25T10:00:00.000Z",
      "name": "Tenant One",
      "status": "ACTIVE",
      "deletedAt": null,
      "imagePublicId": "",
      "imageUrl": null,
      "isDeleted": false,
      "needPasswordChange": false,
      "gender": "MALE"
    }
  }
}
```

For a re-application, the endpoint returns the same complete `data` object shown above, with updated verification documents, `rejectionReason`, `reviewedBy`, and `reviewedAt` reset to `null`, and the message `Your owner application has been resubmitted successfully.`

### GET /api/owner/profile

- **Auth:** `OWNER`.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** None.

**Request example**

```http
GET /api/owner/profile
Authorization: Bearer <access-token>
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Owner profile fetched successfully",
  "data": {
    "id": "44444444-4444-4444-8444-444444444444",
    "userId": "33333333-3333-4333-8333-333333333333",
    "status": "APPROVED",
    "contactNumber": "01811112222",
    "verificationDocuments": [
      {
        "url": "https://res.cloudinary.com/housely/owner-verification/nid.jpg",
        "publicId": "housely/owner-verifications/owner-one/nid"
      }
    ],
    "rejectionReason": null,
    "reviewedBy": "55555555-5555-4555-8555-555555555555",
    "reviewedAt": "2026-09-22T09:00:00.000Z",
    "averageRating": null,
    "totalReviews": 0,
    "createdAt": "2026-09-21T09:00:00.000Z",
    "updatedAt": "2026-09-22T09:00:00.000Z",
    "rejectionHistory": [],
    "user": {
      "id": "33333333-3333-4333-8333-333333333333",
      "email": "owner@example.com",
      "address": "12 Road 5, Dhaka",
      "nationalIdNumber": "1234567890",
      "googleId": null,
      "authProvider": "CREDENTIAL",
      "emailVerified": true,
      "role": "OWNER",
      "createdAt": "2026-09-20T10:00:00.000Z",
      "updatedAt": "2026-09-25T10:00:00.000Z",
      "name": "Owner One",
      "status": "ACTIVE",
      "deletedAt": null,
      "imagePublicId": "",
      "imageUrl": null,
      "isDeleted": false,
      "needPasswordChange": false,
      "gender": "MALE"
    }
  }
}
```

### PATCH /api/owner/update-profile

- **Auth:** `OWNER`.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** JSON, strict object. At least one field is required. Accepted fields are `contactNumber` (6–20 characters), `name` (2–100 characters), `address` (at least 1 character), `gender` (`MALE` or `FEMALE`), and `nationalIdNumber` (1–50 characters). Owner and user fields are updated together.

**Request example**

```json
{
  "contactNumber": "01811112222",
  "name": "Owner One Updated",
  "address": "14 Road 5, Dhaka",
  "gender": "FEMALE",
  "nationalIdNumber": "1234567891"
}
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Owner profile updated successfully",
  "data": {
    "id": "44444444-4444-4444-8444-444444444444",
    "userId": "33333333-3333-4333-8333-333333333333",
    "status": "APPROVED",
    "contactNumber": "01811112222",
    "verificationDocuments": [
      {
        "url": "https://res.cloudinary.com/housely/owner-verification/nid.jpg",
        "publicId": "housely/owner-verifications/owner-one/nid"
      }
    ],
    "rejectionReason": null,
    "reviewedBy": "55555555-5555-4555-8555-555555555555",
    "reviewedAt": "2026-09-22T09:00:00.000Z",
    "averageRating": null,
    "totalReviews": 0,
    "createdAt": "2026-09-21T09:00:00.000Z",
    "updatedAt": "2026-09-25T11:00:00.000Z",
    "rejectionHistory": [],
    "user": {
      "id": "33333333-3333-4333-8333-333333333333",
      "email": "owner@example.com",
      "address": "14 Road 5, Dhaka",
      "nationalIdNumber": "1234567891",
      "googleId": null,
      "authProvider": "CREDENTIAL",
      "emailVerified": true,
      "role": "OWNER",
      "createdAt": "2026-09-20T10:00:00.000Z",
      "updatedAt": "2026-09-25T11:00:00.000Z",
      "name": "Owner One Updated",
      "status": "ACTIVE",
      "deletedAt": null,
      "imagePublicId": "",
      "imageUrl": null,
      "isDeleted": false,
      "needPasswordChange": false,
      "gender": "FEMALE"
    }
  }
}
```

### GET /api/owner/applications

- **Auth:** `OWNER`.
- **Path parameters:** None.
- **Query parameters:** `page` (integer >= 1), `limit` (integer 1–100), `status` (`PENDING`, `APPROVED`, `REJECTED`, or `WITHDRAWN`), `propertyId` (UUID), and `flatId` (UUID). The service scopes results to the current owner's properties and defaults `status` to `PENDING`.
- **Request body:** None.

**Request example**

```http
GET /api/owner/applications?page=1&limit=10&status=PENDING&propertyId=77777777-7777-4777-8777-777777777777
```

**Successful response — `200`**

Each application includes the flat, its variant, the selected property fields, and the tenant with its user.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Applications fetched successfully",
  "data": {
    "data": [
      {
        "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "tenantId": "22222222-2222-4222-8222-222222222222",
        "monthlyIncome": "80000.00",
        "employment": "Software Engineer",
        "message": "I would like to rent this flat.",
        "status": "PENDING",
        "documents": null,
        "rejectionReason": null,
        "createdAt": "2026-09-25T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z",
        "flatId": "99999999-9999-4999-8999-999999999999",
        "flat": {
          "id": "99999999-9999-4999-8999-999999999999",
          "propertyId": "77777777-7777-4777-8777-777777777777",
          "variantId": "88888888-8888-4888-8888-888888888888",
          "flatNumber": "GR-101",
          "status": "AVAILABLE",
          "rentOverride": null,
          "advanceOverride": null,
          "createdAt": "2026-09-21T10:00:00.000Z",
          "updatedAt": "2026-09-21T10:00:00.000Z",
          "variant": {
            "id": "88888888-8888-4888-8888-888888888888",
            "propertyId": "77777777-7777-4777-8777-777777777777",
            "name": "3 Bedroom",
            "bedrooms": 3,
            "bathrooms": 2,
            "sizeSqft": 1200,
            "rentAmount": "15000.00",
            "advanceAmount": "45000.00",
            "totalUnits": 2,
            "images": null,
            "createdAt": "2026-09-21T10:00:00.000Z",
            "updatedAt": "2026-09-21T10:00:00.000Z"
          },
          "property": {
            "id": "77777777-7777-4777-8777-777777777777",
            "title": "Skyline Residence",
            "address": "12 Road 5",
            "city": "Dhaka",
            "district": "Dhaka",
            "images": null
          }
        },
        "tenant": {
          "id": "22222222-2222-4222-8222-222222222222",
          "userId": "11111111-1111-4111-8111-111111111111",
          "status": "ACTIVE",
          "employmentStatus": "Software Engineer",
          "aboutMe": "Looking for a quiet home.",
          "createdAt": "2026-09-20T10:00:00.000Z",
          "updatedAt": "2026-09-25T10:00:00.000Z",
          "contactNumber": "01712345678",
          "email": "tenant@example.com",
          "name": "Tenant One",
          "user": {
            "id": "11111111-1111-4111-8111-111111111111",
            "email": "tenant@example.com",
            "address": "12 Road 5, Dhaka",
            "nationalIdNumber": "1234567890",
            "googleId": null,
            "authProvider": "CREDENTIAL",
            "emailVerified": true,
            "role": "TENANT",
            "createdAt": "2026-09-20T10:00:00.000Z",
            "updatedAt": "2026-09-25T10:00:00.000Z",
            "name": "Tenant One",
            "status": "ACTIVE",
            "deletedAt": null,
            "imagePublicId": "",
            "imageUrl": null,
            "isDeleted": false,
            "needPasswordChange": false,
            "gender": "MALE"
          }
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

## Tenants — `/api/tenants`

### GET /api/tenants/me

- **Auth:** `TENANT`.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** None.

**Request example**

```http
GET /api/tenants/me
Authorization: Bearer <access-token>
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tenant profile fetched successfully",
  "data": {
    "id": "22222222-2222-4222-8222-222222222222",
    "userId": "11111111-1111-4111-8111-111111111111",
    "status": "ACTIVE",
    "employmentStatus": "Software Engineer",
    "aboutMe": "Looking for a quiet home.",
    "createdAt": "2026-09-20T10:00:00.000Z",
    "updatedAt": "2026-09-25T10:00:00.000Z",
    "contactNumber": "01712345678",
    "email": "tenant@example.com",
    "name": "Tenant One",
    "user": {
      "id": "11111111-1111-4111-8111-111111111111",
      "email": "tenant@example.com",
      "address": "12 Road 5, Dhaka",
      "nationalIdNumber": "1234567890",
      "googleId": null,
      "authProvider": "CREDENTIAL",
      "emailVerified": true,
      "role": "TENANT",
      "createdAt": "2026-09-20T10:00:00.000Z",
      "updatedAt": "2026-09-25T10:00:00.000Z",
      "name": "Tenant One",
      "status": "ACTIVE",
      "deletedAt": null,
      "imagePublicId": "",
      "imageUrl": null,
      "isDeleted": false,
      "needPasswordChange": false,
      "gender": "MALE"
    }
  }
}
```

### PATCH /api/tenants/me

- **Auth:** `TENANT`.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** JSON, strict object. At least one field is required. Accepted fields are `name` (2–100 characters), `address` (at least 1 character), `gender` (`MALE` or `FEMALE`), `nationalIdNumber` (1–50 characters), `contactNumber` (6–20 characters), `employmentStatus` (2–100 characters), and `aboutMe` (at most 1000 characters). Name is synchronized between `Tenant` and `User`; an inactive tenant profile cannot be updated.

**Request example**

```json
{
  "name": "Tenant One Updated",
  "address": "12 Road 5, Dhaka",
  "gender": "MALE",
  "nationalIdNumber": "1234567890",
  "contactNumber": "01712345678",
  "employmentStatus": "Software Engineer",
  "aboutMe": "Looking for a family-friendly apartment."
}
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tenant profile updated successfully",
  "data": {
    "id": "22222222-2222-4222-8222-222222222222",
    "userId": "11111111-1111-4111-8111-111111111111",
    "status": "ACTIVE",
    "employmentStatus": "Software Engineer",
    "aboutMe": "Looking for a family-friendly apartment.",
    "createdAt": "2026-09-20T10:00:00.000Z",
    "updatedAt": "2026-09-25T11:00:00.000Z",
    "contactNumber": "01712345678",
    "email": "tenant@example.com",
    "name": "Tenant One Updated",
    "user": {
      "id": "11111111-1111-4111-8111-111111111111",
      "email": "tenant@example.com",
      "address": "12 Road 5, Dhaka",
      "nationalIdNumber": "1234567890",
      "googleId": null,
      "authProvider": "CREDENTIAL",
      "emailVerified": true,
      "role": "TENANT",
      "createdAt": "2026-09-20T10:00:00.000Z",
      "updatedAt": "2026-09-25T11:00:00.000Z",
      "name": "Tenant One Updated",
      "status": "ACTIVE",
      "deletedAt": null,
      "imagePublicId": "",
      "imageUrl": null,
      "isDeleted": false,
      "needPasswordChange": false,
      "gender": "MALE"
    }
  }
}
```

## Properties — `/api/properties`

### POST /api/properties/

- **Auth:** `OWNER`.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** `multipart/form-data`. Send the property fields as a JSON string in a `data` field, or send the same fields as individual text fields. The JSON object is strict. `title` is 3–150 characters, `address` is 5–255 characters, `city` and `district` are 2–100 characters, `description` is at most 2000 characters, and `postalCode` and `companyName` are optional. Optional text fields are trimmed and stored as `null` when blank.
- **Files:** Optional `images` files. The route declares five, but the shared Multer instance limits the request to four files. Each file is at most 5 MB and may be JPG, PNG, WEBP, or PDF. A PDF passes Multer validation, but this uploader forces Cloudinary `resource_type: "image"`, so a PDF can fail during Cloudinary processing.
- **Access rule:** The authenticated user must have an `Owner` profile with status `APPROVED`.

**Request example (multipart)**

```text
Content-Type: multipart/form-data

data: {"title":"Skyline Residence","description":"A quiet residential building","address":"12 Road 5","city":"Dhaka","district":"Dhaka","postalCode":"1205","companyName":"Housely Living"}
images: <binary property image, for example skyline.jpg>
```

**Successful response — `201`**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Property created successfully",
  "data": {
    "id": "77777777-7777-4777-8777-777777777777",
    "ownerId": "44444444-4444-4444-8444-444444444444",
    "title": "Skyline Residence",
    "description": "A quiet residential building",
    "address": "12 Road 5",
    "city": "Dhaka",
    "district": "Dhaka",
    "postalCode": "1205",
    "createdAt": "2026-09-25T10:00:00.000Z",
    "updatedAt": "2026-09-25T10:00:00.000Z",
    "companyName": "Housely Living",
    "images": [
      {
        "url": "https://res.cloudinary.com/housely/image/upload/housely/properties/44444444-4444-4444-8444-444444444444/skyline.jpg",
        "publicId": "housely/properties/44444444-4444-4444-8444-444444444444/skyline"
      }
    ],
    "totalFlats": 0,
    "owner": {
      "id": "44444444-4444-4444-8444-444444444444",
      "user": {
        "id": "33333333-3333-4333-8333-333333333333",
        "name": "Owner One"
      }
    },
    "_count": {
      "flats": 0
    }
  }
}
```

If no images are uploaded, `images` is `null` when the property is serialized.

### GET /api/properties/

- **Auth:** Public.
- **Path parameters:** None.
- **Query parameters:** `page` (integer >= 1), `limit` (integer 1–100), `search`, `city`, `district`, and `ownerId` (UUID). Defaults are `page=1` and `limit=10`. `search` matches title, address, city, or district case-insensitively; `city` and `district` are case-insensitive substring filters. Query validation removes unknown keys.
- **Request body:** None.

**Request example**

```http
GET /api/properties/?page=1&limit=10&search=Skyline&city=Dhaka&district=Dhaka
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Properties fetched successfully",
  "data": {
    "data": [
      {
        "id": "77777777-7777-4777-8777-777777777777",
        "ownerId": "44444444-4444-4444-8444-444444444444",
        "title": "Skyline Residence",
        "description": "A quiet residential building",
        "address": "12 Road 5",
        "city": "Dhaka",
        "district": "Dhaka",
        "postalCode": "1205",
        "createdAt": "2026-09-25T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z",
        "companyName": "Housely Living",
        "images": [
          {
            "url": "https://res.cloudinary.com/housely/image/upload/housely/properties/44444444-4444-4444-8444-444444444444/skyline.jpg",
            "publicId": "housely/properties/44444444-4444-4444-8444-444444444444/skyline"
          }
        ],
        "totalFlats": 12,
        "owner": {
          "id": "44444444-4444-4444-8444-444444444444",
          "user": {
            "id": "33333333-3333-4333-8333-333333333333",
            "name": "Owner One"
          }
        },
        "_count": {
          "flats": 12
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### GET /api/properties/:id

- **Auth:** Public.
- **Path parameters:** `id` (required property UUID).
- **Query parameters:** None.
- **Request body:** None.

**Request example**

```http
GET /api/properties/77777777-7777-4777-8777-777777777777
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Property fetched successfully",
  "data": {
    "id": "77777777-7777-4777-8777-777777777777",
    "ownerId": "44444444-4444-4444-8444-444444444444",
    "title": "Skyline Residence",
    "description": "A quiet residential building",
    "address": "12 Road 5",
    "city": "Dhaka",
    "district": "Dhaka",
    "postalCode": "1205",
    "createdAt": "2026-09-25T10:00:00.000Z",
    "updatedAt": "2026-09-25T10:00:00.000Z",
    "companyName": "Housely Living",
    "images": [
      {
        "url": "https://res.cloudinary.com/housely/image/upload/housely/properties/44444444-4444-4444-8444-444444444444/skyline.jpg",
        "publicId": "housely/properties/44444444-4444-4444-8444-444444444444/skyline"
      }
    ],
    "totalFlats": 12,
    "owner": {
      "id": "44444444-4444-4444-8444-444444444444",
      "user": {
        "id": "33333333-3333-4333-8333-333333333333",
        "name": "Owner One"
      }
    },
    "_count": {
      "flats": 12
    }
  }
}
```

### GET /api/properties/vacancy/:propertyId

- **Auth:** Public.
- **Path parameters:** `propertyId` (required property UUID).
- **Query parameters:** Optional `variantId`. The route validates the path parameter but does not run query validation; when supplied, this value filters the available-flat count to that variant.
- **Request body:** None.

**Request example**

```http
GET /api/properties/vacancy/77777777-7777-4777-8777-777777777777?variantId=88888888-8888-4888-8888-888888888888
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vacancy fetched successfully",
  "data": {
    "available": 7
  }
}
```

Without `variantId`, the count includes all `AVAILABLE` flats for the property.

## Applications — `/api/applications`

Application examples use the same flat, variant, property, tenant, and user identifiers listed in the example-identifiers section. Decimal values such as `monthlyIncome`, `rentAmount`, and `advanceAmount` serialize as strings.

### POST /api/applications/

- **Auth:** `TENANT`.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** JSON, strict object. `flatId` is required and must be a UUID. `monthlyIncome` is optional, coerced to a positive number no greater than 100000000; `employment` is an optional trimmed string of 2–100 characters; and `message` is an optional trimmed string of 1–2000 characters.
- **Business rules:** The tenant must be `ACTIVE`; the flat must exist and be `AVAILABLE`; pending and approved applications for the same tenant and flat are rejected; and a flat with a pending or active lease cannot receive an application.

**Request example**

```json
{
  "flatId": "99999999-9999-4999-8999-999999999999",
  "monthlyIncome": 80000,
  "employment": "Software Engineer",
  "message": "I would like to rent this flat."
}
```

**Successful response — `201`**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Application submitted successfully",
  "data": {
    "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    "tenantId": "22222222-2222-4222-8222-222222222222",
    "monthlyIncome": "80000.00",
    "employment": "Software Engineer",
    "message": "I would like to rent this flat.",
    "status": "PENDING",
    "documents": null,
    "rejectionReason": null,
    "createdAt": "2026-09-25T10:00:00.000Z",
    "updatedAt": "2026-09-25T10:00:00.000Z",
    "flatId": "99999999-9999-4999-8999-999999999999",
    "flat": {
      "id": "99999999-9999-4999-8999-999999999999",
      "propertyId": "77777777-7777-4777-8777-777777777777",
      "variantId": "88888888-8888-4888-8888-888888888888",
      "flatNumber": "GR-101",
      "status": "AVAILABLE",
      "rentOverride": null,
      "advanceOverride": null,
      "createdAt": "2026-09-21T10:00:00.000Z",
      "updatedAt": "2026-09-21T10:00:00.000Z",
      "variant": {
        "id": "88888888-8888-4888-8888-888888888888",
        "propertyId": "77777777-7777-4777-8777-777777777777",
        "name": "3 Bedroom",
        "bedrooms": 3,
        "bathrooms": 2,
        "sizeSqft": 1200,
        "rentAmount": "15000.00",
        "advanceAmount": "45000.00",
        "totalUnits": 2,
        "images": null,
        "createdAt": "2026-09-21T10:00:00.000Z",
        "updatedAt": "2026-09-21T10:00:00.000Z"
      },
      "property": {
        "id": "77777777-7777-4777-8777-777777777777",
        "title": "Skyline Residence",
        "address": "12 Road 5",
        "city": "Dhaka",
        "district": "Dhaka",
        "images": [
          {
            "url": "https://res.cloudinary.com/housely/image/upload/housely/properties/44444444-4444-4444-8444-444444444444/skyline.jpg",
            "publicId": "housely/properties/44444444-4444-4444-8444-444444444444/skyline"
          }
        ]
      }
    },
    "tenant": {
      "id": "22222222-2222-4222-8222-222222222222",
      "userId": "11111111-1111-4111-8111-111111111111",
      "status": "ACTIVE",
      "employmentStatus": "Software Engineer",
      "aboutMe": "Looking for a quiet home.",
      "createdAt": "2026-09-20T10:00:00.000Z",
      "updatedAt": "2026-09-25T10:00:00.000Z",
      "contactNumber": "01712345678",
      "email": "tenant@example.com",
      "name": "Tenant One",
      "user": {
        "id": "11111111-1111-4111-8111-111111111111",
        "email": "tenant@example.com",
        "address": "12 Road 5, Dhaka",
        "nationalIdNumber": "1234567890",
        "googleId": null,
        "authProvider": "CREDENTIAL",
        "emailVerified": true,
        "role": "TENANT",
        "createdAt": "2026-09-20T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z",
        "name": "Tenant One",
        "status": "ACTIVE",
        "deletedAt": null,
        "imagePublicId": "",
        "imageUrl": null,
        "isDeleted": false,
        "needPasswordChange": false,
        "gender": "MALE"
      }
    }
  }
}
```

### GET /api/applications/me

- **Auth:** `TENANT`.
- **Path parameters:** None.
- **Query parameters:** `page` (integer >= 1), `limit` (integer 1–100), `status` (`PENDING`, `APPROVED`, `REJECTED`, or `WITHDRAWN`), and `flatId` (UUID). Defaults are `page=1` and `limit=10`. The current query schema does not include `propertyId`; any extra query keys are removed by `validateQuery` and do not affect the service.
- **Request body:** None.

**Request example**

```http
GET /api/applications/me?page=1&limit=10&status=PENDING&flatId=99999999-9999-4999-8999-999999999999
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Applications fetched successfully",
  "data": {
    "data": [
      {
        "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "tenantId": "22222222-2222-4222-8222-222222222222",
        "monthlyIncome": "80000.00",
        "employment": "Software Engineer",
        "message": "I would like to rent this flat.",
        "status": "PENDING",
        "documents": null,
        "rejectionReason": null,
        "createdAt": "2026-09-25T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z",
        "flatId": "99999999-9999-4999-8999-999999999999",
        "flat": {
          "id": "99999999-9999-4999-8999-999999999999",
          "propertyId": "77777777-7777-4777-8777-777777777777",
          "variantId": "88888888-8888-4888-8888-888888888888",
          "flatNumber": "GR-101",
          "status": "AVAILABLE",
          "rentOverride": null,
          "advanceOverride": null,
          "createdAt": "2026-09-21T10:00:00.000Z",
          "updatedAt": "2026-09-21T10:00:00.000Z",
          "variant": {
            "id": "88888888-8888-4888-8888-888888888888",
            "propertyId": "77777777-7777-4777-8777-777777777777",
            "name": "3 Bedroom",
            "bedrooms": 3,
            "bathrooms": 2,
            "sizeSqft": 1200,
            "rentAmount": "15000.00",
            "advanceAmount": "45000.00",
            "totalUnits": 2,
            "images": null,
            "createdAt": "2026-09-21T10:00:00.000Z",
            "updatedAt": "2026-09-21T10:00:00.000Z"
          },
          "property": {
            "id": "77777777-7777-4777-8777-777777777777",
            "title": "Skyline Residence",
            "address": "12 Road 5",
            "city": "Dhaka",
            "district": "Dhaka",
            "images": [
              {
                "url": "https://res.cloudinary.com/housely/image/upload/housely/properties/44444444-4444-4444-8444-444444444444/skyline.jpg",
                "publicId": "housely/properties/44444444-4444-4444-8444-444444444444/skyline"
              }
            ]
          }
        },
        "tenant": {
          "id": "22222222-2222-4222-8222-222222222222",
          "userId": "11111111-1111-4111-8111-111111111111",
          "status": "ACTIVE",
          "employmentStatus": "Software Engineer",
          "aboutMe": "Looking for a quiet home.",
          "createdAt": "2026-09-20T10:00:00.000Z",
          "updatedAt": "2026-09-25T10:00:00.000Z",
          "contactNumber": "01712345678",
          "email": "tenant@example.com",
          "name": "Tenant One",
          "user": {
            "id": "11111111-1111-4111-8111-111111111111",
            "email": "tenant@example.com",
            "address": "12 Road 5, Dhaka",
            "nationalIdNumber": "1234567890",
            "googleId": null,
            "authProvider": "CREDENTIAL",
            "emailVerified": true,
            "role": "TENANT",
            "createdAt": "2026-09-20T10:00:00.000Z",
            "updatedAt": "2026-09-25T10:00:00.000Z",
            "name": "Tenant One",
            "status": "ACTIVE",
            "deletedAt": null,
            "imagePublicId": "",
            "imageUrl": null,
            "isDeleted": false,
            "needPasswordChange": false,
            "gender": "MALE"
          }
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### GET /api/applications/property/:propertyId

- **Auth:** `OWNER`.
- **Path parameters:** `propertyId` (required property UUID).
- **Query parameters:** `page` (integer >= 1), `limit` (integer 1–100), `status` (`PENDING`, `APPROVED`, `REJECTED`, or `WITHDRAWN`), and `flatId` (UUID). The service defaults `status` to `PENDING` and scopes the result to the current owner's property. Query validation runs before role authentication.
- **Access rule:** An unknown `propertyId` returns `404 Property Not Found`; a property owned by another user returns `403 Forbidden: not your property`.
- **Request body:** None.

**Request example**

```http
GET /api/applications/property/77777777-7777-4777-8777-777777777777?page=1&limit=10&status=PENDING
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Property applications fetched successfully",
  "data": {
    "data": [
      {
        "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "tenantId": "22222222-2222-4222-8222-222222222222",
        "monthlyIncome": "80000.00",
        "employment": "Software Engineer",
        "message": "I would like to rent this flat.",
        "status": "PENDING",
        "documents": null,
        "rejectionReason": null,
        "createdAt": "2026-09-25T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z",
        "flatId": "99999999-9999-4999-8999-999999999999",
        "flat": {
          "id": "99999999-9999-4999-8999-999999999999",
          "propertyId": "77777777-7777-4777-8777-777777777777",
          "variantId": "88888888-8888-4888-8888-888888888888",
          "flatNumber": "GR-101",
          "status": "AVAILABLE",
          "rentOverride": null,
          "advanceOverride": null,
          "createdAt": "2026-09-21T10:00:00.000Z",
          "updatedAt": "2026-09-21T10:00:00.000Z",
          "variant": {
            "id": "88888888-8888-4888-8888-888888888888",
            "propertyId": "77777777-7777-4777-8777-777777777777",
            "name": "3 Bedroom",
            "bedrooms": 3,
            "bathrooms": 2,
            "sizeSqft": 1200,
            "rentAmount": "15000.00",
            "advanceAmount": "45000.00",
            "totalUnits": 2,
            "images": null,
            "createdAt": "2026-09-21T10:00:00.000Z",
            "updatedAt": "2026-09-21T10:00:00.000Z"
          },
          "property": {
            "id": "77777777-7777-4777-8777-777777777777",
            "title": "Skyline Residence",
            "address": "12 Road 5",
            "city": "Dhaka",
            "district": "Dhaka",
            "images": [
              {
                "url": "https://res.cloudinary.com/housely/image/upload/housely/properties/44444444-4444-4444-8444-444444444444/skyline.jpg",
                "publicId": "housely/properties/44444444-4444-4444-8444-444444444444/skyline"
              }
            ]
          }
        },
        "tenant": {
          "id": "22222222-2222-4222-8222-222222222222",
          "userId": "11111111-1111-4111-8111-111111111111",
          "status": "ACTIVE",
          "employmentStatus": "Software Engineer",
          "aboutMe": "Looking for a quiet home.",
          "createdAt": "2026-09-20T10:00:00.000Z",
          "updatedAt": "2026-09-25T10:00:00.000Z",
          "contactNumber": "01712345678",
          "email": "tenant@example.com",
          "name": "Tenant One",
          "user": {
            "id": "11111111-1111-4111-8111-111111111111",
            "email": "tenant@example.com",
            "address": "12 Road 5, Dhaka",
            "nationalIdNumber": "1234567890",
            "googleId": null,
            "authProvider": "CREDENTIAL",
            "emailVerified": true,
            "role": "TENANT",
            "createdAt": "2026-09-20T10:00:00.000Z",
            "updatedAt": "2026-09-25T10:00:00.000Z",
            "name": "Tenant One",
            "status": "ACTIVE",
            "deletedAt": null,
            "imagePublicId": "",
            "imageUrl": null,
            "isDeleted": false,
            "needPasswordChange": false,
            "gender": "MALE"
          }
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### DELETE /api/applications/:id/withdraw

- **Auth:** `TENANT`.
- **Path parameters:** `id` (required application UUID).
- **Query parameters:** None.
- **Request body:** None.
- **Business rules:** Only the tenant who owns the application can withdraw it, and only a `PENDING` application can be withdrawn. Another tenant's application returns `404 Application Not Found`. Withdrawing an `APPROVED` application returns `409 Approved applications cannot be withdrawn. Contact the property owner directly.`; any other non-pending status returns `409 Only pending applications can be withdrawn`. The returned object includes the same flat, variant, property, tenant, and user relations as the application list.

**Request example**

```http
DELETE /api/applications/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/withdraw
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Application withdrawn successfully",
  "data": {
    "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    "tenantId": "22222222-2222-4222-8222-222222222222",
    "monthlyIncome": "80000.00",
    "employment": "Software Engineer",
    "message": "I would like to rent this flat.",
    "status": "WITHDRAWN",
    "documents": null,
    "rejectionReason": null,
    "createdAt": "2026-09-25T10:00:00.000Z",
    "updatedAt": "2026-09-25T11:00:00.000Z",
    "flatId": "99999999-9999-4999-8999-999999999999",
    "flat": {
      "id": "99999999-9999-4999-8999-999999999999",
      "propertyId": "77777777-7777-4777-8777-777777777777",
      "variantId": "88888888-8888-4888-8888-888888888888",
      "flatNumber": "GR-101",
      "status": "AVAILABLE",
      "rentOverride": null,
      "advanceOverride": null,
      "createdAt": "2026-09-21T10:00:00.000Z",
      "updatedAt": "2026-09-21T10:00:00.000Z",
      "variant": {
        "id": "88888888-8888-4888-8888-888888888888",
        "propertyId": "77777777-7777-4777-8777-777777777777",
        "name": "3 Bedroom",
        "bedrooms": 3,
        "bathrooms": 2,
        "sizeSqft": 1200,
        "rentAmount": "15000.00",
        "advanceAmount": "45000.00",
        "totalUnits": 2,
        "images": null,
        "createdAt": "2026-09-21T10:00:00.000Z",
        "updatedAt": "2026-09-21T10:00:00.000Z"
      },
      "property": {
        "id": "77777777-7777-4777-8777-777777777777",
        "title": "Skyline Residence",
        "address": "12 Road 5",
        "city": "Dhaka",
        "district": "Dhaka",
        "images": null
      }
    },
    "tenant": {
      "id": "22222222-2222-4222-8222-222222222222",
      "userId": "11111111-1111-4111-8111-111111111111",
      "status": "ACTIVE",
      "employmentStatus": "Software Engineer",
      "aboutMe": "Looking for a quiet home.",
      "createdAt": "2026-09-20T10:00:00.000Z",
      "updatedAt": "2026-09-25T10:00:00.000Z",
      "contactNumber": "01712345678",
      "email": "tenant@example.com",
      "name": "Tenant One",
      "user": {
        "id": "11111111-1111-4111-8111-111111111111",
        "email": "tenant@example.com",
        "address": "12 Road 5, Dhaka",
        "nationalIdNumber": "1234567890",
        "googleId": null,
        "authProvider": "CREDENTIAL",
        "emailVerified": true,
        "role": "TENANT",
        "createdAt": "2026-09-20T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z",
        "name": "Tenant One",
        "status": "ACTIVE",
        "deletedAt": null,
        "imagePublicId": "",
        "imageUrl": null,
        "isDeleted": false,
        "needPasswordChange": false,
        "gender": "MALE"
      }
    }
  }
}
```

### GET /api/applications/:id

- **Auth:** `OWNER`, `ADMIN`, or `SUPERADMIN`.
- **Path parameters:** `id` (required application UUID).
- **Query parameters:** None.
- **Request body:** None.
- **Access rule:** An owner may view an application only when the flat's property belongs to that owner. Administrators may view any application. A non-owner without administrative access receives the same not-found response used for a missing application.

**Request example**

```http
GET /api/applications/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
```

**Successful response — `200`**

The detail response uses a richer `property` relation than the list response: the property includes its complete owner record, while the tenant user still omits `password`.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Application fetched successfully",
  "data": {
    "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    "tenantId": "22222222-2222-4222-8222-222222222222",
    "monthlyIncome": "80000.00",
    "employment": "Software Engineer",
    "message": "I would like to rent this flat.",
    "status": "PENDING",
    "documents": null,
    "rejectionReason": null,
    "createdAt": "2026-09-25T10:00:00.000Z",
    "updatedAt": "2026-09-25T10:00:00.000Z",
    "flatId": "99999999-9999-4999-8999-999999999999",
    "flat": {
      "id": "99999999-9999-4999-8999-999999999999",
      "propertyId": "77777777-7777-4777-8777-777777777777",
      "variantId": "88888888-8888-4888-8888-888888888888",
      "flatNumber": "GR-101",
      "status": "AVAILABLE",
      "rentOverride": null,
      "advanceOverride": null,
      "createdAt": "2026-09-21T10:00:00.000Z",
      "updatedAt": "2026-09-21T10:00:00.000Z",
      "variant": {
        "id": "88888888-8888-4888-8888-888888888888",
        "propertyId": "77777777-7777-4777-8777-777777777777",
        "name": "3 Bedroom",
        "bedrooms": 3,
        "bathrooms": 2,
        "sizeSqft": 1200,
        "rentAmount": "15000.00",
        "advanceAmount": "45000.00",
        "totalUnits": 2,
        "images": null,
        "createdAt": "2026-09-21T10:00:00.000Z",
        "updatedAt": "2026-09-21T10:00:00.000Z"
      },
      "property": {
        "id": "77777777-7777-4777-8777-777777777777",
        "ownerId": "44444444-4444-4444-8444-444444444444",
        "title": "Skyline Residence",
        "description": "A quiet residential building",
        "address": "12 Road 5",
        "city": "Dhaka",
        "district": "Dhaka",
        "postalCode": "1205",
        "createdAt": "2026-09-25T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z",
        "companyName": "Housely Living",
        "images": null,
        "totalFlats": 12,
        "owner": {
          "id": "44444444-4444-4444-8444-444444444444",
          "userId": "33333333-3333-4333-8333-333333333333",
          "status": "APPROVED",
          "contactNumber": "01811112222",
          "verificationDocuments": [
            {
              "url": "https://res.cloudinary.com/housely/owner-verification/nid.jpg",
              "publicId": "housely/owner-verifications/owner-one/nid"
            }
          ],
          "rejectionReason": null,
          "reviewedBy": "55555555-5555-4555-8555-555555555555",
          "reviewedAt": "2026-09-22T09:00:00.000Z",
          "averageRating": null,
          "totalReviews": 0,
          "createdAt": "2026-09-21T09:00:00.000Z",
          "updatedAt": "2026-09-22T09:00:00.000Z",
          "rejectionHistory": []
        }
      }
    },
    "tenant": {
      "id": "22222222-2222-4222-8222-222222222222",
      "userId": "11111111-1111-4111-8111-111111111111",
      "status": "ACTIVE",
      "employmentStatus": "Software Engineer",
      "aboutMe": "Looking for a quiet home.",
      "createdAt": "2026-09-20T10:00:00.000Z",
      "updatedAt": "2026-09-25T10:00:00.000Z",
      "contactNumber": "01712345678",
      "email": "tenant@example.com",
      "name": "Tenant One",
      "user": {
        "id": "11111111-1111-4111-8111-111111111111",
        "email": "tenant@example.com",
        "address": "12 Road 5, Dhaka",
        "nationalIdNumber": "1234567890",
        "googleId": null,
        "authProvider": "CREDENTIAL",
        "emailVerified": true,
        "role": "TENANT",
        "createdAt": "2026-09-20T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z",
        "name": "Tenant One",
        "status": "ACTIVE",
        "deletedAt": null,
        "imagePublicId": "",
        "imageUrl": null,
        "isDeleted": false,
        "needPasswordChange": false,
        "gender": "MALE"
      }
    }
  }
}
```

### PATCH /api/applications/:id/approve

- **Auth:** `OWNER`.
- **Path parameters:** `id` (required application UUID).
- **Query parameters:** None.
- **Request body:** None.
- **Business rules:** The authenticated owner must own the application’s property and the application must be pending. A missing application, or one owned by another owner’s property, returns `404 Application Not Found`; a property owned by someone else returns `403 Forbidden: not your property`; a non-pending application returns `409 Only pending applications can be approved`. Approval also rejects other pending applications for the same flat, attempts to create the first lease automatically, changes the flat to `OCCUPIED` when that creation succeeds, and sends a best-effort decision email. The returned application is captured before automatic lease creation, so its nested `flat.status` can still be `AVAILABLE` even after the flat has been persisted as `OCCUPIED`. The application decision and automatic lease creation are separate operations; if lease creation fails, the request returns an error after the application has already been approved and the other pending applications auto-rejected.

**Request example**

```http
PATCH /api/applications/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/approve
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Application approved successfully",
  "data": {
    "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    "tenantId": "22222222-2222-4222-8222-222222222222",
    "monthlyIncome": "80000.00",
    "employment": "Software Engineer",
    "message": "I would like to rent this flat.",
    "status": "APPROVED",
    "documents": null,
    "rejectionReason": null,
    "createdAt": "2026-09-25T10:00:00.000Z",
    "updatedAt": "2026-09-25T11:00:00.000Z",
    "flatId": "99999999-9999-4999-8999-999999999999",
    "flat": {
      "id": "99999999-9999-4999-8999-999999999999",
      "propertyId": "77777777-7777-4777-8777-777777777777",
      "variantId": "88888888-8888-4888-8888-888888888888",
      "flatNumber": "GR-101",
      "status": "AVAILABLE",
      "rentOverride": null,
      "advanceOverride": null,
      "createdAt": "2026-09-21T10:00:00.000Z",
      "updatedAt": "2026-09-21T10:00:00.000Z",
      "variant": {
        "id": "88888888-8888-4888-8888-888888888888",
        "propertyId": "77777777-7777-4777-8777-777777777777",
        "name": "3 Bedroom",
        "bedrooms": 3,
        "bathrooms": 2,
        "sizeSqft": 1200,
        "rentAmount": "15000.00",
        "advanceAmount": "45000.00",
        "totalUnits": 2,
        "images": null,
        "createdAt": "2026-09-21T10:00:00.000Z",
        "updatedAt": "2026-09-21T10:00:00.000Z"
      },
      "property": {
        "id": "77777777-7777-4777-8777-777777777777",
        "title": "Skyline Residence",
        "address": "12 Road 5",
        "city": "Dhaka",
        "district": "Dhaka",
        "images": null
      }
    },
    "tenant": {
      "id": "22222222-2222-4222-8222-222222222222",
      "userId": "11111111-1111-4111-8111-111111111111",
      "status": "ACTIVE",
      "employmentStatus": "Software Engineer",
      "aboutMe": "Looking for a quiet home.",
      "createdAt": "2026-09-20T10:00:00.000Z",
      "updatedAt": "2026-09-25T10:00:00.000Z",
      "contactNumber": "01712345678",
      "email": "tenant@example.com",
      "name": "Tenant One",
      "user": {
        "id": "11111111-1111-4111-8111-111111111111",
        "email": "tenant@example.com",
        "address": "12 Road 5, Dhaka",
        "nationalIdNumber": "1234567890",
        "googleId": null,
        "authProvider": "CREDENTIAL",
        "emailVerified": true,
        "role": "TENANT",
        "createdAt": "2026-09-20T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z",
        "name": "Tenant One",
        "status": "ACTIVE",
        "deletedAt": null,
        "imagePublicId": "",
        "imageUrl": null,
        "isDeleted": false,
        "needPasswordChange": false,
        "gender": "MALE"
      }
    }
  }
}
```

### PATCH /api/applications/:id/reject

- **Auth:** `OWNER`.
- **Path parameters:** `id` (required application UUID).
- **Query parameters:** None.
- **Request body:** JSON, strict object with required `rejectionReason` (trimmed, 1–500 characters).
- **Business rules:** The authenticated owner must own the application’s property and the application must be pending. A missing application returns `404 Application Not Found`, a property owned by someone else returns `403 Forbidden: not your property`, and a non-pending application returns `409 Only pending applications can be rejected`. A decision email is sent on a best-effort basis.

**Request example**

```json
{
  "rejectionReason": "The property is no longer available for this application."
}
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Application rejected successfully",
  "data": {
    "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    "tenantId": "22222222-2222-4222-8222-222222222222",
    "monthlyIncome": "80000.00",
    "employment": "Software Engineer",
    "message": "I would like to rent this flat.",
    "status": "REJECTED",
    "documents": null,
    "rejectionReason": "The property is no longer available for this application.",
    "createdAt": "2026-09-25T10:00:00.000Z",
    "updatedAt": "2026-09-25T11:00:00.000Z",
    "flatId": "99999999-9999-4999-8999-999999999999",
    "flat": {
      "id": "99999999-9999-4999-8999-999999999999",
      "propertyId": "77777777-7777-4777-8777-777777777777",
      "variantId": "88888888-8888-4888-8888-888888888888",
      "flatNumber": "GR-101",
      "status": "AVAILABLE",
      "rentOverride": null,
      "advanceOverride": null,
      "createdAt": "2026-09-21T10:00:00.000Z",
      "updatedAt": "2026-09-21T10:00:00.000Z",
      "variant": {
        "id": "88888888-8888-4888-8888-888888888888",
        "propertyId": "77777777-7777-4777-8777-777777777777",
        "name": "3 Bedroom",
        "bedrooms": 3,
        "bathrooms": 2,
        "sizeSqft": 1200,
        "rentAmount": "15000.00",
        "advanceAmount": "45000.00",
        "totalUnits": 2,
        "images": null,
        "createdAt": "2026-09-21T10:00:00.000Z",
        "updatedAt": "2026-09-21T10:00:00.000Z"
      },
      "property": {
        "id": "77777777-7777-4777-8777-777777777777",
        "title": "Skyline Residence",
        "address": "12 Road 5",
        "city": "Dhaka",
        "district": "Dhaka",
        "images": null
      }
    },
    "tenant": {
      "id": "22222222-2222-4222-8222-222222222222",
      "userId": "11111111-1111-4111-8111-111111111111",
      "status": "ACTIVE",
      "employmentStatus": "Software Engineer",
      "aboutMe": "Looking for a quiet home.",
      "createdAt": "2026-09-20T10:00:00.000Z",
      "updatedAt": "2026-09-25T10:00:00.000Z",
      "contactNumber": "01712345678",
      "email": "tenant@example.com",
      "name": "Tenant One",
      "user": {
        "id": "11111111-1111-4111-8111-111111111111",
        "email": "tenant@example.com",
        "address": "12 Road 5, Dhaka",
        "nationalIdNumber": "1234567890",
        "googleId": null,
        "authProvider": "CREDENTIAL",
        "emailVerified": true,
        "role": "TENANT",
        "createdAt": "2026-09-20T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z",
        "name": "Tenant One",
        "status": "ACTIVE",
        "deletedAt": null,
        "imagePublicId": "",
        "imageUrl": null,
        "isDeleted": false,
        "needPasswordChange": false,
        "gender": "MALE"
      }
    }
  }
}
```

## Leases — `/api/leases`

Lease list responses include the lease, its flat and variant, a selected property summary, the tenant with its password omitted, and payments ordered newest first. Decimal lease and payment values are strings.

There is no lease create route. Leases are created internally when an owner approves an application: the tenant must already have an approved application, the flat must still be `AVAILABLE`, the lease amount is the variant `rentAmount` (or the value passed internally), and the seeded advance payment amount is the variant `advanceAmount`. Flat-level `rentOverride` and `advanceOverride` are stored and returned by flat endpoints but are not consulted when a lease or its payment rows are created. The first monthly-rent payment row is seeded only when the lease start month has already begun; later months are created by the scheduled job.

### GET /api/leases/me

- **Auth:** `TENANT`.
- **Path parameters:** None.
- **Query parameters:** `page` (integer >= 1), `limit` (integer 1–100), `status` (`PENDING`, `ACTIVE`, `INACTIVE`, `COMPLETED`, `TERMINATED`, or `CANCELLED`), and `propertyId` (UUID). Defaults are `page=1` and `limit=10`. Query validation runs before role authentication.
- **Request body:** None.

**Request example**

```http
GET /api/leases/me?page=1&limit=10&status=ACTIVE&propertyId=77777777-7777-4777-8777-777777777777
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Leases fetched successfully",
  "data": {
    "data": [
      {
        "id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        "tenantId": "22222222-2222-4222-8222-222222222222",
        "ownerId": "44444444-4444-4444-8444-444444444444",
        "amount": "15000.00",
        "startDate": "2026-09-01T00:00:00.000Z",
        "endDate": "2027-08-31T23:59:59.999Z",
        "status": "ACTIVE",
        "rejectionReason": null,
        "createdAt": "2026-09-25T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z",
        "flatId": "99999999-9999-4999-8999-999999999999",
        "flat": {
          "id": "99999999-9999-4999-8999-999999999999",
          "propertyId": "77777777-7777-4777-8777-777777777777",
          "variantId": "88888888-8888-4888-8888-888888888888",
          "flatNumber": "GR-101",
          "status": "OCCUPIED",
          "rentOverride": null,
          "advanceOverride": null,
          "createdAt": "2026-09-21T10:00:00.000Z",
          "updatedAt": "2026-09-25T10:00:00.000Z",
          "variant": {
            "id": "88888888-8888-4888-8888-888888888888",
            "propertyId": "77777777-7777-4777-8777-777777777777",
            "name": "3 Bedroom",
            "bedrooms": 3,
            "bathrooms": 2,
            "sizeSqft": 1200,
            "rentAmount": "15000.00",
            "advanceAmount": "45000.00",
            "totalUnits": 2,
            "images": null,
            "createdAt": "2026-09-21T10:00:00.000Z",
            "updatedAt": "2026-09-21T10:00:00.000Z"
          },
          "property": {
            "id": "77777777-7777-4777-8777-777777777777",
            "title": "Skyline Residence",
            "address": "12 Road 5",
            "city": "Dhaka",
            "district": "Dhaka"
          }
        },
        "tenant": {
          "id": "22222222-2222-4222-8222-222222222222",
          "userId": "11111111-1111-4111-8111-111111111111",
          "status": "ACTIVE",
          "employmentStatus": "Software Engineer",
          "aboutMe": "Looking for a quiet home.",
          "createdAt": "2026-09-20T10:00:00.000Z",
          "updatedAt": "2026-09-25T10:00:00.000Z",
          "contactNumber": "01712345678",
          "email": "tenant@example.com",
          "name": "Tenant One",
          "user": {
            "id": "11111111-1111-4111-8111-111111111111",
            "email": "tenant@example.com",
            "address": "12 Road 5, Dhaka",
            "nationalIdNumber": "1234567890",
            "googleId": null,
            "authProvider": "CREDENTIAL",
            "emailVerified": true,
            "role": "TENANT",
            "createdAt": "2026-09-20T10:00:00.000Z",
            "updatedAt": "2026-09-25T10:00:00.000Z",
            "name": "Tenant One",
            "status": "ACTIVE",
            "deletedAt": null,
            "imagePublicId": "",
            "imageUrl": null,
            "isDeleted": false,
            "needPasswordChange": false,
            "gender": "MALE"
          }
        },
        "payments": [
          {
            "id": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            "leaseId": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            "tenantId": "22222222-2222-4222-8222-222222222222",
            "ownerId": "44444444-4444-4444-8444-444444444444",
            "amount": "15000.00",
            "type": "MONTHLY_RENT",
            "status": "PENDING",
            "periodStart": "2026-09-01T00:00:00.000Z",
            "periodEnd": "2026-09-30T23:59:59.999Z",
            "bkashPaymentId": null,
            "bkashTransactionId": null,
            "paymentMethod": null,
            "paidAt": null,
            "createdAt": "2026-09-25T10:00:00.000Z",
            "updatedAt": "2026-09-25T10:00:00.000Z"
          }
        ]
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### GET /api/leases/owner

- **Auth:** `OWNER`.
- **Path parameters:** None.
- **Query parameters:** `page` (integer >= 1), `limit` (integer 1–100), `status` (any `LeaseStatus` value), and `propertyId` (UUID). Defaults are `page=1` and `limit=10`. The service scopes results to leases whose `ownerId` belongs to the authenticated owner.
- **Request body:** None.

**Request example**

```http
GET /api/leases/owner?page=1&limit=10&status=ACTIVE
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Leases fetched successfully",
  "data": {
    "data": [
      {
        "id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        "tenantId": "22222222-2222-4222-8222-222222222222",
        "ownerId": "44444444-4444-4444-8444-444444444444",
        "amount": "15000.00",
        "startDate": "2026-09-01T00:00:00.000Z",
        "endDate": "2027-08-31T23:59:59.999Z",
        "status": "ACTIVE",
        "rejectionReason": null,
        "createdAt": "2026-09-25T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z",
        "flatId": "99999999-9999-4999-8999-999999999999",
        "flat": {
          "id": "99999999-9999-4999-8999-999999999999",
          "propertyId": "77777777-7777-4777-8777-777777777777",
          "variantId": "88888888-8888-4888-8888-888888888888",
          "flatNumber": "GR-101",
          "status": "OCCUPIED",
          "rentOverride": null,
          "advanceOverride": null,
          "createdAt": "2026-09-21T10:00:00.000Z",
          "updatedAt": "2026-09-25T10:00:00.000Z",
          "variant": {
            "id": "88888888-8888-4888-8888-888888888888",
            "propertyId": "77777777-7777-4777-8777-777777777777",
            "name": "3 Bedroom",
            "bedrooms": 3,
            "bathrooms": 2,
            "sizeSqft": 1200,
            "rentAmount": "15000.00",
            "advanceAmount": "45000.00",
            "totalUnits": 2,
            "images": null,
            "createdAt": "2026-09-21T10:00:00.000Z",
            "updatedAt": "2026-09-21T10:00:00.000Z"
          },
          "property": {
            "id": "77777777-7777-4777-8777-777777777777",
            "title": "Skyline Residence",
            "address": "12 Road 5",
            "city": "Dhaka",
            "district": "Dhaka"
          }
        },
        "tenant": {
          "id": "22222222-2222-4222-8222-222222222222",
          "userId": "11111111-1111-4111-8111-111111111111",
          "status": "ACTIVE",
          "employmentStatus": "Software Engineer",
          "aboutMe": "Looking for a quiet home.",
          "createdAt": "2026-09-20T10:00:00.000Z",
          "updatedAt": "2026-09-25T10:00:00.000Z",
          "contactNumber": "01712345678",
          "email": "tenant@example.com",
          "name": "Tenant One",
          "user": {
            "id": "11111111-1111-4111-8111-111111111111",
            "email": "tenant@example.com",
            "address": "12 Road 5, Dhaka",
            "nationalIdNumber": "1234567890",
            "googleId": null,
            "authProvider": "CREDENTIAL",
            "emailVerified": true,
            "role": "TENANT",
            "createdAt": "2026-09-20T10:00:00.000Z",
            "updatedAt": "2026-09-25T10:00:00.000Z",
            "name": "Tenant One",
            "status": "ACTIVE",
            "deletedAt": null,
            "imagePublicId": "",
            "imageUrl": null,
            "isDeleted": false,
            "needPasswordChange": false,
            "gender": "MALE"
          }
        },
        "payments": [
          {
            "id": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            "leaseId": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            "tenantId": "22222222-2222-4222-8222-222222222222",
            "ownerId": "44444444-4444-4444-8444-444444444444",
            "amount": "15000.00",
            "type": "MONTHLY_RENT",
            "status": "PENDING",
            "periodStart": "2026-09-01T00:00:00.000Z",
            "periodEnd": "2026-09-30T23:59:59.999Z",
            "bkashPaymentId": null,
            "bkashTransactionId": null,
            "paymentMethod": null,
            "paidAt": null,
            "createdAt": "2026-09-25T10:00:00.000Z",
            "updatedAt": "2026-09-25T10:00:00.000Z"
          }
        ]
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### GET /api/leases/:id

- **Auth:** `ADMIN`, `SUPERADMIN`, `OWNER`, or `TENANT`.
- **Path parameters:** `id` (required lease UUID).
- **Query parameters:** None.
- **Request body:** None.
- **Access rule:** A tenant may access its own lease, an owner may access leases on its properties, and an administrator may access any lease. Other users receive `404 Lease Not Found`.

**Request example**

```http
GET /api/leases/cccccccc-cccc-4ccc-8ccc-cccccccccccc
```

**Successful response — `200`**

The detail response includes the full property record and its owner, while the list endpoints use a selected property summary.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Lease fetched successfully",
  "data": {
    "id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    "tenantId": "22222222-2222-4222-8222-222222222222",
    "ownerId": "44444444-4444-4444-8444-444444444444",
    "amount": "15000.00",
    "startDate": "2026-09-01T00:00:00.000Z",
    "endDate": "2027-08-31T23:59:59.999Z",
    "status": "ACTIVE",
    "rejectionReason": null,
    "createdAt": "2026-09-25T10:00:00.000Z",
    "updatedAt": "2026-09-25T10:00:00.000Z",
    "flatId": "99999999-9999-4999-8999-999999999999",
    "flat": {
      "id": "99999999-9999-4999-8999-999999999999",
      "propertyId": "77777777-7777-4777-8777-777777777777",
      "variantId": "88888888-8888-4888-8888-888888888888",
      "flatNumber": "GR-101",
      "status": "OCCUPIED",
      "rentOverride": null,
      "advanceOverride": null,
      "createdAt": "2026-09-21T10:00:00.000Z",
      "updatedAt": "2026-09-25T10:00:00.000Z",
      "variant": {
        "id": "88888888-8888-4888-8888-888888888888",
        "propertyId": "77777777-7777-4777-8777-777777777777",
        "name": "3 Bedroom",
        "bedrooms": 3,
        "bathrooms": 2,
        "sizeSqft": 1200,
        "rentAmount": "15000.00",
        "advanceAmount": "45000.00",
        "totalUnits": 2,
        "images": null,
        "createdAt": "2026-09-21T10:00:00.000Z",
        "updatedAt": "2026-09-21T10:00:00.000Z"
      },
      "property": {
        "id": "77777777-7777-4777-8777-777777777777",
        "ownerId": "44444444-4444-4444-8444-444444444444",
        "title": "Skyline Residence",
        "description": "A quiet residential building",
        "address": "12 Road 5",
        "city": "Dhaka",
        "district": "Dhaka",
        "postalCode": "1205",
        "createdAt": "2026-09-25T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z",
        "companyName": "Housely Living",
        "images": null,
        "totalFlats": 12,
        "owner": {
          "id": "44444444-4444-4444-8444-444444444444",
          "userId": "33333333-3333-4333-8333-333333333333",
          "status": "APPROVED",
          "contactNumber": "01811112222",
          "verificationDocuments": [
            {
              "url": "https://res.cloudinary.com/housely/owner-verification/nid.jpg",
              "publicId": "housely/owner-verifications/owner-one/nid"
            }
          ],
          "rejectionReason": null,
          "reviewedBy": "55555555-5555-4555-8555-555555555555",
          "reviewedAt": "2026-09-22T09:00:00.000Z",
          "averageRating": null,
          "totalReviews": 0,
          "createdAt": "2026-09-21T09:00:00.000Z",
          "updatedAt": "2026-09-22T09:00:00.000Z",
          "rejectionHistory": []
        }
      }
    },
    "tenant": {
      "id": "22222222-2222-4222-8222-222222222222",
      "userId": "11111111-1111-4111-8111-111111111111",
      "status": "ACTIVE",
      "employmentStatus": "Software Engineer",
      "aboutMe": "Looking for a quiet home.",
      "createdAt": "2026-09-20T10:00:00.000Z",
      "updatedAt": "2026-09-25T10:00:00.000Z",
      "contactNumber": "01712345678",
      "email": "tenant@example.com",
      "name": "Tenant One",
      "user": {
        "id": "11111111-1111-4111-8111-111111111111",
        "email": "tenant@example.com",
        "address": "12 Road 5, Dhaka",
        "nationalIdNumber": "1234567890",
        "googleId": null,
        "authProvider": "CREDENTIAL",
        "emailVerified": true,
        "role": "TENANT",
        "createdAt": "2026-09-20T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z",
        "name": "Tenant One",
        "status": "ACTIVE",
        "deletedAt": null,
        "imagePublicId": "",
        "imageUrl": null,
        "isDeleted": false,
        "needPasswordChange": false,
        "gender": "MALE"
      }
    },
    "payments": [
      {
        "id": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        "leaseId": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        "tenantId": "22222222-2222-4222-8222-222222222222",
        "ownerId": "44444444-4444-4444-8444-444444444444",
        "amount": "15000.00",
        "type": "MONTHLY_RENT",
        "status": "PENDING",
        "periodStart": "2026-09-01T00:00:00.000Z",
        "periodEnd": "2026-09-30T23:59:59.999Z",
        "bkashPaymentId": null,
        "bkashTransactionId": null,
        "paymentMethod": null,
        "paidAt": null,
        "createdAt": "2026-09-25T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z"
      }
    ]
  }
}
```

### PATCH /api/leases/:id/terminate

- **Auth:** `OWNER`, `ADMIN`, or `SUPERADMIN`.
- **Path parameters:** `id` (required lease UUID).
- **Query parameters:** None.
- **Request body:** JSON, strict object. `rejectionReason` is optional, trimmed, and 1–500 characters; an empty object is valid. The reason is stored on the lease and used in the best-effort termination email.
- **Business rules:** A missing lease returns `404 Lease Not Found`; a non-admin user who does not own the property gets `403 Forbidden: not your property`; only a pending or active lease can be terminated, otherwise `409 Only pending or active leases can be terminated`. Termination changes the lease to `TERMINATED`, makes its flat `AVAILABLE`, and marks all pending payments for the lease `FAILED`.

**Request example**

```json
{
  "rejectionReason": "The tenant requested early termination."
}
```

**Successful response — `200`**

The termination update returns the scalar lease row rather than the expanded list/detail relations.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Lease terminated successfully",
  "data": {
    "id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    "tenantId": "22222222-2222-4222-8222-222222222222",
    "ownerId": "44444444-4444-4444-8444-444444444444",
    "amount": "15000.00",
    "startDate": "2026-09-01T00:00:00.000Z",
    "endDate": "2027-08-31T23:59:59.999Z",
    "status": "TERMINATED",
    "rejectionReason": "The tenant requested early termination.",
    "createdAt": "2026-09-25T10:00:00.000Z",
    "updatedAt": "2026-09-25T11:00:00.000Z",
    "flatId": "99999999-9999-4999-8999-999999999999"
  }
}
```

## Payments — `/api/payments`

Payment amounts and `bkashPaymentId` values are represented as strings. The list routes return a `meta` object containing only `page`, `limit`, and `total`; they do not return `totalPages`.

Any bKash create, execute, or query call that fails upstream returns `502`. The message is `bKash Checkout API request failed`, or `Bkash Access Token Grant Failed` when the access-token grant itself fails. This affects checkout, callback execution, and payment verification.

### POST /api/payments/:id/checkout

- **Auth:** `TENANT`.
- **Path parameters:** `id` (required payment UUID).
- **Query parameters:** None.
- **Request body:** None.
- **Business rules:** The payment must belong to the authenticated tenant and have status `PENDING` or `FAILED`. A monthly-rent payment with a future `periodStart` cannot be checked out yet. Checkout creates or retries a bKash session and stores its payment ID on the local payment row.

**Request example**

```http
POST /api/payments/dddddddd-dddd-4ddd-8ddd-dddddddddddd/checkout
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "bKash checkout initiated successfully",
  "data": {
    "paymentId": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    "bkashPaymentId": "bkash-payment-id",
    "bkashURL": "https://www.bka.sh/bKash/?paymentID=bkash-payment-id",
    "invoice": "222222-ADVANCE-45000.00-dddddddd"
  }
}
```

The invoice format is the tenant ID's first six characters, payment type, two-decimal amount, and payment ID's first eight characters. The service resets a previously failed local payment to `PENDING` before returning the new checkout URL.

### GET /api/payments/callback

- **Auth:** Public. This is an inbound bKash gateway callback.
- **Path parameters:** None.
- **Query parameters:** Required `paymentID` and `status`; optional `signature` and `apiVersion`. The query schema is strict, so unknown query keys are rejected. `signature` is accepted but is not verified by the current service.
- **Request body:** None.

**Request example**

```http
GET /api/payments/callback?paymentID=bkash-payment-id&status=success&apiVersion=1.0
```

**Successful response — `302 Found`**

The controller redirects instead of returning JSON:

```http
HTTP/1.1 302 Found
Location: <frontend_url>/dashboard/payments?status=success&paymentId=dddddddd-dddd-4ddd-8ddd-dddddddddddd&trxID=bkash-transaction-id
```

For a failed or cancelled callback, the redirect contains the callback status (or `failure`) without the payment and transaction IDs:

```http
HTTP/1.1 302 Found
Location: <frontend_url>/dashboard/payments?status=failure
```

A callback for an already completed payment redirects to the success URL without re-executing bKash. Missing payment IDs fail query validation, unknown payment IDs return `404 Payment not found`, a non-success execution marks the local payment `FAILED`, and an amount mismatch returns a JSON `400` error instead of a redirect. Successful execution sets `COMPLETED`, `bkashTransactionId`, `paidAt`, and `paymentMethod` to `bkash`, then sends the invoice asynchronously.

### POST /api/payments/verify

- **Auth:** `TENANT` or `OWNER`.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** JSON, strict object with required non-empty `paymentID` and `status`. Authentication runs before body validation.
- **Access rule:** The current service queries bKash by `paymentID` but does not additionally check whether the authenticated tenant or owner owns that local payment.

**Request example**

```json
{
  "paymentID": "bkash-payment-id",
  "status": "success"
}
```

**Successful response — `200`**

For a completed bKash transaction:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payment verified successfully",
  "data": {
    "paymentId": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    "status": "COMPLETED",
    "trxID": "bkash-transaction-id"
  }
}
```

If bKash reports a non-completed transaction, the response keeps the bKash status and returns a null local payment ID, for example:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payment verified successfully",
  "data": {
    "paymentId": null,
    "status": "Failed",
    "trxID": null
  }
}
```

### GET /api/payments/me

- **Auth:** `TENANT`.
- **Path parameters:** None.
- **Query parameters:** The intended filters are `page`, `limit`, `type` (`ADVANCE` or `MONTHLY_RENT`), and `status` (`PENDING`, `COMPLETED`, or `FAILED`). The route currently does not apply its Zod query schema, so these values are not validated or capped; defaults are `page=1` and `limit=10`. `leaseId` is not used by this tenant-list service.
- **Request body:** None.

**Request example**

```http
GET /api/payments/me?page=1&limit=10&type=ADVANCE&status=PENDING
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payments fetched successfully",
  "data": {
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1
    },
    "data": [
      {
        "id": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        "leaseId": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        "tenantId": "22222222-2222-4222-8222-222222222222",
        "ownerId": "44444444-4444-4444-8444-444444444444",
        "amount": "45000.00",
        "type": "ADVANCE",
        "status": "PENDING",
        "periodStart": null,
        "periodEnd": null,
        "bkashPaymentId": null,
        "bkashTransactionId": null,
        "paymentMethod": null,
        "paidAt": null,
        "createdAt": "2026-09-25T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:00:00.000Z"
      }
    ]
  }
}
```

Payments are ordered by `createdAt` ascending. Because the list query middleware is not wired, an invalid `type` or `status` value is passed to Prisma rather than being rejected by Zod.

### GET /api/payments/owner

- **Auth:** `OWNER`, `ADMIN`, or `SUPERADMIN`.
- **Path parameters:** None.
- **Query parameters:** The intended filters are `page`, `limit`, `type` (`ADVANCE` or `MONTHLY_RENT`), and `status` (`PENDING`, `COMPLETED`, or `FAILED`). The current route does not apply its Zod query schema, so these values are not validated or capped. Although the defined owner schema contains `leaseId`, the service ignores it completely.
- **Request body:** None.

**Request example**

```http
GET /api/payments/owner?page=1&limit=10&status=COMPLETED
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payments fetched successfully",
  "data": {
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1
    },
    "data": [
      {
        "id": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        "leaseId": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        "tenantId": "22222222-2222-4222-8222-222222222222",
        "ownerId": "44444444-4444-4444-8444-444444444444",
        "amount": "15000.00",
        "type": "MONTHLY_RENT",
        "status": "COMPLETED",
        "periodStart": "2026-09-01T00:00:00.000Z",
        "periodEnd": "2026-09-30T23:59:59.999Z",
        "bkashPaymentId": "bkash-payment-id",
        "bkashTransactionId": "bkash-transaction-id",
        "paymentMethod": "bkash",
        "paidAt": "2026-09-25T10:05:00.000Z",
        "createdAt": "2026-09-25T10:00:00.000Z",
        "updatedAt": "2026-09-25T10:05:00.000Z"
      }
    ]
  }
}
```

For an owner, results are scoped to the authenticated owner profile. For an administrator or superadmin, the owner scope is omitted, so all payments matching the applied filters are returned.

## Variants — `/api/variants`

A variant describes the bedroom/bathroom configuration and pricing for a group of flats. Creating a variant also creates its initial flats in one database transaction. The route path is the misspelled source module name `varient`, but the mounted URL is `/api/variants`.

### POST /api/variants/:propertyId

- **Auth:** `OWNER`.
- **Path parameters:** `propertyId` (required property UUID).
- **Query parameters:** None.
- **Request body:** `multipart/form-data`. Send fields as a JSON string in `data` or as individual multipart text fields. The JSON object is strict. Required fields are `name` (2–100 characters), `bedrooms` and `bathrooms` (integers 0–20), `rentAmount` (positive, at most 10000000), `advanceAmount` (non-negative, at most 10000000), and `totalUnits` (integer 1–100). `sizeSqft` is an optional integer 50–20000. `flatNumberPrefix` is an optional alphanumeric string of at most 10 characters.
- **Files:** Optional `images` files. The route declares five, but the shared Multer limit makes the effective maximum four files per request. Each file is at most 5 MB and may be JPG, PNG, WEBP, or PDF. A PDF passes Multer validation, but this uploader forces Cloudinary `resource_type: "image"`, so a PDF can fail during Cloudinary processing.
- **Business rules:** The authenticated user must own the property, a property may have at most five variants, and generated flat numbers are assigned sequentially starting at `101`. If no prefix is supplied, the first four alphanumeric characters of the variant name are uppercased, or `FLAT` is used.

**Request example (multipart)**

```text
Content-Type: multipart/form-data

data: {"name":"3 Bedroom","bedrooms":3,"bathrooms":2,"sizeSqft":1200,"rentAmount":15000,"advanceAmount":45000,"totalUnits":2,"flatNumberPrefix":"GR"}
images: <binary variant image, for example variant.jpg>
```

**Successful response — `201`**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Variant created successfully",
  "data": {
    "id": "88888888-8888-4888-8888-888888888888",
    "propertyId": "77777777-7777-4777-8777-777777777777",
    "name": "3 Bedroom",
    "bedrooms": 3,
    "bathrooms": 2,
    "sizeSqft": 1200,
    "rentAmount": "15000.00",
    "advanceAmount": "45000.00",
    "totalUnits": 2,
    "images": [
      {
        "url": "https://res.cloudinary.com/housely/image/upload/housely/variants/77777777-7777-4777-8777-777777777777/variant.jpg",
        "publicId": "housely/variants/77777777-7777-4777-8777-777777777777/variant"
      }
    ],
    "createdAt": "2026-09-21T10:00:00.000Z",
    "updatedAt": "2026-09-21T10:00:00.000Z",
    "flats": [
      {
        "id": "99999999-9999-4999-8999-999999999999",
        "propertyId": "77777777-7777-4777-8777-777777777777",
        "variantId": "88888888-8888-4888-8888-888888888888",
        "flatNumber": "GR-101",
        "status": "AVAILABLE",
        "rentOverride": null,
        "advanceOverride": null,
        "createdAt": "2026-09-21T10:00:00.000Z",
        "updatedAt": "2026-09-21T10:00:00.000Z"
      },
      {
        "id": "99999999-9999-4999-8999-99999999999a",
        "propertyId": "77777777-7777-4777-8777-777777777777",
        "variantId": "88888888-8888-4888-8888-888888888888",
        "flatNumber": "GR-102",
        "status": "AVAILABLE",
        "rentOverride": null,
        "advanceOverride": null,
        "createdAt": "2026-09-21T10:00:00.000Z",
        "updatedAt": "2026-09-21T10:00:00.000Z"
      }
    ]
  }
}
```

If Cloudinary upload or the database transaction fails, already uploaded files are destroyed on a best-effort basis.

### GET /api/variants/

- **Auth:** Public.
- **Path parameters:** None.
- **Query parameters:** None.
- **Request body:** None.
- **Ordering:** The intended result is newest first.
- **Empty result:** If no variants exist, the response is `404` with the message `No variants found`.

**Request example**

```http
GET /api/variants/
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Variants fetched successfully",
  "data": [
    {
      "id": "88888888-8888-4888-8888-888888888888",
      "propertyId": "77777777-7777-4777-8777-777777777777",
      "name": "3 Bedroom",
      "bedrooms": 3,
      "bathrooms": 2,
      "sizeSqft": 1200,
      "rentAmount": "15000.00",
      "advanceAmount": "45000.00",
      "totalUnits": 2,
      "images": null,
      "createdAt": "2026-09-21T10:00:00.000Z",
      "updatedAt": "2026-09-21T10:00:00.000Z",
      "property": {
        "id": "77777777-7777-4777-8777-777777777777",
        "title": "Skyline Residence",
        "address": "12 Road 5",
        "city": "Dhaka",
        "district": "Dhaka",
        "ownerId": "44444444-4444-4444-8444-444444444444"
      },
      "_count": {
        "flats": 2
      }
    }
  ]
}
```

### GET /api/variants/:propertyId

- **Auth:** Public.
- **Path parameters:** `propertyId` (required property UUID).
- **Query parameters:** None.
- **Request body:** None.
- **Ordering:** Property-scoped variants are returned oldest first.
- **Empty result:** If the property has no variants, the response is `404` with the exact typo `No varients found`.

**Request example**

```http
GET /api/variants/77777777-7777-4777-8777-777777777777
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Variants fetched successfully",
  "data": [
    {
      "id": "88888888-8888-4888-8888-888888888888",
      "propertyId": "77777777-7777-4777-8777-777777777777",
      "name": "3 Bedroom",
      "bedrooms": 3,
      "bathrooms": 2,
      "sizeSqft": 1200,
      "rentAmount": "15000.00",
      "advanceAmount": "45000.00",
      "totalUnits": 2,
      "images": null,
      "createdAt": "2026-09-21T10:00:00.000Z",
      "updatedAt": "2026-09-21T10:00:00.000Z",
      "_count": {
        "flats": 2
      }
    }
  ]
}
```

### PATCH /api/variants/:id

- **Auth:** `OWNER`.
- **Path parameters:** `id` (required variant UUID).
- **Query parameters:** None.
- **Request body:** JSON, strict object with at least one of `name` (2–100 characters), `bedrooms` (integer 0–20), `bathrooms` (integer 0–20), `sizeSqft` (integer 50–20000), `rentAmount` (positive, at most 10000000), or `advanceAmount` (non-negative, at most 10000000). Unknown fields are rejected.
- **Business rules:** The authenticated user must own the variant's property. Updated pricing affects future leases only; existing lease amounts are not rewritten.

**Request example**

```json
{
  "name": "3 Bedroom Updated",
  "rentAmount": 16000,
  "advanceAmount": 48000
}
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Variant updated successfully. New pricing applies to future leases only.",
  "data": {
    "id": "88888888-8888-4888-8888-888888888888",
    "propertyId": "77777777-7777-4777-8777-777777777777",
    "name": "3 Bedroom Updated",
    "bedrooms": 3,
    "bathrooms": 2,
    "sizeSqft": 1200,
    "rentAmount": "16000.00",
    "advanceAmount": "48000.00",
    "totalUnits": 2,
    "images": null,
    "createdAt": "2026-09-21T10:00:00.000Z",
    "updatedAt": "2026-09-25T11:00:00.000Z",
    "_count": {
      "flats": 2
    }
  }
}
```

The update response includes `_count.flats` but does not include the individual flat records.

### DELETE /api/variants/:id

- **Auth:** `OWNER`.
- **Path parameters:** `id` (required variant UUID).
- **Query parameters:** None.
- **Request body:** None.
- **Business rules:** The owner must own the property. A variant cannot be deleted when any of its flats has a lease or a pending/approved application. Deletion removes the variant's flats, deletes the variant, and decrements the property's `totalFlats` by the variant's `totalUnits`.

**Request example**

```http
DELETE /api/variants/88888888-8888-4888-8888-888888888888
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Variant deleted successfully",
  "data": null
}
```

## Flats — `/api/flats`

Flat rows belong to both a property and a variant. `rentOverride` and `advanceOverride` are nullable Decimal values and serialize as strings or `null`.

### POST /api/flats/variants/:id

- **Auth:** `OWNER`.
- **Path parameters:** `id` (required variant UUID).
- **Query parameters:** None.
- **Request body:** JSON, strict object. `count` is required and is coerced to an integer from 1 through 100. `flatNumberPrefix` is optional, alphanumeric, and at most 10 characters.
- **Business rules:** The authenticated user must own the variant's property. When `flatNumberPrefix` is omitted, the service derives a prefix from the variant name (the first four alphanumeric characters, uppercased) and falls back to `FLAT`. Generated numbers start at `<prefix>-101` and skip values already used anywhere in that property. The variant's `totalUnits` and the property's `totalFlats` are incremented in the same transaction.

**Request example**

```json
{
  "count": 2,
  "flatNumberPrefix": "GR"
}
```

**Successful response — `201`**

The response returns the full variant and all of its flats, sorted by `flatNumber`; it is not limited to only the newly created rows.

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Flats added successfully",
  "data": {
    "id": "88888888-8888-4888-8888-888888888888",
    "propertyId": "77777777-7777-4777-8777-777777777777",
    "name": "3 Bedroom",
    "bedrooms": 3,
    "bathrooms": 2,
    "sizeSqft": 1200,
    "rentAmount": "15000.00",
    "advanceAmount": "45000.00",
    "totalUnits": 4,
    "images": null,
    "createdAt": "2026-09-21T10:00:00.000Z",
    "updatedAt": "2026-09-25T11:00:00.000Z",
    "flats": [
      {
        "id": "99999999-9999-4999-8999-999999999999",
        "propertyId": "77777777-7777-4777-8777-777777777777",
        "variantId": "88888888-8888-4888-8888-888888888888",
        "flatNumber": "GR-101",
        "status": "AVAILABLE",
        "rentOverride": null,
        "advanceOverride": null,
        "createdAt": "2026-09-21T10:00:00.000Z",
        "updatedAt": "2026-09-21T10:00:00.000Z"
      },
      {
        "id": "99999999-9999-4999-8999-99999999999a",
        "propertyId": "77777777-7777-4777-8777-777777777777",
        "variantId": "88888888-8888-4888-8888-888888888888",
        "flatNumber": "GR-102",
        "status": "AVAILABLE",
        "rentOverride": null,
        "advanceOverride": null,
        "createdAt": "2026-09-21T10:00:00.000Z",
        "updatedAt": "2026-09-21T10:00:00.000Z"
      },
      {
        "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "propertyId": "77777777-7777-4777-8777-777777777777",
        "variantId": "88888888-8888-4888-8888-888888888888",
        "flatNumber": "GR-103",
        "status": "AVAILABLE",
        "rentOverride": null,
        "advanceOverride": null,
        "createdAt": "2026-09-25T11:00:00.000Z",
        "updatedAt": "2026-09-25T11:00:00.000Z"
      },
      {
        "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "propertyId": "77777777-7777-4777-8777-777777777777",
        "variantId": "88888888-8888-4888-8888-888888888888",
        "flatNumber": "GR-104",
        "status": "AVAILABLE",
        "rentOverride": null,
        "advanceOverride": null,
        "createdAt": "2026-09-25T11:00:00.000Z",
        "updatedAt": "2026-09-25T11:00:00.000Z"
      }
    ]
  }
}
```

### GET /api/flats/

- **Auth:** Public.
- **Path parameters:** None.
- **Query parameters:** `page` (integer >= 1), `limit` (integer 1–100), `status` (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`, or `UNAVAILABLE`), `city`, `district`, `minBedrooms` (integer >= 0), and `maxRent` (positive number). Defaults are `page=1` and `limit=10`; when `status` is omitted, only `AVAILABLE` flats are returned. `city` and `district` are case-insensitive substring filters.
- **Current filter caveat:** The service writes the `minBedrooms` and `maxRent` conditions into the same `variant` object. When both are supplied, the later `maxRent` spread replaces the earlier `minBedrooms` condition, so `minBedrooms` is not applied. Query validation otherwise removes unknown keys.
- **Request body:** None.

**Request example**

```http
GET /api/flats/?page=1&limit=10&status=AVAILABLE&city=Dhaka&maxRent=20000
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Flats fetched successfully",
  "data": {
    "data": [
      {
        "id": "99999999-9999-4999-8999-999999999999",
        "propertyId": "77777777-7777-4777-8777-777777777777",
        "variantId": "88888888-8888-4888-8888-888888888888",
        "flatNumber": "GR-101",
        "status": "AVAILABLE",
        "rentOverride": null,
        "advanceOverride": null,
        "createdAt": "2026-09-21T10:00:00.000Z",
        "updatedAt": "2026-09-21T10:00:00.000Z",
        "variant": {
          "id": "88888888-8888-4888-8888-888888888888",
          "propertyId": "77777777-7777-4777-8777-777777777777",
          "name": "3 Bedroom",
          "bedrooms": 3,
          "bathrooms": 2,
          "sizeSqft": 1200,
          "rentAmount": "15000.00",
          "advanceAmount": "45000.00",
          "totalUnits": 2,
          "images": null,
          "createdAt": "2026-09-21T10:00:00.000Z",
          "updatedAt": "2026-09-21T10:00:00.000Z"
        },
        "property": {
          "id": "77777777-7777-4777-8777-777777777777",
          "title": "Skyline Residence",
          "address": "12 Road 5",
          "city": "Dhaka",
          "district": "Dhaka",
          "images": null
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### GET /api/flats/properties/:propertyId/

- **Auth:** Public.
- **Path parameters:** `propertyId` (required property UUID).
- **Query parameters:** Optional `variantId`. The route validates the property path parameter but does not validate the query string; when supplied, this value filters the property's flats by variant.
- **Request body:** None.
- **Ordering:** Flats are ordered by `flatNumber` ascending. This endpoint does not default to `AVAILABLE`; it returns all statuses unless a variant filter narrows the result.
- **Missing property:** A missing property returns `404` with the exact message `Property no found`.

**Request example**

```http
GET /api/flats/properties/77777777-7777-4777-8777-777777777777/?variantId=88888888-8888-4888-8888-888888888888
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Flats fetched successfully",
  "data": [
    {
      "id": "99999999-9999-4999-8999-999999999999",
      "propertyId": "77777777-7777-4777-8777-777777777777",
      "variantId": "88888888-8888-4888-8888-888888888888",
      "flatNumber": "GR-101",
      "status": "AVAILABLE",
      "rentOverride": null,
      "advanceOverride": null,
      "createdAt": "2026-09-21T10:00:00.000Z",
      "updatedAt": "2026-09-21T10:00:00.000Z",
      "variant": {
        "id": "88888888-8888-4888-8888-888888888888",
        "propertyId": "77777777-7777-4777-8777-777777777777",
        "name": "3 Bedroom",
        "bedrooms": 3,
        "bathrooms": 2,
        "sizeSqft": 1200,
        "rentAmount": "15000.00",
        "advanceAmount": "45000.00",
        "totalUnits": 2,
        "images": null,
        "createdAt": "2026-09-21T10:00:00.000Z",
        "updatedAt": "2026-09-21T10:00:00.000Z"
      }
    }
  ]
}
```

### PATCH /api/flats/:id

- **Auth:** `OWNER`.
- **Path parameters:** `id` (required flat UUID).
- **Query parameters:** None.
- **Request body:** JSON, strict object with at least one field. Accepted fields are `flatNumber` (alphanumeric characters and hyphens, 1–20 characters), `status` (`AVAILABLE`, `MAINTENANCE`, or `UNAVAILABLE`), `rentOverride` (positive number or `null`, at most 10000000), and `advanceOverride` (non-negative number or `null`, at most 10000000).
- **Business rules:** The authenticated user must own the flat's property. The occupied-flat restriction only applies when `status` is included in the body: sending `status` for an `OCCUPIED` flat returns `409` with `Occupied flats are managed by leases and cannot be updated manually`, while `flatNumber`, `rentOverride`, and `advanceOverride` can still be changed on an occupied flat. A non-available flat can only be moved back to `AVAILABLE`; a duplicate flat number within the same property is rejected.

**Request example**

```json
{
  "flatNumber": "GR-105",
  "status": "MAINTENANCE",
  "rentOverride": 15500,
  "advanceOverride": null
}
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Flat updated successfully",
  "data": {
    "id": "99999999-9999-4999-8999-999999999999",
    "propertyId": "77777777-7777-4777-8777-777777777777",
    "variantId": "88888888-8888-4888-8888-888888888888",
    "flatNumber": "GR-105",
    "status": "MAINTENANCE",
    "rentOverride": "15500.00",
    "advanceOverride": null,
    "createdAt": "2026-09-21T10:00:00.000Z",
    "updatedAt": "2026-09-25T11:00:00.000Z",
    "variant": {
      "id": "88888888-8888-4888-8888-888888888888",
      "propertyId": "77777777-7777-4777-8777-777777777777",
      "name": "3 Bedroom",
      "bedrooms": 3,
      "bathrooms": 2,
      "sizeSqft": 1200,
      "rentAmount": "15000.00",
      "advanceAmount": "45000.00",
      "totalUnits": 2,
      "images": null,
      "createdAt": "2026-09-21T10:00:00.000Z",
      "updatedAt": "2026-09-21T10:00:00.000Z"
    }
  }
}
```

### DELETE /api/flats/:id

- **Auth:** `OWNER`.
- **Path parameters:** `id` (required flat UUID).
- **Query parameters:** None.
- **Request body:** None.
- **Business rules:** The authenticated user must own the flat's property. Only `AVAILABLE` flats can be deleted, and the flat must have no lease history and no pending or approved applications. Deletion decrements the variant's `totalUnits` and the property's `totalFlats`.

**Request example**

```http
DELETE /api/flats/99999999-9999-4999-8999-999999999999
```

**Successful response — `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Flat deleted successfully",
  "data": null
}
```
