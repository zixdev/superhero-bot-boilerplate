import { IBotCommandArguments, ISender, IMessage } from "../../../types";
import { BotCommand } from "../../@base";
import { AeWalletBot } from "../index";
import { hash, isAddressValid } from "@aeternity/aepp-sdk";
import { AciContractCallEncoder } from "@aeternity/aepp-calldata";
import ACCOUNT_VERIFICATION_CONTRACT_ACI from "superhero-bot-contracts/generated/AccountVerification.aci.json";
import { Tag } from "@aeternity/aepp-sdk";
import { TxParamsAsyncContractCallTx1 } from "@aeternity/aepp-sdk/es/tx/builder/schema.generated";
import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import { v4 as uuid } from "uuid";
import { fileStorageProvider } from "../../../utils/storage";
import { generateSignTransactionDeeplinkUrl } from "../../../utils/shWallet";
import Aeternity from "../../../backend/Aeternity";
import { UserFacingError } from "../../../utils/errors";

class ConnectWalletError extends UserFacingError {
  constructor(message: string) {
    super(
      message +
        "<br /><br />To connect your wallet, please use this format: <b>/connect “address”</b>.<br />For example: /connect ak_xyz",
    );

    Object.setPrototypeOf(this, UserFacingError.prototype);
  }
}

export class ConnectWalletCommand extends BotCommand {
  name: string = "connect";
  description: string = "Connect your Wallet";
  handleArgumentError = false;
  usageContext = {
    dm: true,
    room: false,
  };

  getArguments(): IBotCommandArguments[] {
    return [
      {
        name: "address",
        required: true,
        description: "The address of the wallet you want to connect",
      },
    ];
  }

  getOptions(): IBotCommandArguments[] {
    return [];
  }

  async handle(
    bot: AeWalletBot,
    sender: ISender,
    message: IMessage,
    args: Record<string, string>,
    options: Record<string, string>,
  ): Promise<string> {
    if (!args.address || !isAddressValid(args.address)) {
      throw new ConnectWalletError(
        "Ops, it looks like you forgot to specify a valid account to connect to.",
      );
    }

    const signature = await bot.aeSdk.sign(
      hash(`THE_BOT_VERIFIES_${sender.id}`),
    );

    const transaction: TxParamsAsyncContractCallTx1 = {
      tag: Tag.ContractCallTx,
      callerId: args.address as Encoded.AccountAddress,
      contractId: (await Aeternity.verifiedAccounts()).contractId,
      callData: new AciContractCallEncoder(
        ACCOUNT_VERIFICATION_CONTRACT_ACI,
      ).encodeCall("AccountVerification", "verify_account", [
        sender.id,
        signature,
      ]),
    };
    const rawTx = await bot.aeSdk.buildTx(transaction);

    const id = uuid();

    fileStorageProvider.storeValue(
      `VerifyWallet: ${id}`,
      JSON.stringify({
        address: args.address,
        senderId: sender.id,
        chatId: message.chatId,
      }),
    );

    const signTransactionUrl = generateSignTransactionDeeplinkUrl(
      rawTx,
      `ae-wallet-bot/verified-wallet/${id}`,
    );
    return `
      <p>🔗 Sure! To connect the wallet, please sign the transaction link below to connect your Superhero Wallet with me. 🦸‍♂️</p>
      <p><a href="${signTransactionUrl}" target="_blank">Sign Transaction</a></p>
    `;
  }
}
