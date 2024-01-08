import { RustSdkCryptoStorageProvider } from "matrix-bot-sdk";

export const cryptoStorageProvider = (username: string) =>
  new RustSdkCryptoStorageProvider(
    `${process.env.BOT_ENCRYPTION_DIR}_${username}`,
  );
