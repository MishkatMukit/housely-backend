# Housely Backend API Documentation

Base URL: `http://localhost:5000` (default port, configurable via `PORT` env)

## Table of Contents

- [Authentication](#authentication)
- [Standard Response Format](#standard-response-format)
- [Error Format](#error-format)
- [Enums](#enums)
- [Auth](#auth-endpoints--apiauth)
- [Users](#users--apiusers)
- [Owner](#owner--apiowner)
- [Tenants](#tenants--apitenants)
- [Properties](#properties--apiproperties)
- [Applications](#applications--apiapplications)
- [Leases](#leases--apileases)
- [Payments](#payments--apipayments)
- [Variants](#variants--apivariants)
- [Flats](#flats--apiflats)

---

## Authentication

JWT-based. Tokens are accepted via:

1. `accessToken` cookie (httpOnly, set on login)
2. `Authorization: Bearer <token>` header
3. Raw `Authorization: <token>` header

| Auth | Role(s) allowed |
|---|---|
| `auth()` | Any authenticated user |
| `auth(ADMIN, SUPERADMIN)` | Admin/Super Admin |
| `auth(OWNER)` | Owner |
| `auth(TENANT)` | Tenant |
| `auth(OWNER, ADMIN, SUPERADMIN)` | Owner, Admin, Super Admin |
| `auth(TENANT, OWNER, ADMIN, SUPERADMIN)` | Any role |
| `auth(ADMIN, SUPERADMIN, OWNER, TENANT)` | Any role |

**Cookies set on login/verify-email/google/refresh-token:**

```
accessToken (httpOnly, 24h), refreshToken (httpOnly, 7d)
```

---

## Standard Response Format

### Success (single resource / action)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User logged in successfully",
  "data": { }
}
```

### Success (list / paginated)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Flats fetched successfully",
  "data": {
    "data": [ { "id": "...", "flatNumber": "GR-101", "status": "AVAILABLE" } ],
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

**Pagination defaults:** `page = 1`, `limit = 10` (max `100`).

---

## Error Format

```json
{
  "success": false,
  "statusCode": 400,
  "name": "ZodError",
  "message": "body.title: Expected string, received number"
}
```

Common status codes:

| Code | Meaning |
|---|---|
| 400 | Validation error / bad request / duplicate key |
| 401 | Unauthenticated / invalid token |
| 403 | Blocked user / forbidden role |
| 404 | Resource not found / route not found |
| 409 | Conflict (already exists, not available, etc.) |
| 500 | Internal server error |

404 route not found:

```json
{ "message": "Route not found", "path": "/api/nonexistent", "date": "2026-09-23T10:00:00.000Z" }
```

---

## Enums

| Enum | Values |
|---|---|
| `Role` | `TENANT`, `OWNER`, `ADMIN`, `SUPERADMIN` |
| `UserStatus` | `ACTIVE`, `BLOCKED`, `DELETED` |
| `TenantStatus` | `ACTIVE`, `INACTIVE` |
| `OwnerStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `FlatStatus` | `AVAILABLE`, `OCCUPIED`, `MAINTENANCE`, `UNAVAILABLE` |
| `ApplicationStatus` | `PENDING`, `APPROVED`, `REJECTED`, `WITHDRAWN` |
| `LeaseStatus` | `PENDING`, `ACTIVE`, `INACTIVE`, `COMPLETED`, `TERMINATED`, `CANCELLED` |
| `PaymentStatus` | `PENDING`, `COMPLETED`, `FAILED` |
| `PaymentType` | `ADVANCE`, `MONTHLY_RENT` |

---

## Auth Endpoints — `/api/auth`

### POST `/api/auth/register`

Register a user. An OTP email is sent to the user (valid 5 minutes).

**Body (JSON):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | |
| `email` | string | yes | lowercased |
| `password` | string | yes | hashed with bcrypt |

**Example request:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123"
}
```

**Example response (201):**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Registration successful! OTP has been sent to your email.",
  "data": {}
}
```

### POST `/api/auth/verify-email`

Verify the email using the OTP received. Success sets the auth cookies and marks `emailVerified = true`.

**Body (JSON):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | |
| `otp` | string | yes | 6-digit, valid 5 min |

**Example request:**

```json
{ "email": "john@example.com", "otp": "123456" }
```

**Example response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Email verified successfully",
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "TENANT" }
  }
}
```

### POST `/api/auth/login`

**Body (JSON):**

| Field | Type | Required |
|---|---|---|
| `email` | string | yes |
| `password` | string | yes |

**Example request:**

```json
{ "email": "john@example.com", "password": "secret123" }
```

**Example response (200):** same shape as verify-email (`accessToken`, `refreshToken`, `user`).

### GET `/api/auth/me`

Returns the current authenticated user's profile. Auth required (any role).

**Example response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User fetched successfully",
  "data": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "TENANT" }
}
```

### POST `/api/auth/refresh-token`

Returns new access + refresh tokens. Auth required (any role). Reads the `refreshToken` cookie.

**Example response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Token refreshed successfully",
  "data": { "accessToken": "...", "refreshToken": "..." }
}
```

### POST `/api/auth/google`

Google OAuth login with an ID token.

**Body (JSON):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `idToken` | string | yes | Google ID token |

**Example request:**

```json
{ "idToken": "eyJhbGciOi..." }
```

### POST `/api/auth/forgot-password`

Sends an OTP to the user's email (valid 5 minutes).

**Body (JSON):**

| Field | Type | Required |
|---|---|---|
| `email` | string | yes |

**Example request:**

```json
{ "email": "john@example.com" }
```

### POST `/api/auth/reset-password`

Resets the password using the emailed OTP.

**Body (JSON):**

| Field | Type | Required |
|---|---|---|
| `email` | string | yes |
| `otp` | string | yes |
| `newPassword` | string | yes |

**Example request:**

```json
{
  "email": "john@example.com",
  "otp": "654321",
  "newPassword": "newsecret123"
}
```

---

## Users — `/api/users`

### GET `/api/users`

List users. Auth: `ADMIN`, `SUPERADMIN`.

**Query params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `page` | number | no | min 1, default 1 |
| `limit` | number | no | 1–100, default 10 |
| `status` | `UserStatus` | no | `ACTIVE`, `BLOCKED`, `DELETED` |
| `role` | `Role` | no | `TENANT`, `OWNER`, `ADMIN`, `SUPERADMIN` |
| `search` | string | no | matches name/email, case-insensitive |

**Example request:**

```
GET /api/users?page=1&limit=10&role=TENANT&search=john
```

### PATCH `/api/users/profile`

Update own profile. Auth: any role. At least one field required.

**Body (JSON):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | no | 2–100 chars |
| `address` | string | no | min 1 |
| `gender` | `"MALE"` / `"FEMALE"` | no | |
| `nationalIdNumber` | string | no | 1–50 chars |

**Example request:**

```json
{ "name": "John Doe Updated", "gender": "MALE" }
```

### GET `/api/users/:id`

Get user by id. Auth: `ADMIN`, `SUPERADMIN`.

Path: `id` (uuid).

### PATCH `/api/users/:id/block`

Block a user. Auth: `ADMIN`, `SUPERADMIN`.

Path: `id` (uuid).

### PATCH `/api/users/:id/unblock`

Unblock a user. Auth: `ADMIN`, `SUPERADMIN`.

Path: `id` (uuid).

### DELETE `/api/users/:id`

Delete a user (soft delete). Auth: `ADMIN`, `SUPERADMIN`.

Path: `id` (uuid).

### PATCH `/api/users/profile-image`

Upload a profile image. Auth: any role. `multipart/form-data`.

Multipart field `profileImage` (single file). Allowed: jpg/png/webp/pdf, max 5MB. Image is uploaded to Cloudinary.

**Example request (multipart):**

```
PATCH /api/users/profile-image
Content-Type: multipart/form-data

profileImage: [binary file]
```

---

## Owner — `/api/owner`

### POST `/api/owner/apply`

Apply to become an owner. Auth: `TENANT`. `multipart/form-data`.

| Part | Type | Required | Notes |
|---|---|---|---|
| `data` | string (JSON) | yes | see fields below |
| `verificationDocuments` | files | yes | 1–4 files (NID + ownership proof), jpg/png/webp/pdf, max 5MB each |

`data` JSON fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `contactNumber` | string | yes | 6–20 chars |
| `address` | string | yes | 5–255 chars |
| `nationalIdNumber` | string | yes | 4–50 chars |

**Example request (multipart):**

```
POST /api/owner/apply
Content-Type: multipart/form-data

data: {"contactNumber":"01712345678","address":"123 Dhaka Street","nationalIdNumber":"1234567890"}
verificationDocuments: [file1, file2]
```

### GET `/api/owner/profile`

Get own owner profile. Auth: `OWNER`.

### PATCH `/api/owner/update-profile`

Update own owner profile (updates Owner + User atomically). Auth: `OWNER`. At least one field required.

**Body (JSON):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `contactNumber` | string | no | 6–20 chars |
| `name` | string | no | 2–100 chars |
| `address` | string | no | min 1 |
| `gender` | `"MALE"` / `"FEMALE"` | no | |
| `nationalIdNumber` | string | no | 1–50 chars |

**Example request:**

```json
{ "contactNumber": "01811112222", "name": "Mr. Owner" }
```

### GET `/api/owner`

List owners. Auth: `ADMIN`, `SUPERADMIN`.

**Query params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `page` | number | no | default 1 |
| `limit` | number | no | 1–100, default 10 |
| `status` | `OwnerStatus` | no | `PENDING`, `APPROVED`, `REJECTED` |
| `search` | string | no | name/email |

### GET `/api/owner/applications`

List owner applications. Auth: `ADMIN`, `SUPERADMIN`. Same query params as above; defaults to `status=PENDING`.

### PATCH `/api/owner/approve/:id`

Approve an owner application. Auth: `ADMIN`, `SUPERADMIN`.

Path: `id` (uuid).

On approval, the user's role flips to `OWNER` and their tenant profile is set `INACTIVE`.

### PATCH `/api/owner/reject/:id`

Reject an owner application. Auth: `ADMIN`, `SUPERADMIN`.

Path: `id` (uuid).

**Body (JSON):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `rejectionReason` | string | yes | 1–500 chars; appended to `rejectionHistory` |

**Example request:**

```json
{ "rejectionReason": "Verification documents are not clear." }
```

---

## Tenants — `/api/tenants`

### GET `/api/tenants/me`

Get own tenant profile. Auth: `TENANT`.

### PATCH `/api/tenants/me`

Update own tenant profile (updates Tenant + User atomically). Auth: `TENANT`. At least one field required.

**Body (JSON):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | no | 2–100 chars |
| `address` | string | no | min 1 |
| `gender` | `"MALE"` / `"FEMALE"` | no | |
| `nationalIdNumber` | string | no | 1–50 chars |
| `contactNumber` | string | no | 6–20 chars |
| `employmentStatus` | string | no | 2–100 chars |
| `aboutMe` | string | no | max 1000 |

**Example request:**

```json
{
  "name": "John Doe",
  "contactNumber": "01712345678",
  "employmentStatus": "Software Engineer",
  "aboutMe": "Looking for a family-friendly apartment."
}
```

### GET `/api/tenants`

List tenants. Auth: `ADMIN`, `SUPERADMIN`.

**Query params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `page` | number | no | default 1 |
| `limit` | number | no | 1–100, default 10 |
| `status` | `TenantStatus` | no | `ACTIVE`, `INACTIVE` |
| `search` | string | no | |

---

## Properties — `/api/properties`

### POST `/api/properties`

Create a property. Auth: `OWNER` (only APPROVED owners). `multipart/form-data`.

| Part | Type | Required | Notes |
|---|---|---|---|
| `data` | string (JSON) | yes | see fields below |
| `images` | files | no | max 5 files, jpg/png/webp, max 5MB each |

`data` JSON fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | 3–150 chars |
| `description` | string | no | max 2000 |
| `address` | string | yes | 5–255 chars |
| `city` | string | yes | 2–100 chars |
| `district` | string | yes | 2–100 chars |
| `postalCode` | string | no | max 20 |
| `companyName` | string | no | max 150 |

**Example request (multipart):**

```
POST /api/properties
Content-Type: multipart/form-data

data: {"title":"Skyline Residence","description":"Modern apartments","address":"12 Road 5","city":"Dhaka","district":"Dhaka","postalCode":"1212","companyName":"Skyline Group"}
images: [file1, file2]
```

**Example response (201):**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Property created successfully",
  "data": {
    "id": "uuid",
    "title": "Skyline Residence",
    "address": "12 Road 5",
    "city": "Dhaka",
    "district": "Dhaka",
    "postalCode": "1212",
    "totalFlats": 0,
    "images": [ { "url": "https://res.cloudinary.com/...", "publicId": "housely/..." } ],
    "ownerId": "uuid"
  }
}
```

### GET `/api/properties`

List properties (public).

**Query params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `page` | number | no | default 1 |
| `limit` | number | no | 1–100, default 10 |
| `search` | string | no | |
| `city` | string | no | |
| `district` | string | no | |
| `ownerId` | uuid | no | |

**Example request:**

```
GET /api/properties?city=Dhaka&district=Dhaka&limit=10
```

### GET `/api/properties/:id`

Get property by id (public).

Path: `id` (uuid).

### GET `/api/properties/vacancy/:propertyId`

Count available flats for a property (public).

Path: `propertyId` (uuid). Optional query: `variantId` (uuid).

**Example response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vacancy fetched successfully",
  "data": { "available": 5 }
}
```

---

## Applications — `/api/applications`

### POST `/api/applications`

Apply for a flat. Auth: `TENANT`.

**Body (JSON) (`applyForFlatSchema`):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `flatId` | uuid | yes | |
| `monthlyIncome` | number | no | > 0, max 100,000,000 |
| `employment` | string | no | 2–100 chars |
| `message` | string | no | 1–2000 chars |

**Example request:**

```json
{
  "flatId": "uuid",
  "monthlyIncome": 80000,
  "employment": "Software Engineer",
  "message": "I would love to rent this flat."
}
```

### GET `/api/applications/me`

List own applications. Auth: `TENANT`.

**Query params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `page` | number | no | default 1 |
| `limit` | number | no | 1–100, default 10 |
| `status` | `ApplicationStatus` | no | `PENDING`, `APPROVED`, `REJECTED`, `WITHDRAWN` |
| `flatId` | uuid | no | |

### GET `/api/applications/property/:propertyId`

List applications for a property. Auth: `OWNER`.

Path: `propertyId` (uuid). Same query params as above; defaults to `status=PENDING`.

### DELETE `/api/applications/:id/withdraw`

Withdraw an application. Auth: `TENANT` (owner of the application, only `PENDING` applications can be withdrawn).

Path: `id` (uuid).

### GET `/api/applications/:id`

Get application by id. Auth: `OWNER`, `ADMIN`, `SUPERADMIN`.

Path: `id` (uuid).
### PATCH `/api/applications/:id/approve`

Approve an application. Auth: `OWNER` (of the property).

Path: `id` (uuid).

**Side effects (all in one transaction):**
1. Application → `APPROVED`.
2. All other `PENDING` applications for the same flat → `REJECTED` (no double-booking).
3. **Auto-creates a lease** — approval is the flat-taken momentcard. Side-effect `autoCreateLease` runs inside the same service and calls the lease module's `createLease`, which:
   - creates the `Lease` (amount from the flat's **variant `rentAmount`**, start = first of current month, end = +12 months),
   - sets the flat → `OCCUPIED`,
   - seeds the grouped payments: an `ADVANCE` row + one `MONTHLY_RENT` row per calendar month,
   - emails the tenant with their lease details.

**Important — failure behavior:** the auto-lease step is **not** best-effort — errors are rethrown. If lease creation fails (most commonly: the flat's variant has **no `rentAmount`** or the flat is not `AVAILABLE`), approval **fails** (no 200, no lease row, application stays as-is until the error propagates). Ensure the flat's variant sets `rentAmount` before approving. Leases are only created through this approval side-effect — there is no manual lease-creation endpoint.
### PATCH `/api/applications/:id/reject`

Reject an application. Auth: `OWNER`.

Path: `id` (uuid).

**Body (JSON):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `rejectionReason` | string | yes | 1–500 chars |

**Example request:**

```json
{ "rejectionReason": "Monthly income below requirement." }
```

---

## Leases — `/api/leases`

Leases are **created automatically** when an application is approved (see `PATCH /api/applications/:id/approve`); expired leases are **completed automatically** by the lease cron. There is no manual create or complete endpoint.

### GET `/api/leases/me`

List own leases. Auth: `TENANT`.

**Query params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `page` | number | no | default 1 |
| `limit` | number | no | 1–100, default 10 |
| `status` | `LeaseStatus` | no | `PENDING`, `ACTIVE`, `INACTIVE`, `COMPLETED`, `TERMINATED`, `CANCELLED` |
| `propertyId` | uuid | no | |

### GET `/api/leases/owner`

List own (property) leases. Auth: `OWNER`. Same query params as above.

### GET `/api/leases/:id`

Get lease by id. Auth: any role (scoped to the tenant of the lease / property owner / admin).

Path: `id` (uuid).

**Example response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Lease fetched successfully",
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "ownerId": "uuid",
    "flatId": "uuid",
    "amount": "15000.00",
    "startDate": "2026-10-01T00:00:00.000Z",
    "endDate": "2027-09-30T23:59:59.999Z",
    "status": "ACTIVE",
    "flat": { "id": "uuid", "flatNumber": "GR-101", "status": "OCCUPIED" }
  }
}
```

### PATCH `/api/leases/:id/terminate`

Terminate a lease. Auth: `OWNER`, `ADMIN`, `SUPERADMIN`.

Path: `id` (uuid).

**Body (JSON):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `rejectionReason` | string | no | 1–500 chars |

**Side effects:** flat set `AVAILABLE`; pending payments for the lease set `FAILED`.

---

## Payments — `/api/payments`

Payment rows are created automatically when a lease is created/seeded — an `ADVANCE` payment and one `MONTHLY_RENT` payment per calendar month (see the lease cron). These endpoints let a tenant pay a `PENDING` row through the bKash tokenized checkout gatewaycars, and let owners/admins list payments. Payment rows are uniquely identified by `(leaseId, type, periodStart)`.

### POST `/api/payments/:id/checkout`

Initiate a bKash Checkout for one of the tenant's pending payments. Auth: `TENANT`.

Path: `id` (uuid, the Payment row id).

**How it works:** generates a merchant invoice from the payment (`tenantId:6-type-amount-id:8`), calls bKash `createPayment`, and persists the returned `paymentID` on the Payment row (`bkashPaymentId`) so the callback and verify step can reconcile the exact same row. Returns the hosted bKash checkout URL.

**Example request:**

```
POST /api/payments/{id}/checkout
Cookie: accessToken=...
```

**Example response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payment initiated successfully",
  "data": {
    "paymentId": "uuid",
    "bkashPaymentId": "bkash-payment-id",
    "bkashURL": "https://tokenized.sandbox.bka.sh/...",
    "invoice": "a1b2c3-MONTHLY_RENT-15000.00-4f8e7d2c"
  }
}
```

### GET `/api/payments/callback`

bKash callback (inbound redirect from the bKash gateway after the payer completes/cancels). No auth. **This must be a publicly reachable URL.**

Query params:

| Param | Type | Required | Notes |
|---|---|---|---|
| `paymentID` | string | yes | the bKash payment id from checkout |
| `status` | string | yes | `success` (or `Completed`) |

**How it works:** loads the Payment row by `bkashPaymentId`, then executes the payment via bKash `executePayment`. If the transaction is `Completed` with a `trxID` **and** the executed amount matches the row's amount, marks the Payment row `COMPLETED` (persisting `bkashTransactionId`, `paidAt`, `paymentMethod = "bkash"`). Non-success statuses mark the row `FAILED`. Already-completed rows are skipped (idempotent for bKash retries).

**Response:** the gateway redirects the tenant's browser to the frontend:

```
FRONTEND_URL/dashboard/payments?status=success&paymentId=<uuid>&trxID=<bkash-trx-id>
FRONTEND_URL/dashboard/payments?status=failure
```

On success it includes `paymentId` and `trxID`; non-success redirects with `status=failure` (or the bKash status, e.g. `cancel`).

### POST `/api/payments/verify`

Verify a payment after the bKash redirect, server-side. Auth: `TENANT`, `OWNER`.

**Body (JSON) (`verifyPaymentSchema`):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `paymentID` | string | yes | the bKash payment id |
| `status` | string | yes | fallback status from the gateway |

**How it works:** queries bKash `queryPayment`; if `transactionStatus === "Completed"` with a `trxID`, completes the row; otherwise marks it `FAILED`.

### GET `/api/payments/me`

List the authenticated tenant's payments. Auth: `TENANT`.

**Query params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `page` | number | no | default 1 |
| `limit` | number | no | default 10 |
| `type` | `PaymentType` | no | `ADVANCE`, `MONTHLY_RENT` |
| `status` | `PaymentStatus` | no | `PENDING`, `COMPLETED`, `FAILED` |

**Example response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payments fetched successfully",
  "data": {
    "data": [
      {
        "id": "uuid",
        "leaseId": "uuid",
        "amount": "15000.00",
        "type": "MONTHLY_RENT",
        "status": "PENDING",
        "periodStart": "2026-10-01T00:00:00.000Z"
      }
    ],
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
  }
}
```

### GET `/api/payments/owner`

List payments across the owner's leases. Auth: `OWNER`, `ADMIN`, `SUPERADMIN`.

Same query params as `/me`, plus optional `leaseId` (uuid). Returns `ownerId`, `leaseId`, `tenantId` joins.

---

## Variants — `/api/variants`

### POST `/api/variants/:propertyId`

Create a flat variant and generate its flats. Auth: `OWNER`. `multipart/form-data`. Max 5 variants per property.

Path: `propertyId` (uuid).

| Part | Type | Required | Notes |
|---|---|---|---|
| `data` | string (JSON) | yes | see fields below |
| `images` | files | no | max 5 files |

`data` JSON fields (`createVariantSchema`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | 2–100 chars |
| `bedrooms` | integer | yes | 0–20 |
| `bathrooms` | integer | yes | 0–20 |
| `sizeSqft` | integer | no | 50–20000 |
| `rentAmount` | number | yes | > 0, max 10,000,000 |
| `advanceAmount` | number | yes | ≥ 0, max 10,000,000 |
| `totalUnits` | integer | yes | 1–100 |
| `flatNumberPrefix` | string | no | max 10 alphanumeric chars |

**Example request (multipart):**

```
POST /api/variants/{propertyId}
Content-Type: multipart/form-data

data: {"name":"3 Bedroom","bedrooms":3,"bathrooms":2,"sizeSqft":1200,"rentAmount":15000,"advanceAmount":45000,"totalUnits":2,"flatNumberPrefix":"GR"}
images: [file1]
```

Creates `totalUnits` flats auto-numbered `{PREFIX}-101`, `-102`, ... and increments `property.totalFlats`.

**Example response (201):**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Variant created successfully",
  "data": {
    "id": "uuid",
    "name": "3 Bedroom",
    "bedrooms": 3,
    "bathrooms": 2,
    "sizeSqft": 1200,
    "rentAmount": "15000.00",
    "advanceAmount": "45000.00",
    "totalUnits": 2,
    "propertyId": "uuid",
    "flats": [
      { "id": "uuid", "flatNumber": "GR-101", "status": "AVAILABLE" },
      { "id": "uuid", "flatNumber": "GR-102", "status": "AVAILABLE" }
    ]
  }
}
```

### GET `/api/variants`

List all variants (public). Returns variants with their property and `_count.flats`.

### GET `/api/variants/:propertyId`

List variants for a property (public).

Path: `propertyId` (uuid).

### PATCH `/api/variants/:id`

Update a variant. Auth: `OWNER`. At least one field required.

Path: `id` (uuid).

**Body (JSON) (`updateVariantSchema`):** any subset of create fields (`name`, `bedrooms`, `bathrooms`, `sizeSqft`, `rentAmount`, `advanceAmount`) with the same bounds.

**Example request:**

```json
{ "rentAmount": 16000, "advanceAmount": 48000 }
```

### DELETE `/api/variants/:id`

Delete a variant. Auth: `OWNER`. Only allowed if there are no leases / active applications.

Path: `id` (uuid).

---

## Flats — `/api/flats`

### POST `/api/flats/variants/:id`

Add more flats to an existing variant. Auth: `OWNER`.

Path: `id` (uuid, variant id).

**Body (JSON) (`addFlatsSchema`):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `count` | integer | yes | 1–100 |
| `flatNumberPrefix` | string | no | max 10 alphanumeric; defaults from variant name |

**Example request:**

```json
{ "count": 3, "flatNumberPrefix": "GR" }
```

Increments `variant.totalUnits` and `property.totalFlats`.

### GET `/api/flats`

List all flats (public).

**Query params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `page` | number | no | default 1 |
| `limit` | number | no | 1–100, default 10 |
| `status` | `FlatStatus` | no | `AVAILABLE`, `OCCUPIED`, `MAINTENANCE`, `UNAVAILABLE` (default `AVAILABLE`) |
| `city` | string | no | |
| `district` | string | no | |
| `minBedrooms` | integer | no | ≥ 0; filters by variant bedrooms |
| `maxRent` | number | no | > 0; filters by variant rentAmount |

**Example request:**

```
GET /api/flats?city=Dhaka&maxRent=20000&minBedrooms=2&limit=10
```

**Example response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Flats fetched successfully",
  "data": {
    "data": [
      {
        "id": "uuid",
        "flatNumber": "GR-101",
        "status": "AVAILABLE",
        "variant": { "id": "uuid", "name": "3 Bedroom", "bedrooms": 3, "rentAmount": "15000.00" },
        "property": { "id": "uuid", "title": "Skyline Residence", "city": "Dhaka" }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### GET `/api/flats/properties/:propertyId/`

List flats of a property (public). Optional query: `variantId` (uuid).

Path: `propertyId` (uuid).

### PATCH `/api/flats/:id`

Update a flat. Auth: `OWNER`. At least one field required.

Path: `id` (uuid).

**Body (JSON) (`updateFlatSchema`):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `flatNumber` | string | no | alphanumeric + hyphens, max 20 |
| `status` | `FlatStatus` | no | `AVAILABLE`, `MAINTENANCE`, `UNAVAILABLE` (cannot edit `OCCUPIED`; must go through `AVAILABLE` first) |
| `rentOverride` | number / `null` | no | > 0, max 10,000,000, or `null` |
| `advanceOverride` | number / `null` | no | ≥ 0, max 10,000,000, or `null` |

**Example request:**

```json
{ "status": "MAINTENANCE", "rentOverride": 15500 }
```

### DELETE `/api/flats/:id`

Delete a flat. Auth: `OWNER`. Only allowed for `AVAILABLE` flats with no lease history and no pending/approved applications.

Path: `id` (uuid).

---

## Additional Notes

- **File uploads:** multer memory storage → Cloudinary. Allowed types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. Max size 5MB per file.
- **Emails:** sent via Gmail SMTP (Nodemailer) for registration OTP, welcome, forgot/reset password, application approved/rejected, lease created/terminated, owner welcome.
- **Cron job:** runs every minute — activates pending leases, auto-completes expired leases, and generates missing monthly payment rows for active leases.
- **Lease creation** seeds an `ADVANCE` payment and one `MONTHLY_RENT` payment per calendar month.