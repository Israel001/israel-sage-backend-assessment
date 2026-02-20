import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";

async function start(): Promise<void> {
  try {
    await connectDatabase();
    const app = createApp();
    app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Wallet API listening on port ${env.port}`);
    });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

void start();
