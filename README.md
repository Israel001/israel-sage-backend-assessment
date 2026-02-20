# Backend Developer Assessment - Wallet API

TypeScript Node.js API that supports:
- account creation
- account funding
- transfer between accounts
- withdrawals
- faux bearer token auth

## Tech Stack
- Node.js + Express + TypeScript
- MongoDB (via Mongoose)
- KnexJS (statement query template generation)
- Jest + Supertest

## Setup
1. Install dependencies:
```bash
npm install
```
2. Copy environment file:
```bash
cp .env.example .env
```
3. Ensure MongoDB is running and `MONGODB_URI` is valid.
4. Run the API in dev mode:
```bash
npm run dev
```

5. Build production output:
```bash
npm run build
```

## Run Tests
```bash
npm test
```

## API Endpoints
- `POST /api/accounts`
- `GET /api/accounts/me`
- `POST /api/accounts/fund`
- `POST /api/accounts/withdraw`
- `POST /api/accounts/transfer`
- `GET /api/accounts/me/statement`

Use `Authorization: Bearer <token>` for protected routes.

## Design Notes
See `/docs/TECHNICAL_DESIGN.md`.
