import {
  Encoded,
  Tag,
  isAddressValid,
  AE_AMOUNT_FORMATS,
  toAettos,
} from "@aeternity/aepp-sdk";
import {
  TxParamsAsyncContractCallTx1,
  TxParamsAsyncSpendTx1,
} from "@aeternity/aepp-sdk/es/tx/builder/schema.generated";
import { AciContractCallEncoder } from "@aeternity/aepp-calldata";
import FUNGIBLE_TOKEN_FULL_CONTRACT_ACI from "aeternity-fungible-token/generated/FungibleTokenFull.aci.json";
import { v4 as uuid } from "uuid";
import BigNumber from "bignumber.js";

import { AeWalletBot } from "..";
import { IBotCommandArguments, IMessage, ISender, Steps } from "../../../types";
import { BotCommand } from "../../@base";
import { fileStorageProvider } from "../../../utils/storage";
import { toShiftedBigNumber } from "../../../utils/aeternity";
import { clearUserState, UserState } from "../../../libs/UserState";
import { VerifiedAccounts } from "../../../backend/VerifiedAccounts";
import { generateSignTransactionDeeplinkUrl } from "../../../utils/shWallet";
import {
  getTokenBalanceAndSymbolOrPrepareSelection,
  handleSelectOption,
  SelectToken,
} from "../../../utils/selectToken";
import { UserFacingError } from "../../../utils/errors";

class TransferError extends UserFacingError {
  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, UserFacingError.prototype);
  }
}

export class TransferTokenCommand extends BotCommand {
  name: string = "send";
  description: string = "Send tokens to a verified user or Wallet address";
  handleArgumentError = false;
  usageContext = {
    dm: true,
    room: false,
  };

  getArguments(): IBotCommandArguments[] {
    return [
      {
        name: "amount",
        required: true,
        description: "The amount of tokens to transfer",
      },
      {
        name: "token",
        required: false,
        description: "The token you want to transfer",
      },
      {
        name: "to",
        required: true,
        isFixed: true,
      },
      {
        name: "recipient",
        required: true,
        description: "The address of the recipient",
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
    _options: Record<string, string>,
    errorMessages?: string[],
  ): Promise<string> {
    // validate args since we disabled the auto checker
    // missing amount
    if (!args.amount) {
      throw new TransferError(
        "Ops, it looks like you forgot to specify amount.",
      );
    }

    // not a number
    if (isNaN(Number(args.amount))) {
      throw new TransferError("Oops! 🚫 The amount provided is not a number.");
    }

    // if amount is negative
    if (Number(args.amount) <= 0) {
      throw new TransferError(
        "Whoa there, friend! We can't work with negative or zero amounts. Please make sure to use a positive amount for the transfer. Let's keep it positive!",
      );
    }

    // check if token is set
    if (!args.token) {
      throw new TransferError(
        "Ops, it looks like you forgot to specify the token symbol.",
      );
    }

    // check if recipient is set
    if (!args.recipient) {
      throw new TransferError(
        'Ops, it looks like you forgot to specify the recipient. You can either send tokens to a verified user on the platform or to a specific wallet address. Use either “@user" or “ak_xyz“.',
      );
    }

    // check if recipient has right format
    if (
      args.recipient &&
      !args.recipient.startsWith("@") &&
      !args.recipient.startsWith("ak_")
    ) {
      throw new TransferError(
        'Ops, I could not recognize the recipient you specified. You can either send tokens to a verified user on the platform or to a specific wallet address. Use either “@user" or “ak_xyz“.',
      );
    }

    if (args.recipient.startsWith("ak_") && !isAddressValid(args.recipient)) {
      throw new TransferError(
        ` Oops, it looks like there might be a tiny hiccup. It appears that the recipient doesn't have a compatible Wallet.`,
      );
    }

    if (errorMessages?.length) {
      throw new TransferError("Error: " + errorMessages[0] + "\n");
    }

    const address = VerifiedAccounts.getVerifiedAccountOrException(
      sender.id.toString(),
    );

    const { amount, token, recipient } = args;

    let recipientAddress = recipient.startsWith("@")
      ? VerifiedAccounts.getVerifiedAccountOrUndefined(recipient)
      : (recipient as Encoded.AccountAddress);

    if (!recipientAddress) {
      return `The user ${recipient} doesn't seem to be verified yet❗️`;
    }

    if (message.taggedAccounts && message.taggedAccounts.length >= 2) {
      return "You can only transfer to one account at a time.";
    }

    return token === "AE"
      ? this.handleAeTransfer(
          bot,
          message,
          address,
          amount,
          recipient,
          recipientAddress,
        )
      : this.handleTokenTransfer(
          bot,
          message,
          address,
          token,
          amount,
          recipient,
          recipientAddress,
          sender,
        );
  }

  private async handleAeTransfer(
    bot: AeWalletBot,
    message: IMessage,
    address: Encoded.AccountAddress,
    amount: string,
    recipient: string,
    recipientAddress: Encoded.AccountAddress,
  ) {
    const balance = await bot.aeSdk.getBalance(address, {
      format: AE_AMOUNT_FORMATS.AE,
    });

    if (new BigNumber(balance).lt(amount)) {
      return "Oops, it looks like there might be a tiny hiccup. It appears there are insufficient funds in your wallet. Go and top up your wallet, and then come back and give the command another go!";
    }

    const transaction: TxParamsAsyncSpendTx1 = {
      tag: Tag.SpendTx,
      senderId: address as Encoded.AccountAddress,
      recipientId: recipientAddress as Encoded.AccountAddress,
      amount: toAettos(amount),
    };

    const rawTx = await bot.aeSdk.buildTx(transaction);

    const signTransactionUrl = await this.constructUnsignedTransactionUrl(
      message.chatId,
      rawTx,
    );
    const recipientInfo = recipient.startsWith("@")
      ? `, wallet address: ${recipientAddress}`
      : "";

    // Construct confirmation message
    // Construct confirmation message with named anchor text
    return `
      <p>👍 Sure thing! Please confirm the transaction through the link provided,
      and I will immediately initiate the transfer to ${recipient}${recipientInfo}:</p>
      <p><a href="${signTransactionUrl}" target="_blank">Confirm Transaction</a> 🔗</p>
      `;
  }

  private async handleTokenTransfer(
    bot: AeWalletBot,
    message: IMessage,
    address: Encoded.AccountAddress,
    token: string,
    amount: string,
    recipient: string,
    recipientAddress: Encoded.AccountAddress,
    sender: ISender,
  ) {
    const selectToken = await getTokenBalanceAndSymbolOrPrepareSelection(
      address,
      token,
      sender.id.toString(),
      this.name,
      { recipient, recipientAddress, amount, address },
    );

    return this.constructTokenReplyMessage(
      bot,
      message,
      address,
      selectToken,
      amount,
      recipient,
      recipientAddress,
    );
  }

  async handleStep(
    bot: AeWalletBot,
    sender: ISender,
    message: IMessage,
    userState: UserState,
  ): Promise<string> {
    if (userState.step === Steps.TOKEN_SELECT_AWAITING_USER_CHOICE) {
      const selectedToken = handleSelectOption<SelectToken>(message, userState);

      try {
        return this.constructTokenReplyMessage(
          bot,
          message,
          userState.context.address,
          selectedToken,
          userState.context.amount,
          userState.context.recipient,
          userState.context.recipientAddress,
        );
      } finally {
        clearUserState(sender.id);
      }
    }
    return `Oops, it looks like there might be a tiny hiccup. Something went wrong with the transfer. Please try again!`;
  }

  private async constructTokenReplyMessage(
    bot: AeWalletBot,
    message: IMessage,
    account: Encoded.AccountAddress,
    token: SelectToken,
    amount: string,
    recipient: string,
    recipientAddress: string,
  ): Promise<string> {
    const transaction: TxParamsAsyncContractCallTx1 = {
      tag: Tag.ContractCallTx,
      callerId: account,
      contractId: token.contractId,
      callData: new AciContractCallEncoder(
        FUNGIBLE_TOKEN_FULL_CONTRACT_ACI,
      ).encodeCall("FungibleTokenFull", "transfer", [
        recipientAddress,
        toShiftedBigNumber(amount, token.decimals),
      ]),
    };

    const rawTx = await bot.aeSdk.buildTx(transaction);

    const signTransactionUrl = await this.constructUnsignedTransactionUrl(
      message.chatId,
      rawTx,
    );

    const balanceAfterTransfer = new BigNumber(token.balance).minus(amount);

    if (balanceAfterTransfer.lt(0)) {
      throw new UserFacingError(
        `Oops, it looks like there might be a tiny hiccup. It appears there are insufficient funds in your wallet. Go and top up your wallet, and then come back and give the command another go!`,
      );
    }

    const recipientInfo = recipient.startsWith("@")
      ? `, wallet address: ${recipientAddress}`
      : "";

    // Construct confirmation message
    const confirmationMessage = `
      <p>👍 Sure thing! Please confirm the transaction through the link provided,
      and I will immediately initiate the transfer to ${recipient}${recipientInfo}:</p>
      <p><a href="${signTransactionUrl}" target="_blank">Confirm Transaction</a> 🔗</p>`;

    return confirmationMessage;
  }

  private async constructUnsignedTransactionUrl(
    chatId: IMessage["chatId"],
    rawTx: Encoded.Transaction,
  ) {
    const walletRequestId = uuid();
    fileStorageProvider.storeValue(
      `Send: ${walletRequestId}`,
      JSON.stringify({ chatId }),
    );

    return generateSignTransactionDeeplinkUrl(
      rawTx,
      `ae-wallet-bot/send/${walletRequestId}`,
    );
  }
}
