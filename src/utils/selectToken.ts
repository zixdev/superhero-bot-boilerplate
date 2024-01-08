import { IMessage, Steps } from "../types";
import { setUserState, UserState } from "../libs/UserState";
import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import { TokenBalancesScanner } from "../backend/TokenBalancesScanner";
import {
  MultipleTokensFoundError,
  NoTokenFoundError,
  UserFacingError,
} from "./errors";
import { toTokenDecimals } from "./aeternity";

export interface SelectToken {
  symbol: string;
  balance: string; // balance is already shifted to decimals
  decimals: number;
  contractId: Encoded.ContractAddress;
}

export function handleSelectOption<T>(
  message: IMessage,
  userState: UserState,
): T {
  const selectedOption = Number(message.text);
  if (!Number.isFinite(selectedOption)) {
    throw new UserFacingError(
      "Oops! It looks like you didn't enter a number. Please try again by entering the number of your choice",
    );
  }

  const { options } = userState.context;

  if (selectedOption < 1 || selectedOption > options.length) {
    throw new UserFacingError(
      "Oops! It looks like you entered a number that is not in the list. Please try again by entering the number of your choice",
    );
  }

  return options[selectedOption - 1];
}

export async function getTokenBalanceAndSymbolOrPrepareSelection(
  address: Encoded.AccountAddress,
  token: string,
  userId: string,
  command: string,
  additionalUserStateContext: Record<string, any> = {},
): Promise<SelectToken> {
  const tokenBalances =
    await TokenBalancesScanner.getAEX9TokenInformation(address);

  const filteredTokenList: SelectToken[] = tokenBalances
    .filter(({ symbol }) => symbol.toLowerCase() === token.toLowerCase())
    .map(({ symbol, decimals, balance, contractId }) => ({
      balance: toTokenDecimals(balance.toString(), BigInt(decimals), BigInt(0)),
      symbol,
      decimals: Number(decimals),
      contractId,
    }));

  if (filteredTokenList.length === 1) {
    return filteredTokenList[0];
  } else if (filteredTokenList.length === 0) throw new NoTokenFoundError();
  else {
    setUserState(userId, command, Steps.TOKEN_SELECT_AWAITING_USER_CHOICE, {
      options: filteredTokenList,
      ...additionalUserStateContext,
    });
    throw new MultipleTokensFoundError(filteredTokenList, token);
  }
}
