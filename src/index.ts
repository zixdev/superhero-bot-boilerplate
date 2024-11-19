import { MatrixAdapter } from "./adapters/matrix";
import { AeWalletBot } from "./bots/ae_wallet";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import { VerifiedAccounts } from "./backend/VerifiedAccounts";
import Aeternity from "./backend/Aeternity";
import { TelegramAdapter } from "./adapters/telegram";

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

  // init backends
  const aeSdk = await Aeternity.init();
  await VerifiedAccounts.init(); // depends on token balance scanner

  const chatAdapters = [];

  // setup adapters
  if (process.env.TELEGRAM_WALLET_BOT_TOKEN) {
    const walletBotTelegramAdapter = new TelegramAdapter({
      token: process.env.TELEGRAM_WALLET_BOT_TOKEN,
    });
    await walletBotTelegramAdapter.init();
    chatAdapters.push(walletBotTelegramAdapter);
  }

  if (process.env.MATRIX_WALLET_BOT_ACCESS_TOKEN) {
    const walletBotMatrixAdapter = new MatrixAdapter({
      username: process.env.MATRIX_WALLET_BOT_USERNAME,
      accessToken: process.env.MATRIX_WALLET_BOT_ACCESS_TOKEN,
      password: process.env.MATRIX_WALLET_BOT_PASSWORD,
    });
    await walletBotMatrixAdapter.init();

    // setup listeners
    walletBotMatrixAdapter.setupListeners();
    chatAdapters.push(walletBotMatrixAdapter);
  }

  // init bots

  // setup bots that communicate with the user
  const aeWalletBot = new AeWalletBot({
    chatAdapters,
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
