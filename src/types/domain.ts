export type TransactionType = "FUND" | "WITHDRAW" | "TRANSFER";

export interface Account {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  balanceCents: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionRecord {
  id: string;
  type: TransactionType;
  amountCents: number;
  actorAccountId: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  createdAt: Date;
}

export interface TransferBalanceResult {
  sender: Account;
  recipient: Account;
}

export interface CreateAccountInput {
  firstName: string;
  lastName: string;
  email: string;
}

export interface AccountRepository {
  create(input: CreateAccountInput): Promise<Account>;
  findByEmail(email: string): Promise<Account | null>;
  findById(id: string): Promise<Account | null>;
  incrementBalance(id: string, amountCents: number): Promise<Account | null>;
  decrementBalance(id: string, amountCents: number): Promise<Account | null>;
  transferBalance(fromId: string, toId: string, amountCents: number): Promise<TransferBalanceResult | null>;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amountCents: number;
  actorAccountId: string;
  fromAccountId?: string | null;
  toAccountId?: string | null;
}

export interface TransactionRepository {
  create(input: CreateTransactionInput): Promise<TransactionRecord>;
  listByAccountId(accountId: string, options?: { limit?: number }): Promise<TransactionRecord[]>;
}

export interface AccountResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatementTransactionResponse {
  id: string;
  type: TransactionType;
  amount: number;
  actorAccountId: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  createdAt: Date;
}

export interface StatementResponse {
  account: AccountResponse;
  transactions: StatementTransactionResponse[];
  meta: {
    generatedWith: "knex";
    queryTemplate: string;
  };
}

export interface TransferResponse {
  from: AccountResponse;
  to: AccountResponse;
  amount: number;
}
