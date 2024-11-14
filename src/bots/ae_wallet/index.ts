import { AeSdk } from "@aeternity/aepp-sdk";
import { Router } from "express";
import { BOT_ASSISTANT_ID } from "../../config";
import { PROTOCOL_AETERNITY } from "../../constants";
import { IRoomMetadata } from "../../libs/RoomCache";
import { IChatEvent } from "../../types";
import { BaseBotOptions, BotCommand } from "../@base";
import { OpenAIAssistantBot } from "../@base/OpenAiAssistantBot";
import { initRouter } from "./callbackRouter";
import { CheckWalletBalanceCommand } from "./WalletCommands/CheckWalletBalanceCommand";
import { ConnectWalletCommand } from "./WalletCommands/ConnectWalletCommand";
import { DisconnectWalletCommand } from "./WalletCommands/DisconnectWalletCommand";
import { TransferTokenCommand } from "./WalletCommands/TransferTokenCommand";

type AeWalletBotOptions = BaseBotOptions & {
  aeSdk: AeSdk;
};

export class AeWalletBot extends OpenAIAssistantBot {
  aeSdk: AeSdk;
  router = Router();

  assistantId = BOT_ASSISTANT_ID;
  assistantInstructions = `
    You're Superhero Wallet Bot,
    you help people understanding more information about aeternity,
    and get information about their balances
  `;

  constructor(options: AeWalletBotOptions) {
    super({
      ...options,
      protocol: PROTOCOL_AETERNITY,
    });

    this.aeSdk = options.aeSdk;

    initRouter(this.router, options);
    console.log("initialized bot wallet", this.aeSdk.selectedAddress);
  }

  getCommands(): Array<BotCommand> {
    return [
      new ConnectWalletCommand(),
      new CheckWalletBalanceCommand(),
      new TransferTokenCommand(),
      new DisconnectWalletCommand(),
    ];
  }

  async onRoomJoin(
    _roomId: string,
    _event: IChatEvent,
    metaData: IRoomMetadata,
  ): Promise<string | null> {
    if (metaData.isDirect) {
      return `Hi there! 👋 Welcome to the Wallet Bot! I'm your trusted DeFi companion, here to simplify your crypto experience! With my superpowers, I can securely transfer your tokens, check your balance, and more! 
      \n\nBut before we dive in, let's get you set up: 
      \n\n1. First, download the Superhero Wallet: [Superhero Wallet](https://wallet.superhero.com) 📥 
      \n2. After you have downloaded the Wallet and created an account, connect your Superhero Wallet to me. 
      \n3. Type: \`/connect "your wallet address"\` \nFor example: \`/connect ak_xyz\``;
    }
    return null;
  }
}
