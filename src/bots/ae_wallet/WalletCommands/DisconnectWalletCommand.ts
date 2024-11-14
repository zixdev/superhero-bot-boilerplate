import { IBotCommandArguments, ISender, IMessage } from "../../../types";
import { fileStorageProvider } from "../../../utils/storage";
import { BotCommand } from "../../@base";
import { TxParamsAsyncContractCallTx1 } from "@aeternity/aepp-sdk/es/tx/builder/schema.generated";
import { AciContractCallEncoder } from "@aeternity/aepp-calldata";
import ACCOUNT_VERIFICATION_CONTRACT_ACI from "superhero-bot-contracts/generated/AccountVerification.aci.json";
import { v4 as uuid } from "uuid";
import { AeWalletBot } from "../index";
import { Tag } from "@aeternity/aepp-sdk";
import { VerifiedAccounts } from "../../../backend/VerifiedAccounts";
import { generateSignTransactionDeeplinkUrl } from "../../../utils/shWallet";
import Aeternity from "../../../backend/Aeternity";

export class DisconnectWalletCommand extends BotCommand {
  name: string = "disconnect";
  description: string = "Disconnect your Wallet";
  usageContext = {
    dm: true,
    room: false,
  };

  getArguments(): IBotCommandArguments[] {
    return [];
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
    const transaction: TxParamsAsyncContractCallTx1 = {
      tag: Tag.ContractCallTx,
      callerId: VerifiedAccounts.getVerifiedAccountOrException(
        sender.id.toString(),
      ),
      contractId: (await Aeternity.verifiedAccounts()).contractId,
      callData: new AciContractCallEncoder(
        ACCOUNT_VERIFICATION_CONTRACT_ACI,
      ).encodeCall("AccountVerification", "remove_verified_account", [
        sender.id,
      ]),
    };
    const rawTx = await bot.aeSdk.buildTx(transaction);

    const id = uuid();

    fileStorageProvider.storeValue(
      `RemoveVerifiedWallet: ${id}`,
      JSON.stringify({
        senderId: sender.id,
        chatId: message.chatId,
      }),
    );

    const signTransactionUrl = generateSignTransactionDeeplinkUrl(
      rawTx,
      `ae-wallet-bot/remove-verified-wallet/${id}`,
    );
    return `
      🔗 Sure! To remove the previous connection, please sign the transaction using the link below:
        [Remove Connection](${signTransactionUrl})
    `;
  }
}
