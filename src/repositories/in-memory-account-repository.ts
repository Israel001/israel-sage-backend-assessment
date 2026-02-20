import { randomUUID } from "node:crypto";
import type {
  Account,
  AccountRepository,
  CreateAccountInput,
  TransferBalanceResult
} from "../types/domain";

export class InMemoryAccountRepository implements AccountRepository {
  private byId: Map<string, Account>;
  private byEmail: Map<string, string>;

  constructor() {
    this.byId = new Map();
    this.byEmail = new Map();
  }

  async create({ firstName, lastName, email }: CreateAccountInput): Promise<Account> {
    const normalizedEmail = email.toLowerCase();
    const now = new Date();
    const account: Account = {
      id: randomUUID(),
      firstName,
      lastName,
      email: normalizedEmail,
      balanceCents: 0,
      createdAt: now,
      updatedAt: now
    };

    this.byId.set(account.id, account);
    this.byEmail.set(normalizedEmail, account.id);
    return { ...account };
  }

  async findByEmail(email: string): Promise<Account | null> {
    const id = this.byEmail.get(email.toLowerCase());
    if (!id) {
      return null;
    }
    const account = this.byId.get(id);
    return account ? { ...account } : null;
  }

  async findById(id: string): Promise<Account | null> {
    const account = this.byId.get(id);
    return account ? { ...account } : null;
  }

  async incrementBalance(id: string, amountCents: number): Promise<Account | null> {
    const account = this.byId.get(id);
    if (!account) {
      return null;
    }

    account.balanceCents += amountCents;
    account.updatedAt = new Date();
    return { ...account };
  }

  async decrementBalance(id: string, amountCents: number): Promise<Account | null> {
    const account = this.byId.get(id);
    if (!account || account.balanceCents < amountCents) {
      return null;
    }

    account.balanceCents -= amountCents;
    account.updatedAt = new Date();
    return { ...account };
  }

  async transferBalance(
    fromId: string,
    toId: string,
    amountCents: number
  ): Promise<TransferBalanceResult | null> {
    const sender = this.byId.get(fromId);
    const recipient = this.byId.get(toId);
    if (!sender || !recipient || sender.balanceCents < amountCents) {
      return null;
    }

    sender.balanceCents -= amountCents;
    sender.updatedAt = new Date();
    recipient.balanceCents += amountCents;
    recipient.updatedAt = new Date();

    return {
      sender: { ...sender },
      recipient: { ...recipient }
    };
  }
}
