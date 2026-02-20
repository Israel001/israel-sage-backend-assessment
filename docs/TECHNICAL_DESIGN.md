# Wallet API Technical Design

## Overview
This service implements a basic wallet API with four core operations:
- Create an account
- Fund an account
- Transfer funds to another account
- Withdraw funds

Implementation language: TypeScript on Node.js.

The API uses a faux token-based authentication approach. A token is issued at account creation and reused to authorize wallet operations.

## Architecture
- **Transport layer:** Express HTTP handlers and route-level middleware.
- **Application layer:** `WalletService` contains all business rules and orchestration logic.
- **Data layer:** Repository abstraction with:
  - MongoDB adapters for runtime persistence
  - In-memory adapters for deterministic automated tests

## Data Model
### Account
- `id`
- `firstName`
- `lastName`
- `email` (unique)
- `balanceCents` (integer to avoid floating-point errors)
- timestamps

### Transaction
- `id`
- `type` (`FUND`, `WITHDRAW`, `TRANSFER`)
- `amountCents`
- `actorAccountId`
- `fromAccountId` (optional)
- `toAccountId` (optional)
- timestamp

## Auth Strategy
- A JWT is generated after account creation.
- Protected endpoints require `Authorization: Bearer <token>`.
- Middleware validates token and injects authenticated `accountId`.

## Money and Integrity Rules
- Amounts are accepted as strings or numbers and normalized to integer cents.
- All debit flows verify sufficient balance before updating.
- Transfer uses transactional debit/credit on MongoDB deployments that support transactions (with a safe fallback for standalone local Mongo setups).
- Duplicate account creation is guarded at both service layer and database unique index level.

## Security and Concurrency Notes
- Covered:
  - Input validation with Zod.
  - Auth gate via bearer token middleware.
  - Atomic debit checks (`balanceCents >= amount`) for withdrawals/transfers.
  - Mongo duplicate-key (`E11000`) mapped to deterministic API error (`409 DUPLICATE_EMAIL`).
  - Expanded integration tests for negative scenarios and concurrent withdrawal behavior.
- Out of scope for this assessment (recommended for production):
  - Refresh-token lifecycle and token revocation.
  - Rate limiting and abuse prevention.
  - Idempotency keys for retry-safe financial operations.
  - Full transfer + transaction-log atomicity in one DB transaction unit (current design keeps balance update and transaction record as separate writes).

## KnexJS Usage
MongoDB is used as the primary persistence store. Knex is used as a query DSL to generate a deterministic SQL statement template for account statement/reporting metadata. This keeps query composition explicit and portable for future analytics stores.

## Test Strategy
Integration-style API tests run with Supertest and in-memory repositories, covering:
- positive scenarios:
  - account creation + token issue
  - funding, withdrawal, transfer, statement retrieval
- negative scenarios:
  - auth failures (missing/invalid token)
  - validation failures (payload/query/amount)
  - duplicate email registration
  - invalid transfer targets and insufficient balance
  - concurrent withdrawal safety check (single success when debits exceed balance)
