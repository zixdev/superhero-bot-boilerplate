import showdown from "showdown";
import { BaseBot } from "../bots/@base";

export interface BaseAdapterOptions {
  clientKey?: string;
  username: string;
}

export abstract class BaseAdapter {
  bot: BaseBot;
  markdownConverter: showdown.Converter;

  constructor(options: BaseAdapterOptions) {
    this.markdownConverter = new showdown.Converter();
  }

  connectBot(bot: BaseBot) {
    this.bot = bot;
    return this;
  }

  abstract sendMessage(text: string, chatId?: string): Promise<void>;
}
