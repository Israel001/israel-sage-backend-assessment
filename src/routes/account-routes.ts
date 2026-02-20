import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { createAccountController } from "../controllers/account-controller";
import type { WalletService } from "../services/wallet-service";

interface AccountRouterDeps {
  walletService: WalletService;
}

export function createAccountRouter({ walletService }: AccountRouterDeps): Router {
  const router = Router();
  const controller = createAccountController({ walletService });

  router.post("/accounts", asyncHandler(controller.createAccount));
  router.post("/auth/token", asyncHandler(controller.issueToken));
  router.get("/accounts/me", requireAuth, asyncHandler(controller.getCurrentAccount));
  router.post("/accounts/fund", requireAuth, asyncHandler(controller.fundAccount));
  router.post("/accounts/withdraw", requireAuth, asyncHandler(controller.withdraw));
  router.post("/accounts/transfer", requireAuth, asyncHandler(controller.transfer));
  router.get("/accounts/me/statement", requireAuth, asyncHandler(controller.getStatement));

  return router;
}
