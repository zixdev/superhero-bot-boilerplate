import * as dotenv from "dotenv";

dotenv.config();

export const COIN_GECKO_API_URL = "https://api.coingecko.com/api/v3";
export const MATRIX_BOT_HOME_SERVER_URL =
  process.env.MATRIX_BOT_HOME_SERVER_URL;

export const BOT_STORAGE_FILE =
  process.env.BOT_STORAGE_FILE;

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const BOT_ASSISTANT_ID = process.env.BOT_ASSISTANT_ID;