import type { Types } from "mongoose";
import type { AccountPersistence } from "../models/account-model";
import type { TransactionPersistence } from "../models/transaction-model";
import type { Account, TransactionRecord } from "../types/domain";

type AccountDocumentLike = AccountPersistence & { _id: Types.ObjectId };

type TransactionDocumentLike = TransactionPersistence & { _id: Types.ObjectId };

export function mapAccountDocument(document: AccountDocumentLike): Account {
  return {
    id: String(document._id),
    firstName: document.firstName,
    lastName: document.lastName,
    email: document.email,
    balanceCents: document.balanceCents,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt
  };
}

export function mapTransactionDocument(document: TransactionDocumentLike): TransactionRecord {
  return {
    id: String(document._id),
    type: document.type,
    amountCents: document.amountCents,
    actorAccountId: document.actorAccountId ? String(document.actorAccountId) : null,
    fromAccountId: document.fromAccountId ? String(document.fromAccountId) : null,
    toAccountId: document.toAccountId ? String(document.toAccountId) : null,
    createdAt: document.createdAt
  };
}
