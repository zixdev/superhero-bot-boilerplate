import { SimpleFsStorageProvider } from "matrix-bot-sdk";

if (!process.env.BOT_STORAGE_FILE) {
  throw new Error("Please set BOT_STORAGE_FILE");
}

export const fileStorageProvider = new SimpleFsStorageProvider(
  process.env.BOT_STORAGE_FILE,
);
