import { model, Schema } from "mongoose";

export interface AccountPersistence {
  firstName: string;
  lastName: string;
  email: string;
  balanceCents: number;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<AccountPersistence>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true
    },
    balanceCents: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

export const AccountModel = model<AccountPersistence>("Account", accountSchema);
