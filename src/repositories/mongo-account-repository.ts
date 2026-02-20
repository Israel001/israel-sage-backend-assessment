import { startSession, Types } from "mongoose";
import { AccountModel } from "../models/account-model";
import { mapAccountDocument } from "./mappers";
import type {
  Account,
  AccountRepository,
  CreateAccountInput,
  TransferBalanceResult
} from "../types/domain";

export class MongoAccountRepository implements AccountRepository {
  async create({ firstName, lastName, email }: CreateAccountInput): Promise<Account> {
    const account = await AccountModel.create({
      firstName,
      lastName,
      email,
      balanceCents: 0
    });
    return mapAccountDocument(account);
  }

  async findByEmail(email: string): Promise<Account | null> {
    const account = await AccountModel.findOne({ email: email.toLowerCase() });
    return account ? mapAccountDocument(account) : null;
  }

  async findById(id: string): Promise<Account | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const account = await AccountModel.findById(id);
    return account ? mapAccountDocument(account) : null;
  }

  async incrementBalance(id: string, amountCents: number): Promise<Account | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const account = await AccountModel.findByIdAndUpdate(
      id,
      { $inc: { balanceCents: amountCents } },
      { new: true }
    );
    return account ? mapAccountDocument(account) : null;
  }

  async decrementBalance(id: string, amountCents: number): Promise<Account | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const account = await AccountModel.findOneAndUpdate(
      {
        _id: id,
        balanceCents: { $gte: amountCents }
      },
      { $inc: { balanceCents: -amountCents } },
      { new: true }
    );
    return account ? mapAccountDocument(account) : null;
  }

  async transferBalance(
    fromId: string,
    toId: string,
    amountCents: number
  ): Promise<TransferBalanceResult | null> {
    if (!Types.ObjectId.isValid(fromId) || !Types.ObjectId.isValid(toId)) {
      return null;
    }

    const session = await startSession();

    try {
      session.startTransaction();

      const sender = await AccountModel.findOneAndUpdate(
        {
          _id: fromId,
          balanceCents: { $gte: amountCents }
        },
        { $inc: { balanceCents: -amountCents } },
        { new: true, session }
      );

      if (!sender) {
        await session.abortTransaction();
        return null;
      }

      const recipient = await AccountModel.findByIdAndUpdate(
        toId,
        { $inc: { balanceCents: amountCents } },
        { new: true, session }
      );

      if (!recipient) {
        await session.abortTransaction();
        return null;
      }

      await session.commitTransaction();

      return {
        sender: mapAccountDocument(sender),
        recipient: mapAccountDocument(recipient)
      };
    } catch (error: unknown) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      if (this.isTransactionNotSupportedError(error)) {
        return this.transferBalanceWithoutTransaction(fromId, toId, amountCents);
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  private isTransactionNotSupportedError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return (
      error.message.includes("Transaction numbers are only allowed") ||
      error.message.includes("replica set") ||
      error.message.includes("Transaction support")
    );
  }

  private async transferBalanceWithoutTransaction(
    fromId: string,
    toId: string,
    amountCents: number
  ): Promise<TransferBalanceResult | null> {
    const sender = await AccountModel.findOneAndUpdate(
      {
        _id: fromId,
        balanceCents: { $gte: amountCents }
      },
      { $inc: { balanceCents: -amountCents } },
      { new: true }
    );

    if (!sender) {
      return null;
    }

    const recipient = await AccountModel.findByIdAndUpdate(
      toId,
      { $inc: { balanceCents: amountCents } },
      { new: true }
    );

    if (!recipient) {
      await AccountModel.findByIdAndUpdate(fromId, { $inc: { balanceCents: amountCents } });
      return null;
    }

    return {
      sender: mapAccountDocument(sender),
      recipient: mapAccountDocument(recipient)
    };
  }
}
