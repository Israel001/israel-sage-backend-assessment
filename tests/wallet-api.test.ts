import request from "supertest";
import { createApp } from "../src/app";
import { createInMemoryContainer } from "../src/container";
import type { Application } from "express";

interface CreateAccountPayload {
  firstName: string;
  lastName: string;
  email: string;
}

interface CreatedAccountResponse {
  account: {
    id: string;
    email: string;
    balance: number;
  };
  token: string;
}

function createTestServer() {
  const container = createInMemoryContainer();
  const app = createApp({ container });
  return { app };
}

async function createAccount(
  app: Application,
  payload: CreateAccountPayload
): Promise<CreatedAccountResponse> {
  const response = await request(app).post("/api/accounts").send(payload);
  return response.body as CreatedAccountResponse;
}

describe("Wallet API", () => {
  it("creates an account and returns a faux auth token", async () => {
    const { app } = createTestServer();

    const createResponse = await request(app).post("/api/accounts").send({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com"
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.body.token).toBeDefined();
    expect(createResponse.body.account.balance).toBe(0);

    const meResponse = await request(app)
      .get("/api/accounts/me")
      .set("Authorization", `Bearer ${createResponse.body.token}`);

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.body.account.email).toBe("ada@example.com");
  });

  it("issues a fresh token for an existing account by email", async () => {
    const { app } = createTestServer();

    const created = await createAccount(app, {
      firstName: "Token",
      lastName: "Refresh",
      email: "token-refresh@example.com"
    });

    const tokenResponse = await request(app).post("/api/auth/token").send({
      email: "token-refresh@example.com"
    });

    expect(tokenResponse.statusCode).toBe(200);
    expect(tokenResponse.body.token).toBeDefined();
    expect(tokenResponse.body.account.id).toBe(created.account.id);

    const meResponse = await request(app)
      .get("/api/accounts/me")
      .set("Authorization", `Bearer ${tokenResponse.body.token}`);

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.body.account.email).toBe("token-refresh@example.com");
  });

  it("returns not found when issuing a token for an unknown account", async () => {
    const { app } = createTestServer();

    const tokenResponse = await request(app).post("/api/auth/token").send({
      email: "missing@example.com"
    });

    expect(tokenResponse.statusCode).toBe(404);
    expect(tokenResponse.body.error.code).toBe("ACCOUNT_NOT_FOUND");
  });

  it("funds and withdraws from the authenticated account", async () => {
    const { app } = createTestServer();
    const { token } = await createAccount(app, {
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com"
    });

    const fundResponse = await request(app)
      .post("/api/accounts/fund")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 100.5 });

    expect(fundResponse.statusCode).toBe(200);
    expect(fundResponse.body.account.balance).toBe(100.5);

    const withdrawResponse = await request(app)
      .post("/api/accounts/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: "40.25" });

    expect(withdrawResponse.statusCode).toBe(200);
    expect(withdrawResponse.body.account.balance).toBe(60.25);

    const tooLargeWithdrawResponse = await request(app)
      .post("/api/accounts/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 1000 });

    expect(tooLargeWithdrawResponse.statusCode).toBe(400);
    expect(tooLargeWithdrawResponse.body.error.code).toBe("INSUFFICIENT_BALANCE");
  });

  it("transfers funds between two users", async () => {
    const { app } = createTestServer();

    const sender = await createAccount(app, {
      firstName: "Sender",
      lastName: "One",
      email: "sender@example.com"
    });

    const recipient = await createAccount(app, {
      firstName: "Recipient",
      lastName: "Two",
      email: "recipient@example.com"
    });

    await request(app)
      .post("/api/accounts/fund")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ amount: 50 });

    const transferResponse = await request(app)
      .post("/api/accounts/transfer")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({
        toAccountId: recipient.account.id,
        amount: 20
      });

    expect(transferResponse.statusCode).toBe(200);
    expect(transferResponse.body.amount).toBe(20);
    expect(transferResponse.body.from.balance).toBe(30);
    expect(transferResponse.body.to.balance).toBe(20);
  });

  it("requires authentication for protected routes", async () => {
    const { app } = createTestServer();

    const response = await request(app).post("/api/accounts/fund").send({ amount: 10 });
    expect(response.statusCode).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects duplicate account registration", async () => {
    const { app } = createTestServer();

    const payload = {
      firstName: "Duplicate",
      lastName: "User",
      email: "dupe@example.com"
    };

    const first = await request(app).post("/api/accounts").send(payload);
    const duplicate = await request(app).post("/api/accounts").send(payload);

    expect(first.statusCode).toBe(201);
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.body.error.code).toBe("DUPLICATE_EMAIL");
  });

  it("rejects malformed account payloads", async () => {
    const { app } = createTestServer();

    const response = await request(app).post("/api/accounts").send({
      firstName: "",
      lastName: "User",
      email: "not-an-email"
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects invalid tokens on protected routes", async () => {
    const { app } = createTestServer();

    const response = await request(app)
      .get("/api/accounts/me")
      .set("Authorization", "Bearer invalid.token.value");

    expect(response.statusCode).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects invalid money amounts", async () => {
    const { app } = createTestServer();
    const { token } = await createAccount(app, {
      firstName: "Amount",
      lastName: "Validator",
      email: "amount-validator@example.com"
    });

    const invalidFund = await request(app)
      .post("/api/accounts/fund")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: "12.999" });

    expect(invalidFund.statusCode).toBe(400);
    expect(invalidFund.body.error.code).toBe("INVALID_AMOUNT");
  });

  it("rejects transfer to the same account", async () => {
    const { app } = createTestServer();
    const sender = await createAccount(app, {
      firstName: "Self",
      lastName: "Transfer",
      email: "self-transfer@example.com"
    });

    await request(app)
      .post("/api/accounts/fund")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ amount: 30 });

    const response = await request(app)
      .post("/api/accounts/transfer")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({
        toAccountId: sender.account.id,
        amount: 5
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.error.code).toBe("INVALID_TRANSFER");
  });

  it("rejects transfer to a missing recipient", async () => {
    const { app } = createTestServer();
    const sender = await createAccount(app, {
      firstName: "Missing",
      lastName: "Recipient",
      email: "missing-recipient@example.com"
    });

    await request(app)
      .post("/api/accounts/fund")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ amount: 30 });

    const response = await request(app)
      .post("/api/accounts/transfer")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({
        toAccountId: "non-existent-account-id",
        amount: 5
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.error.code).toBe("RECIPIENT_NOT_FOUND");
  });

  it("rejects transfer when balance is insufficient", async () => {
    const { app } = createTestServer();
    const sender = await createAccount(app, {
      firstName: "Low",
      lastName: "Balance",
      email: "low-balance@example.com"
    });

    const recipient = await createAccount(app, {
      firstName: "Receiver",
      lastName: "User",
      email: "receiver-user@example.com"
    });

    const response = await request(app)
      .post("/api/accounts/transfer")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({
        toAccountId: recipient.account.id,
        amount: 10
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.error.code).toBe("INSUFFICIENT_BALANCE");
  });

  it("returns a statement with transaction entries", async () => {
    const { app } = createTestServer();

    const sender = await createAccount(app, {
      firstName: "Statement",
      lastName: "User",
      email: "statement@example.com"
    });

    const recipient = await createAccount(app, {
      firstName: "Other",
      lastName: "User",
      email: "other@example.com"
    });

    await request(app)
      .post("/api/accounts/fund")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ amount: 25 });

    await request(app)
      .post("/api/accounts/transfer")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ toAccountId: recipient.account.id, amount: 5 });

    const statementResponse = await request(app)
      .get("/api/accounts/me/statement?limit=10")
      .set("Authorization", `Bearer ${sender.token}`);

    expect(statementResponse.statusCode).toBe(200);
    expect(statementResponse.body.transactions.length).toBeGreaterThanOrEqual(2);
    expect(statementResponse.body.meta).toBeUndefined();
  });

  it("validates statement query parameters", async () => {
    const { app } = createTestServer();
    const sender = await createAccount(app, {
      firstName: "Statement",
      lastName: "Validator",
      email: "statement-validator@example.com"
    });

    const response = await request(app)
      .get("/api/accounts/me/statement?type=INVALID_TYPE")
      .set("Authorization", `Bearer ${sender.token}`);

    expect(response.statusCode).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("prevents double-spend under concurrent withdrawals", async () => {
    const { app } = createTestServer();
    const { token } = await createAccount(app, {
      firstName: "Concurrent",
      lastName: "Tester",
      email: "concurrent@example.com"
    });

    await request(app)
      .post("/api/accounts/fund")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 100 });

    const [withdrawA, withdrawB] = await Promise.all([
      request(app)
        .post("/api/accounts/withdraw")
        .set("Authorization", `Bearer ${token}`)
        .send({ amount: 80 }),
      request(app)
        .post("/api/accounts/withdraw")
        .set("Authorization", `Bearer ${token}`)
        .send({ amount: 80 })
    ]);

    const successCount = [withdrawA, withdrawB].filter((response) => response.statusCode === 200).length;
    const failureCount = [withdrawA, withdrawB].filter((response) => response.statusCode === 400).length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);

    const me = await request(app).get("/api/accounts/me").set("Authorization", `Bearer ${token}`);
    expect(me.statusCode).toBe(200);
    expect(me.body.account.balance).toBe(20);
  });
});
