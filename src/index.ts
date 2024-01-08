import { MatrixAdapter } from "./adapters/matrix";
import { AeWalletBot } from "./bots/ae_wallet";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import { VerifiedAccounts } from "./backend/VerifiedAccounts";
import Aeternity from "./backend/Aeternity";

process.on("unhandledRejection", (reason: Error | string | undefined) => {
  const error = reason instanceof Error ? reason : new Error(reason);
  console.error(`UnhandledRejection: ${error.message} ${error?.stack ?? ""}`);
});

process.on("uncaughtException", (reason: Error | string | undefined) => {
  const error = reason instanceof Error ? reason : new Error(reason);
  console.error(`UncaughtException: ${error.message} ${error?.stack ?? ""}`);
});

async function start() {
  if (process.version < "v18.0.0") {
    console.error("Node.js version must be >= 18.0.0");
    process.exit(1);
  }

  const port = 3000; // default port to listen
  const app = express();

  app.use(
    cors({
      origin: "*",
    }),
  );
  app.use(bodyParser.json());

  // check env
  if (!process.env.MATRIX_WALLET_BOT_USERNAME) {
    throw new Error("Please set MATRIX_WALLET_BOT_USERNAME");
  }

  // setup adapters
  const walletBotMatrixAdapter = new MatrixAdapter({
    username: process.env.MATRIX_WALLET_BOT_USERNAME,
    accessToken: process.env.MATRIX_WALLET_BOT_ACCESS_TOKEN,
    password: process.env.MATRIX_WALLET_BOT_PASSWORD,
  });

  // init bots
  await walletBotMatrixAdapter.init();

  // init backends
  const aeSdk = await Aeternity.init();
  await VerifiedAccounts.init(); // depends on token balance scanner

  // setup listeners
  walletBotMatrixAdapter.setupListeners();

  // setup bots that communicate with the user
  const aeWalletBot = new AeWalletBot({
    chatAdapters: [walletBotMatrixAdapter],
    aeSdk,
  });

  // setup routes
  app.use("/ae-wallet-bot", aeWalletBot.router);

  app.listen(port, () => {
    // tslint:disable-next-line:no-console
    console.log(`server started at http://localhost:${port}`);
  });
}

void start();
