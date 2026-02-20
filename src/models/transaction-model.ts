import { model, Schema, type Types } from "mongoose";
import type { TransactionType } from "../types/domain";

export interface TransactionPersistence {
  type: TransactionType;
  amountCents: number;
  actorAccountId: Types.ObjectId | string;
  fromAccountId?: Types.ObjectId | string;
  toAccountId?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<TransactionPersistence>(
  {
    type: {
      type: String,
      enum: ["FUND", "WITHDRAW", "TRANSFER"],
      required: true
    },
    amountCents: {
      type: Number,
      required: true,
      min: 1
    },
    actorAccountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true
    },
    fromAccountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: false
    },
    toAccountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: false
    }
  },
  {
    timestamps: true
  }
);

export const TransactionModel = model<TransactionPersistence>("Transaction", transactionSchema);
