import express, { type Application } from "express";
import { createAccountRouter } from "./routes/account-routes";
import { notFoundHandler, errorHandler } from "./middleware/error-handler";
import { createMongoContainer, type AppContainer } from "./container";

interface CreateAppInput {
  container?: AppContainer;
}

export function createApp({ container }: CreateAppInput = {}): Application {
  const resolvedContainer = container || createMongoContainer();
  const app = express();

  app.use(express.json());
  app.use("/api", createAccountRouter({ walletService: resolvedContainer.walletService }));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
