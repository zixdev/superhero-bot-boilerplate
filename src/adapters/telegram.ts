import { Bot } from "grammy";

import { IMessage, ISender } from "../types";
import { BaseAdapter } from "./base";

type TelegramAdapterOptions = {
  token?: string;
};

export class TelegramAdapter extends BaseAdapter {
  client: Bot;
  token: TelegramAdapterOptions;

  constructor(token: TelegramAdapterOptions) {
    super(token);
    if (!token) {
      throw new Error(
        "Telegram bot token is undefined, please set TELEGRAM_BOT_TOKEN",
      );
    }
    this.client = new Bot(token?.token);

    if (!token) {
      console.warn(
        "No access token provided through environment. Please PERMANENTLY store the access token in an the environment variable.",
      );
    }

    this.token = token;
  }

  async init({ autoJoin }: { autoJoin?: boolean } = { autoJoin: true }) {
    this.client.command("start", async (ctx) => {
      await ctx.reply("Welcome!");
    });
    
    this.client.start();

    console.log("TelegramBot started");
    return this.client;
  }

  sendMessage(text: string, chatId?: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
