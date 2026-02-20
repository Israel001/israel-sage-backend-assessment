import { z } from "zod";

export const createAccountSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255)
});

export const moneyActionSchema = z.object({
  amount: z.union([z.number(), z.string()])
});

export const transferSchema = z.object({
  toAccountId: z.string().trim().min(1),
  amount: z.union([z.number(), z.string()])
});

export const statementQuerySchema = z.object({
  type: z.enum(["FUND", "WITHDRAW", "TRANSFER"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export type CreateAccountBody = z.infer<typeof createAccountSchema>;
export type MoneyActionBody = z.infer<typeof moneyActionSchema>;
export type TransferBody = z.infer<typeof transferSchema>;
export type StatementQuery = z.infer<typeof statementQuerySchema>;
