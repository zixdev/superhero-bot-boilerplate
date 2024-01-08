import { BaseAdapter } from "../../adapters/base";
import { AETERNITY_COIN_ID } from "../../constants";
import { PriceRatesHelper } from "../../libs/PriceRatesHelper";
import { getUserState } from "../../libs/UserState";
import { IChatEvent, IMessage, ISender, Protocol } from "../../types";
import { BotCommand } from "./BotCommand";
import { HelpCommand } from "./HelpCommand";
import { AeSdk } from "@aeternity/aepp-sdk";
import { VerifiedAccounts } from "../../backend/VerifiedAccounts";
import { UserFacingError } from "../../utils/errors";
import { IRoomMetadata } from "../../libs/RoomCache";

export interface BaseBotOptions {
  commandPrefix?: string;
  protocol?: Protocol;
  chatAdapters: BaseAdapter[];
  aeSdk?: AeSdk;
  verifiedAccounts?: VerifiedAccounts;
}

export abstract class BaseBot {
  commandPrefix = "/";
  protocol: Protocol;
  commands: Record<string, BotCommand> = {
    help: new HelpCommand(),
  };

  chatAdapters: BaseAdapter[] = [];

  priceRatesHelper: PriceRatesHelper;

  constructor({
    commandPrefix = "/",
    protocol,
    chatAdapters = [],
  }: BaseBotOptions) {
    this.commandPrefix = commandPrefix;
    this.chatAdapters = chatAdapters;
    this.protocol = protocol || AETERNITY_COIN_ID;
    this.priceRatesHelper = new PriceRatesHelper();

    this.getCommands().forEach((command) => {
      this.commands[command.name] = command;
    });

    this.chatAdapters.forEach((adapter) => adapter.connectBot(this));

    this.preloadInitialData();
  }

  async preloadInitialData(): Promise<void> {
    await this.priceRatesHelper.preloadProtocolRates(this.protocol);
  }

  async onMessage(sender: ISender, message: IMessage): Promise<string | null> {
    /**
     * Execute commands first
     */
    for (const [commandName, command] of Object.entries(this.commands)) {
      if (message.text?.startsWith(`${this.commandPrefix}${commandName}`)) {
        const commandText = message.text.substring(commandName.length);
        const answer = await command
          .handleCommand(this, sender, {
            ...message,
            text: commandText,
          })
          .catch((error: Error) => {
            if (error instanceof UserFacingError) return error.message;

            console.error(error.stack);
            // generic error message
            return "Ops, looks like something went wrong. Please try again and if it does not work, ask the team for some help.";
          });
        if (answer) return answer;
      }
    }
    /**
     * If the received message doesn't match any predefined commands,
     * then check if it corresponds to a step in a multi-step interaction process
     */
    const userState = getUserState(sender.id);
    if (userState) {
      const command = this.commands[userState.command];
      if (command) {
        return command
          .handleStep(this, sender, message, userState)
          .catch((error: Error) => {
            if (error instanceof UserFacingError) return error.message;

            console.error(error.stack);
            // generic error message
            return "Ops, looks like something went wrong. Please try again and if it does not work, ask the team for some help.";
          });
      } else {
        return `Unknown interaction,
          Please start fresh! use <b>/help</b> to see the available commands`;
      }
    }
    /**
     * Ignore the message
     */
    return null;
  }

  async onRoomJoin(
    roomId: string,
    event: IChatEvent,
    metaData: IRoomMetadata,
  ): Promise<string | null> {
    return null;
  }

  abstract getCommands(): Array<BotCommand>;
}
