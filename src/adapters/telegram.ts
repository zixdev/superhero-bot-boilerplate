import { Bot } from "grammy";

import { IMessage, ISender } from "../types";
import { BaseAdapter } from "./base";
import { BaseBot } from "src/bots/@base";

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

  connectBot(bot: BaseBot): this {
    this.bot = bot;
    const commands = [];

    Object.values(bot.commands).forEach((command) => {
      commands.push({
        command: command.name,
        description: command.description,
      });
    });
    this.client.api.setMyCommands(commands);

    return this;
  }

  async init({ autoJoin }: { autoJoin?: boolean } = { autoJoin: true }) {

    this.client.on("message", async (ctx) => {
      console.log("first chatId", ctx.message.chat.id);
      const sender: ISender = {
        id: ctx.message.chat.id.toString(),
        name: ctx.message.from.username || ctx.message.from.first_name,
        isDirect: true,
      };
      const message: IMessage = {
        chatId: ctx.message.chat.id.toString(), // TODO
        text: ctx.message.text || "",
      };

      if (!this.bot) {
        return;
      }

      if (message.text) {
        this.bot.onMessage(
          sender,
          message,
          (reply) => {
            ctx.reply(reply, {
              parse_mode: "Markdown",
            });

            return reply;
          },
          (isTyping) => {
            if (isTyping) {
              ctx.replyWithChatAction("typing");
            }
          },
        );
      }
    });

    this.client.start();

    console.log("TelegramBot started");
    return this.client;
  }

  async sendMessage(text: string, chatId?: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
