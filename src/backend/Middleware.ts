import { ACTIVE_NETWORK } from "../constants";
import { Encoded } from "@aeternity/aepp-sdk";

type Aex9TokenBalance = {
  amount: number;
  contract_id: string;
  token_symbol: string;
  decimals: number;
};

export default class Middleware {
  // fetches all pages for mdw paginated result, concatenating data
  static async iterateMdw<T>(next: string): Promise<T[] | undefined> {
    const url = `${ACTIVE_NETWORK.middlewareUrl}${next}`;
    const result = await fetch(url).then(
      (res) => res.json() as Promise<{ next: string; data: any }>,
    );

    if (result.next) {
      return result.data.concat(await this.iterateMdw(result.next));
    }

    return result.data;
  }

  static async fetchAex9AccountBalances(account: Encoded.AccountAddress) {
    return this.iterateMdw<Aex9TokenBalance>(
      `/v2/aex9/account-balances/${account}`,
    );
  }
}
