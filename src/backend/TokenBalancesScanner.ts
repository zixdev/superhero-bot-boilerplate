import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import { BigNumber } from "bignumber.js";
import Aeternity from "./Aeternity";
import Middleware from "./Middleware";
import { Aex9TokenInformation } from "../types";

export class TokenBalancesScanner {
  static async fetchOwnedTokenList(
    account: Encoded.AccountAddress,
  ): Promise<Aex9TokenInformation[]> {
    const tokenBalances = await Middleware.fetchAex9AccountBalances(account);

    return tokenBalances
      ? tokenBalances.map(
          (tokenBalance) =>
            ({
              contractId: tokenBalance.contract_id,
              symbol: tokenBalance.token_symbol,
              balance: new BigNumber(tokenBalance.amount),
              decimals: BigInt(tokenBalance.decimals),
            }) as Aex9TokenInformation,
        )
      : [];
  }

  static async getAEX9TokenInformation(
    account: Encoded.AccountAddress,
    tokenAddress?: Encoded.ContractAddress,
  ): Promise<Aex9TokenInformation[]> {
    if (tokenAddress) {
      const balance = await Aeternity.aex9Token(tokenAddress).then((token) =>
        token.getBalance(account),
      );

      const { symbol, decimals } = await Aeternity.aex9Token(tokenAddress).then(
        (token) => token.getMetaInfo(),
      );

      return [
        {
          contractId: tokenAddress,
          symbol: symbol,
          decimals,
          balance: new BigNumber(balance.toString()),
        } as Aex9TokenInformation,
      ];
    }

    return TokenBalancesScanner.fetchOwnedTokenList(account);
  }
}
