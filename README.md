# Housely Backend

Housely is a property rental and tenancy management backend built with Node.js, Express, TypeScript, Prisma, and PostgreSQL. It powers the core workflows for property owners, tenants, admins, lease management, payments, analytics, and user authentication.

## Overview

This backend supports a rental marketplace where:

- users can register, sign in, and authenticate with email or Google
- owners can create and manage property listings, variants, and flats
- tenants can browse available properties and submit applications
- owner approval workflows manage applications and leases
- payments are processed through BKash with verification callbacks
- admin users moderate accounts, verify owners, and review platform analytics
- scheduled jobs handle lease status updates and recurring payment logic

## Tech Stack

- Node.js
- TypeScript
- Express.js
- Prisma ORM
- PostgreSQL
- Redis
- JWT authentication
- Cloudinary for image uploads
- Nodemailer for email delivery
- Google OAuth
- BKash integration
- Cron jobs for recurring tasks

## Project Structure

```bash
.
├── prisma/
│   ├── migrations/
│   └── schema/
├── src/
│   ├── app/
│   │   ├── config/
│   │   ├── Interfaces/
│   │   ├── jobs/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── modules/
│   │   └── utils/
│   ├── app.ts
│   └── server.ts
├── API.md
├── housely.postman_collection.json
├── .env.example
├── biome.json
├── package.json
├── prisma.config.ts
├── tsconfig.json
├── tsup.config.js
├── vercel.json
└── README.md
```

## Core Features

### Authentication & Authorization
- user registration and email verification
- login/logout flows using JWT cookies
- Google login integration
- refresh token support
- role-based access control for `TENANT`, `OWNER`, `ADMIN`, and `SUPERADMIN`

### Property Management
- property creation and listing
- vacancy and availability tracking
- flat and variant management
- property image uploads via Cloudinary

### Application & Leasing
- tenant application creation and status tracking
- owner approval/rejection workflows
- lease creation and lifecycle management
- lease termination handling
- scheduled lease status updates

### Payments
- BKash checkout flow
- payment verification callbacks
- user and owner payment history
- monthly rent and advance payment logic

### Admin & Analytics
- user moderation and blocking
- owner approval queue
- analytics dashboard for admin, owner, and tenant roles
- platform reporting data and summaries

### Background Jobs
- recurring lease processing
- payment cron automation
- scheduled maintenance tasks

## Prerequisites

Before starting the project, make sure you have:

- Node.js 18+ installed
- PostgreSQL database running
- Redis installed and running
- Cloudinary account for media uploads
- Google OAuth credentials
- BKash merchant credentials
- SMTP email account for notifications

## Environment Setup

Create a `.env` file in the project root using the values from `.env.example` and add your real credentials.

Example:

```env
NODE_ENV=development
PORT=5000
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

DATABASE_URL="postgresql://username:password@localhost:5432/housely?schema=public"

BCRYPT_SALT_ROUNDS=10

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

REDIS_USER=default
REDIS_PASSWORD=your_redis_password
REDIS_HOST=localhost
REDIS_PORT=6379

SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_email_password
EMAIL_SENDER=your_email@example.com

GOOGLE_CLIENT_ID=your_google_client_id

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

BKASH_BASE_URL=https://sandbox.bkash.com
BKASH_USERNAME=your_bkash_username
BKASH_PASSWORD=your_bkash_password
BKASH_APP_KEY=your_app_key
BKASH_APP_SECRET=your_app_secret
BKASH_CALLBACK_URL=http://localhost:5000/api/payments/callback
```

## Installation

```bash
npm install
```

## Database Setup

Generate Prisma client and run migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

If the database is already set up and you simply need the client generated:

```bash
npx prisma generate
```

## Running the Project

Development mode:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

The server listens on the port defined in `PORT` (default: `5000`).

## Available Scripts

```bash
npm run dev     # start the backend in watch mode
npm run build   # generate Prisma client and build the app
npm start       # start the production server
```

## API Documentation

- API reference: [API.md](API.md)
- Postman collection: [housely.postman_collection.json](housely.postman_collection.json)

The app exposes routes under `/api` for authentication, users, properties, applications, leases, payments, analytics, admins, tenants, owners, and variants.

## Main Routes

```text
/api/auth
/api/users
/api/analytics
/api/admin
/api/owner
/api/tenants
/api/properties
/api/applications
/api/leases
/api/payments
/api/variants
/api/flats
```

## Notes

- The application uses Prisma schema files under `prisma/schema`.
- File uploads are handled with Multer and Cloudinary.
- Redis is used for app-level caching/session support and background system dependencies.
- Background jobs are started from the server entry file to manage lease lifecycle and payment automation.

## License

This project is licensed under the ISC license.

## Author

Mishkat Mahabub
