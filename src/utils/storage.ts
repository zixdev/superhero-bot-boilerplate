import { SimpleFsStorageProvider } from "matrix-bot-sdk";
import { BOT_STORAGE_FILE } from "../config";

if (!BOT_STORAGE_FILE) {
  throw new Error("Please set BOT_STORAGE_FILE");
}

export const fileStorageProvider = new SimpleFsStorageProvider(
  BOT_STORAGE_FILE,
);
