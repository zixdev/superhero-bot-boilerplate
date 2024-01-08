import { BaseBot } from "../bots/@base";

export interface BaseAdapterOptions {
  clientKey?: string;
  username: string;
}

export abstract class BaseAdapter {
  bot: BaseBot;

  constructor(options: BaseAdapterOptions) {
    //
  }

  connectBot(bot: BaseBot) {
    this.bot = bot;
    return this;
  }

  abstract sendMessage(text: string, chatId?: string): Promise<void>;
}
