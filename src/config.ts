import * as dotenv from "dotenv";

dotenv.config();

export const COIN_GECKO_API_URL = "https://api.coingecko.com/api/v3";
export const MATRIX_BOT_HOME_SERVER_URL =
  process.env.MATRIX_BOT_HOME_SERVER_URL;
