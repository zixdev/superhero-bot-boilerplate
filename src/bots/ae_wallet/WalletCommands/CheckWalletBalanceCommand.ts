import { AeWalletBot } from "..";
import { PROTOCOL_AETERNITY, DEFAULT_CURRENCY_CODE } from "../../../constants";
import {
  IBotCommandArguments,
  ISender,
  IMessage,
  CurrencyCode,
  Steps,
} from "../../../types";
import { BotCommand } from "../../@base";
import { VerifiedAccounts } from "../../../backend/VerifiedAccounts";

import { AE_AMOUNT_FORMATS } from "@aeternity/aepp-sdk";
import { UserState } from "../../../libs/UserState";
import {
  getTokenBalanceAndSymbolOrPrepareSelection,
  handleSelectOption,
} from "../../../utils/selectToken";
import { UserFacingError } from "../../../utils/errors";

class CheckWalletBalanceError extends UserFacingError {
  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, UserFacingError.prototype);
  }
}

export class CheckWalletBalanceCommand extends BotCommand {
  name: string = "balance";
  description: string = "Check your wallet balance";
  usageContext = {
    dm: true,
    room: false,
  };

  getArguments(): IBotCommandArguments[] {
    return [
      {
        name: "token",
        required: false,
        description: "The token you want to check the balance of",
      },
    ];
  }

  getOptions(): IBotCommandArguments[] {
    return [
      {
        name: "currency",
        required: false,
        description: "The currency you want to get the balance formatted in",
        example: "usd",
      },
    ];
  }

  async handle(
    bot: AeWalletBot,
    sender: ISender,
    _message: IMessage,
    args: Record<string, string>,
    options: Record<string, string>,
  ): Promise<string> {
    const address = VerifiedAccounts.getVerifiedAccountOrException(
      sender.id.toString(),
    );

    const handleAsAe =
      !args.token ||
      args.token.toLowerCase() === "ae" ||
      args.token.toLowerCase() === "aeternity";

    const { balance, symbol } = handleAsAe
      ? {
          balance: await bot.aeSdk.getBalance(address, {
            format: AE_AMOUNT_FORMATS.AE,
          }),
          symbol: "AE",
        }
      : await getTokenBalanceAndSymbolOrPrepareSelection(
          address,
          args.token,
          sender.id.toString(),
          this.name,
        );

    const currency: CurrencyCode = (options.currency ||
      DEFAULT_CURRENCY_CODE) as CurrencyCode;

    const fiatText = handleAsAe
      ? await bot.priceRatesHelper.getFormattedFiat(
          balance,
          PROTOCOL_AETERNITY,
          currency,
        )
      : "";

    return `Your wallet balance is: ${balance} ${symbol}\n${fiatText}`;
  }

  async handleStep(
    _bot: AeWalletBot,
    _sender: ISender,
    message: IMessage,
    userState: UserState,
  ): Promise<string> {
    if (userState.step === Steps.TOKEN_SELECT_AWAITING_USER_CHOICE) {
      const selectedToken = handleSelectOption<{
        balance: string;
        symbol: string;
      }>(message, userState);
      return `Your wallet balance is: ${selectedToken.balance} ${selectedToken.symbol}`;
    }

    throw new CheckWalletBalanceError(
      "Oops, it looks like there might be a tiny hiccup. Something went wrong with the balance check. Please try again!",
    );
  }
}
