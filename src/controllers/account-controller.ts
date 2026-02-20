import type { Request, Response } from "express";
import { signAccessToken } from "../lib/token";
import {
  createAccountSchema,
  issueTokenSchema,
  moneyActionSchema,
  transferSchema,
  statementQuerySchema
} from "../validators/account-schemas";
import type { WalletService } from "../services/wallet-service";
import { HttpError } from "../utils/http-error";

interface AccountControllerDeps {
  walletService: WalletService;
}

function getAuthenticatedAccountId(req: Request): string {
  const accountId = req.auth?.accountId;
  if (!accountId) {
    throw new HttpError(401, "Missing bearer token", "UNAUTHORIZED");
  }
  return accountId;
}

export function createAccountController({ walletService }: AccountControllerDeps) {
  return {
    async createAccount(req: Request, res: Response): Promise<void> {
      const payload = createAccountSchema.parse(req.body);
      const account = await walletService.createAccount(payload);
      const token = signAccessToken(account);
      res.status(201).json({ account, token });
    },

    async issueToken(req: Request, res: Response): Promise<void> {
      const payload = issueTokenSchema.parse(req.body);
      const account = await walletService.getAccountByEmail(payload.email);
      const token = signAccessToken(account);
      res.status(200).json({ account, token });
    },

    async getCurrentAccount(req: Request, res: Response): Promise<void> {
      const account = await walletService.getAccount(getAuthenticatedAccountId(req));
      res.status(200).json({ account });
    },

    async fundAccount(req: Request, res: Response): Promise<void> {
      const payload = moneyActionSchema.parse(req.body);
      const account = await walletService.fundAccount({
        accountId: getAuthenticatedAccountId(req),
        amount: payload.amount
      });
      res.status(200).json({ account });
    },

    async withdraw(req: Request, res: Response): Promise<void> {
      const payload = moneyActionSchema.parse(req.body);
      const account = await walletService.withdrawFromAccount({
        accountId: getAuthenticatedAccountId(req),
        amount: payload.amount
      });
      res.status(200).json({ account });
    },

    async transfer(req: Request, res: Response): Promise<void> {
      const payload = transferSchema.parse(req.body);
      const transferResult = await walletService.transfer({
        fromAccountId: getAuthenticatedAccountId(req),
        toAccountId: payload.toAccountId,
        amount: payload.amount
      });
      res.status(200).json(transferResult);
    },

    async getStatement(req: Request, res: Response): Promise<void> {
      const query = statementQuerySchema.parse(req.query);
      const statement = await walletService.getStatement(getAuthenticatedAccountId(req), query);
      res.status(200).json(statement);
    }
  };
}
