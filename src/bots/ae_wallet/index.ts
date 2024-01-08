import { AeSdk } from "@aeternity/aepp-sdk";
import { PROTOCOL_AETERNITY } from "../../constants";
import { BaseBot, BotCommand, BaseBotOptions } from "../@base";
import { CheckWalletBalanceCommand } from "./WalletCommands/CheckWalletBalanceCommand";
import { ConnectWalletCommand } from "./WalletCommands/ConnectWalletCommand";
import { DisconnectWalletCommand } from "./WalletCommands/DisconnectWalletCommand";
import { TransferTokenCommand } from "./WalletCommands/TransferTokenCommand";
import { Router } from "express";
import { initRouter } from "./callbackRouter";
import { IChatEvent } from "../../types";
import { IRoomMetadata } from "../../libs/RoomCache";

type AeWalletBotOptions = BaseBotOptions & {
  aeSdk: AeSdk;
};

export class AeWalletBot extends BaseBot {
  aeSdk: AeSdk;
  router = Router();

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
      return `<p>Hi there! 👋 Welcome to the Wallet Bot! I'm your trusted DeFi companion, here to simplify your crypto experience! With my superpowers, I can securely transfer your tokens, check your balance, and more! </p>

      <p>But before we dive in, let's get you set up:</p>

      <ol>
        <li>First, download the Superhero Wallet: <a href="https://wallet.superhero.com" target="_blank" style="color: #1D9BF0; text-decoration: none;">Superhero Wallet</a> 📥</li>
        <li>After you have downloaded the Wallet and created an account, connect your Superhero Wallet to me.</li>
        <li>Type: <code>/connect "your wallet address"</code><br>For example: <code>/connect ak_xyz</code></li>
      </ol>`;
    }
    return null;
  }
}
