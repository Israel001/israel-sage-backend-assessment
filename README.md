# Wallet API - Backend Assessment

TypeScript Node.js wallet service with faux JWT auth.

## Overview
This API supports:
- account creation
- token issue/reissue for an existing account (email-based assessment login)
- account lookup for authenticated user
- funding
- withdrawals
- account-to-account transfer
- account statement retrieval

## Technical Design
### Architecture
- Transport layer: Express routes, middleware, controllers.
- Application layer: `WalletService` implements business rules.
- Data layer: repository abstraction with MongoDB adapters for runtime and in-memory adapters for tests.

### Data Model
#### Account
- `id`
- `firstName`
- `lastName`
- `email` (unique)
- `balanceCents` (integer storage to avoid floating-point errors)
- timestamps

#### Transaction
- `id`
- `type` (`FUND`, `WITHDRAW`, `TRANSFER`)
- `amountCents`
- `actorAccountId`
- `fromAccountId` (nullable)
- `toAccountId` (nullable)
- timestamp

### Auth Strategy
- JWT is issued at account creation.
- JWT can be reissued for existing account email via `POST /api/auth/token`.
- Protected routes require `Authorization: Bearer <token>`.
- Middleware validates token and attaches authenticated account id to the request.

### Money and Integrity Rules
- Inputs accept amount as number or numeric string and normalize to integer cents.
- Valid amount format: positive number with up to 2 decimal places.
- Withdraw/transfer debit paths enforce sufficient balance.
- Transfer uses transactional debit/credit on MongoDB deployments with transaction support, with safe fallback logic for local standalone setups.
- Duplicate email registration is guarded at service layer and by Mongo unique index.

### Validation and Error Handling
- Request payload/query validation uses Zod.
- Domain/application errors use a stable error format.

### Test Coverage
Integration tests (Supertest + in-memory repositories) cover:
- success flows for all endpoints
- auth failures
- validation failures
- duplicate email behavior
- transfer/withdraw insufficiency and invalid targets
- concurrent withdrawal safety

## Tech Stack
- Node.js + Express + TypeScript
- MongoDB (Mongoose)
- Knex (query DSL utility)
- Jest + Supertest

## Setup
1. Install dependencies:
```bash
npm install
```
2. Copy env file:
```bash
cp .env.example .env
```
3. Ensure MongoDB is running and `.env` contains valid `MONGODB_URI`.
4. Run API:
```bash
npm run dev
```

## Build and Test
```bash
npm run build
npm test
```

## Environment Variables
| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP server port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/wallet-assessment` | MongoDB connection string |
| `JWT_SECRET` | `dev-secret` | JWT signing secret |
| `JWT_EXPIRES_IN` | `1d` | Access token lifetime |
| `NODE_ENV` | `development` | Runtime mode |

## API Conventions
- Base URL (local): `http://localhost:3000`
- All request/response bodies are JSON.
- Auth header for protected endpoints:
```http
Authorization: Bearer <token>
```
- Error response format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": []
  }
}
```

## Endpoint Reference

### 1) Create Account
**Method:** `POST`
**Path:** `/api/accounts`
**Auth:** not required

**Sample request payload**
```json
{
  "firstName": "Ada",
  "lastName": "Lovelace",
  "email": "ada@example.com"
}
```

**How to call**
```bash
curl -sS -X POST "http://localhost:3000/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com"
  }'
```

**Responses**
- `201 Created`
```json
{
  "account": {
    "id": "65fd2b9b3d5e2b1f7ecad111",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com",
    "balance": 0,
    "createdAt": "2026-02-20T08:30:00.000Z",
    "updatedAt": "2026-02-20T08:30:00.000Z"
  },
  "token": "<jwt_token>"
}
```
- `400 Bad Request` (`VALIDATION_ERROR`)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "path": ["email"],
        "message": "Invalid email"
      }
    ]
  }
}
```
- `409 Conflict` (`DUPLICATE_EMAIL`)
```json
{
  "error": {
    "code": "DUPLICATE_EMAIL",
    "message": "An account with this email already exists"
  }
}
```
- `500 Internal Server Error` (`INTERNAL_ERROR`)
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

### 2) Issue/Reissue Token (Assessment Login)
**Method:** `POST`
**Path:** `/api/auth/token`
**Auth:** not required

**Sample request payload**
```json
{
  "email": "ada@example.com"
}
```

**How to call**
```bash
curl -sS -X POST "http://localhost:3000/api/auth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ada@example.com"
  }'
```

**Responses**
- `200 OK`
```json
{
  "account": {
    "id": "65fd2b9b3d5e2b1f7ecad111",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com",
    "balance": 0,
    "createdAt": "2026-02-20T08:30:00.000Z",
    "updatedAt": "2026-02-20T08:30:00.000Z"
  },
  "token": "<jwt_token>"
}
```
- `400 Bad Request` (`VALIDATION_ERROR`)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "path": ["email"],
        "message": "Invalid email"
      }
    ]
  }
}
```
- `404 Not Found` (`ACCOUNT_NOT_FOUND`)
```json
{
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account not found"
  }
}
```
- `500 Internal Server Error` (`INTERNAL_ERROR`)
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

### 3) Get Current Account
**Method:** `GET`
**Path:** `/api/accounts/me`
**Auth:** required

**How to call**
```bash
curl -sS "http://localhost:3000/api/accounts/me" \
  -H "Authorization: Bearer <token>"
```

**Responses**
- `200 OK`
```json
{
  "account": {
    "id": "65fd2b9b3d5e2b1f7ecad111",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com",
    "balance": 60.25,
    "createdAt": "2026-02-20T08:30:00.000Z",
    "updatedAt": "2026-02-20T08:40:00.000Z"
  }
}
```
- `401 Unauthorized` (`UNAUTHORIZED`) missing/invalid/expired token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing bearer token"
  }
}
```
or
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```
- `404 Not Found` (`ACCOUNT_NOT_FOUND`)
```json
{
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account not found"
  }
}
```
- `500 Internal Server Error` (`INTERNAL_ERROR`)
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

### 4) Fund Account
**Method:** `POST`
**Path:** `/api/accounts/fund`
**Auth:** required

**Sample request payload**
```json
{
  "amount": 100.5
}
```

**How to call**
```bash
curl -sS -X POST "http://localhost:3000/api/accounts/fund" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "amount": 100.5
  }'
```

**Responses**
- `200 OK`
```json
{
  "account": {
    "id": "65fd2b9b3d5e2b1f7ecad111",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com",
    "balance": 100.5,
    "createdAt": "2026-02-20T08:30:00.000Z",
    "updatedAt": "2026-02-20T08:35:00.000Z"
  }
}
```
- `400 Bad Request` (`VALIDATION_ERROR`) invalid request body shape/type
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "path": ["amount"],
        "message": "Invalid input"
      }
    ]
  }
}
```
- `400 Bad Request` (`INVALID_AMOUNT`) invalid amount format/value
```json
{
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "amount must be a positive number with up to 2 decimal places"
  }
}
```
or
```json
{
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "amount must be greater than 0"
  }
}
```
- `401 Unauthorized` (`UNAUTHORIZED`)
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing bearer token"
  }
}
```
- `404 Not Found` (`ACCOUNT_NOT_FOUND`)
```json
{
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account not found"
  }
}
```
- `500 Internal Server Error` (`INTERNAL_ERROR`)
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

### 5) Withdraw From Account
**Method:** `POST`
**Path:** `/api/accounts/withdraw`
**Auth:** required

**Sample request payload**
```json
{
  "amount": "40.25"
}
```

**How to call**
```bash
curl -sS -X POST "http://localhost:3000/api/accounts/withdraw" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "amount": "40.25"
  }'
```

**Responses**
- `200 OK`
```json
{
  "account": {
    "id": "65fd2b9b3d5e2b1f7ecad111",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com",
    "balance": 60.25,
    "createdAt": "2026-02-20T08:30:00.000Z",
    "updatedAt": "2026-02-20T08:45:00.000Z"
  }
}
```
- `400 Bad Request` (`VALIDATION_ERROR`) invalid request body shape/type
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "path": ["amount"],
        "message": "Invalid input"
      }
    ]
  }
}
```
- `400 Bad Request` (`INVALID_AMOUNT`) invalid amount format/value
```json
{
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "amount must be a positive number with up to 2 decimal places"
  }
}
```
or
```json
{
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "amount must be greater than 0"
  }
}
```
- `400 Bad Request` (`INSUFFICIENT_BALANCE`)
```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance or account does not exist"
  }
}
```
- `401 Unauthorized` (`UNAUTHORIZED`)
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing bearer token"
  }
}
```
- `500 Internal Server Error` (`INTERNAL_ERROR`)
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

### 6) Transfer Funds
**Method:** `POST`
**Path:** `/api/accounts/transfer`
**Auth:** required

**Sample request payload**
```json
{
  "toAccountId": "65fd2b9b3d5e2b1f7ecad222",
  "amount": 20
}
```

**How to call**
```bash
curl -sS -X POST "http://localhost:3000/api/accounts/transfer" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <sender_token>" \
  -d '{
    "toAccountId": "65fd2b9b3d5e2b1f7ecad222",
    "amount": 20
  }'
```

**Responses**
- `200 OK`
```json
{
  "from": {
    "id": "65fd2b9b3d5e2b1f7ecad111",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com",
    "balance": 80.5,
    "createdAt": "2026-02-20T08:30:00.000Z",
    "updatedAt": "2026-02-20T08:50:00.000Z"
  },
  "to": {
    "id": "65fd2b9b3d5e2b1f7ecad222",
    "firstName": "Grace",
    "lastName": "Hopper",
    "email": "grace@example.com",
    "balance": 20,
    "createdAt": "2026-02-20T08:31:00.000Z",
    "updatedAt": "2026-02-20T08:50:00.000Z"
  },
  "amount": 20
}
```
- `400 Bad Request` (`VALIDATION_ERROR`) invalid request body shape/type
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "path": ["toAccountId"],
        "message": "String must contain at least 1 character(s)"
      }
    ]
  }
}
```
- `400 Bad Request` (`INVALID_AMOUNT`) invalid amount format/value
```json
{
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "amount must be a positive number with up to 2 decimal places"
  }
}
```
or
```json
{
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "amount must be greater than 0"
  }
}
```
- `400 Bad Request` (`INVALID_TRANSFER`) sender and recipient are same account
```json
{
  "error": {
    "code": "INVALID_TRANSFER",
    "message": "Cannot transfer to the same account"
  }
}
```
- `400 Bad Request` (`INSUFFICIENT_BALANCE`)
```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance"
  }
}
```
- `401 Unauthorized` (`UNAUTHORIZED`)
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing bearer token"
  }
}
```
- `404 Not Found` (`RECIPIENT_NOT_FOUND`)
```json
{
  "error": {
    "code": "RECIPIENT_NOT_FOUND",
    "message": "Recipient account not found"
  }
}
```
- `500 Internal Server Error` (`INTERNAL_ERROR`)
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

### 7) Get Account Statement
**Method:** `GET`
**Path:** `/api/accounts/me/statement`
**Auth:** required

**Query parameters**
- `type` (optional): one of `FUND`, `WITHDRAW`, `TRANSFER`
- `limit` (optional): integer `1..100`

**How to call**
```bash
curl -sS "http://localhost:3000/api/accounts/me/statement?type=TRANSFER&limit=10" \
  -H "Authorization: Bearer <token>"
```

**Responses**
- `200 OK`
```json
{
  "account": {
    "id": "65fd2b9b3d5e2b1f7ecad111",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com",
    "balance": 80.5,
    "createdAt": "2026-02-20T08:30:00.000Z",
    "updatedAt": "2026-02-20T08:50:00.000Z"
  },
  "transactions": [
    {
      "id": "65fd2c413d5e2b1f7ecad999",
      "type": "TRANSFER",
      "amount": 20,
      "actorAccountId": "65fd2b9b3d5e2b1f7ecad111",
      "fromAccountId": "65fd2b9b3d5e2b1f7ecad111",
      "toAccountId": "65fd2b9b3d5e2b1f7ecad222",
      "createdAt": "2026-02-20T08:50:00.000Z"
    }
  ]
}
```
- `400 Bad Request` (`VALIDATION_ERROR`) invalid query params
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "path": ["type"],
        "message": "Invalid enum value"
      }
    ]
  }
}
```
- `401 Unauthorized` (`UNAUTHORIZED`)
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing bearer token"
  }
}
```
- `404 Not Found` (`ACCOUNT_NOT_FOUND`)
```json
{
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account not found"
  }
}
```
- `500 Internal Server Error` (`INTERNAL_ERROR`)
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## Additional Global Responses
- `404 Not Found` for unknown routes:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Route GET /api/unknown not found"
  }
}
```
