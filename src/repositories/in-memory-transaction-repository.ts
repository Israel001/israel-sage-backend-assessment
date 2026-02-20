import { randomUUID } from "node:crypto";
import type {
  CreateTransactionInput,
  TransactionRecord,
  TransactionRepository
} from "../types/domain";

export class InMemoryTransactionRepository implements TransactionRepository {
  private items: TransactionRecord[];

  constructor() {
    this.items = [];
  }

  async create({
    type,
    amountCents,
    actorAccountId,
    fromAccountId = null,
    toAccountId = null
  }: CreateTransactionInput): Promise<TransactionRecord> {
    const entry: TransactionRecord = {
      id: randomUUID(),
      type,
      amountCents,
      actorAccountId,
      fromAccountId,
      toAccountId,
      createdAt: new Date()
    };

    this.items.push(entry);
    return { ...entry };
  }

  async listByAccountId(
    accountId: string,
    { limit = 20 }: { limit?: number } = {}
  ): Promise<TransactionRecord[]> {
    const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;
    return this.items
      .filter((item) => {
        return (
          item.actorAccountId === accountId ||
          item.fromAccountId === accountId ||
          item.toAccountId === accountId
        );
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, Math.max(1, Math.min(parsedLimit, 100)))
      .map((item) => ({ ...item }));
  }
}
