import { parseAmountToCents, formatCents } from "../utils/amount";
import { HttpError } from "../utils/http-error";
import { buildStatementSql } from "../lib/statement-sql";
import type {
  Account,
  AccountRepository,
  AccountResponse,
  CreateAccountInput,
  StatementResponse,
  TransactionRepository,
  TransactionType,
  TransferResponse
} from "../types/domain";

interface WalletServiceDeps {
  accounts: AccountRepository;
  transactions: TransactionRepository;
}

interface AmountActionInput {
  accountId: string;
  amount: number | string;
}

interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number | string;
}

interface StatementInput {
  type?: TransactionType;
  limit?: number;
}

function isMongoDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { code?: unknown };
  return maybeError.code === 11000;
}

export class WalletService {
  private accounts: AccountRepository;
  private transactions: TransactionRepository;

  constructor({ accounts, transactions }: WalletServiceDeps) {
    this.accounts = accounts;
    this.transactions = transactions;
  }

  async createAccount({ firstName, lastName, email }: CreateAccountInput): Promise<AccountResponse> {
    const existing = await this.accounts.findByEmail(email);
    if (existing) {
      throw new HttpError(409, "An account with this email already exists", "DUPLICATE_EMAIL");
    }

    try {
      const account = await this.accounts.create({ firstName, lastName, email });
      return this.#toAccountResponse(account);
    } catch (error: unknown) {
      if (isMongoDuplicateKeyError(error)) {
        throw new HttpError(409, "An account with this email already exists", "DUPLICATE_EMAIL");
      }

      throw error;
    }
  }

  async getAccountByEmail(email: string): Promise<AccountResponse> {
    const account = await this.accounts.findByEmail(email);
    if (!account) {
      throw new HttpError(404, "Account not found", "ACCOUNT_NOT_FOUND");
    }
    return this.#toAccountResponse(account);
  }

  async getAccount(accountId: string): Promise<AccountResponse> {
    const account = await this.accounts.findById(accountId);
    if (!account) {
      throw new HttpError(404, "Account not found", "ACCOUNT_NOT_FOUND");
    }
    return this.#toAccountResponse(account);
  }

  async fundAccount({ accountId, amount }: AmountActionInput): Promise<AccountResponse> {
    const amountCents = parseAmountToCents(amount);
    const account = await this.accounts.incrementBalance(accountId, amountCents);
    if (!account) {
      throw new HttpError(404, "Account not found", "ACCOUNT_NOT_FOUND");
    }

    await this.transactions.create({
      type: "FUND",
      amountCents,
      actorAccountId: accountId,
      toAccountId: accountId
    });

    return this.#toAccountResponse(account);
  }

  async withdrawFromAccount({ accountId, amount }: AmountActionInput): Promise<AccountResponse> {
    const amountCents = parseAmountToCents(amount);
    const account = await this.accounts.decrementBalance(accountId, amountCents);
    if (!account) {
      throw new HttpError(
        400,
        "Insufficient balance or account does not exist",
        "INSUFFICIENT_BALANCE"
      );
    }

    await this.transactions.create({
      type: "WITHDRAW",
      amountCents,
      actorAccountId: accountId,
      fromAccountId: accountId
    });

    return this.#toAccountResponse(account);
  }

  async transfer({ fromAccountId, toAccountId, amount }: TransferInput): Promise<TransferResponse> {
    if (fromAccountId === toAccountId) {
      throw new HttpError(400, "Cannot transfer to the same account", "INVALID_TRANSFER");
    }

    const amountCents = parseAmountToCents(amount);
    const toAccount = await this.accounts.findById(toAccountId);
    if (!toAccount) {
      throw new HttpError(404, "Recipient account not found", "RECIPIENT_NOT_FOUND");
    }

    const transferResult = await this.accounts.transferBalance(fromAccountId, toAccountId, amountCents);
    if (!transferResult) {
      throw new HttpError(400, "Insufficient balance", "INSUFFICIENT_BALANCE");
    }

    await this.transactions.create({
      type: "TRANSFER",
      amountCents,
      actorAccountId: fromAccountId,
      fromAccountId,
      toAccountId
    });

    return {
      from: this.#toAccountResponse(transferResult.sender),
      to: this.#toAccountResponse(transferResult.recipient),
      amount: formatCents(amountCents)
    };
  }

  async getStatement(accountId: string, { type, limit }: StatementInput = {}): Promise<StatementResponse> {
    const account = await this.accounts.findById(accountId);
    if (!account) {
      throw new HttpError(404, "Account not found", "ACCOUNT_NOT_FOUND");
    }

    const transactions = await this.transactions.listByAccountId(accountId, { limit });
    const filtered = type ? transactions.filter((item) => item.type === type) : transactions;
    // Keep query composition explicit for future report-store portability.
    void buildStatementSql({ accountId, type, limit });

    return {
      account: this.#toAccountResponse(account),
      transactions: filtered.map((item) => ({
        id: item.id,
        type: item.type,
        amount: formatCents(item.amountCents),
        actorAccountId: item.actorAccountId,
        fromAccountId: item.fromAccountId,
        toAccountId: item.toAccountId,
        createdAt: item.createdAt
      }))
    };
  }

  #toAccountResponse(account: Account): AccountResponse {
    return {
      id: account.id,
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      balance: formatCents(account.balanceCents),
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    };
  }
}
