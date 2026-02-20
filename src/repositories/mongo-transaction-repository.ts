import { Types } from "mongoose";
import { TransactionModel } from "../models/transaction-model";
import { mapTransactionDocument } from "./mappers";
import type {
  CreateTransactionInput,
  TransactionRecord,
  TransactionRepository
} from "../types/domain";

export class MongoTransactionRepository implements TransactionRepository {
  async create({
    type,
    amountCents,
    actorAccountId,
    fromAccountId = null,
    toAccountId = null
  }: CreateTransactionInput): Promise<TransactionRecord> {
    const transaction = await TransactionModel.create({
      type,
      amountCents,
      actorAccountId,
      fromAccountId,
      toAccountId
    });

    return mapTransactionDocument(transaction);
  }

  async listByAccountId(accountId: string, { limit = 20 }: { limit?: number } = {}) {
    if (!Types.ObjectId.isValid(accountId)) {
      return [];
    }

    const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;

    const transactions = await TransactionModel.find({
      $or: [{ actorAccountId: accountId }, { fromAccountId: accountId }, { toAccountId: accountId }]
    })
      .sort({ createdAt: -1 })
      .limit(Math.max(1, Math.min(parsedLimit, 100)));

    return transactions.map(mapTransactionDocument);
  }
}
