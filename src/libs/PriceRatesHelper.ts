import { COIN_GECKO_API_URL } from "../config";
import {
  CURRENCIES,
  DEFAULT_CURRENCY_CODE,
  PROTOCOL_AETERNITY,
} from "../constants";
import { CurrencyCode, CurrencyRates, Protocol } from "../types";
import { formatCurrency } from "../utils/currencies";
import { fetchJson } from "../utils/utils";
import BigNumber from "bignumber.js";

/**
 * @link https://www.coingecko.com/pl/api/documentation
 */
export class PriceRatesHelper {
  prices: Record<Protocol, CurrencyRates> = {} as any;

  async preloadProtocolRates(protocol: Protocol): Promise<void> {
    const data = await this.fetchCoinCurrencyRates(protocol);

    if (data) {
      this.prices[protocol] = data;
    }
  }

  /**
   *
   * @param amount
   * @param protocol
   * @param currency
   * @returns Selected protocol coin converted to currency fiat
   */
  async getFiat(
    amount: string,
    protocol: Protocol = PROTOCOL_AETERNITY,
    currency: CurrencyCode = DEFAULT_CURRENCY_CODE,
  ): Promise<number> {
    if (!this.prices[protocol] || !this.prices[protocol][currency]) {
      await this.preloadProtocolRates(protocol);
    }

    const currencyRate = this.prices[protocol][currency];
    const value = new BigNumber(amount).times(currencyRate);

    return value.toNumber();
  }

  async getFormattedFiat(
    amount: string,
    protocol: Protocol = PROTOCOL_AETERNITY,
    currency: CurrencyCode = DEFAULT_CURRENCY_CODE,
  ): Promise<string> {
    const fiat = await this.getFiat(amount, protocol, currency);
    return formatCurrency(fiat, currency);
  }

  /**
   * Obtain all the coin rates for the currencies used in the app.
   */
  async fetchCoinCurrencyRates(coinId: string): Promise<CurrencyRates | null> {
    try {
      return (
        (await this.fetchFromApi("/simple/price", {
          ids: coinId,
          vs_currencies: CURRENCIES.map(({ code }) => code).join(","),
        })) as any
      )[coinId];
    } catch (error) {
      return null;
    }
  }

  async fetchFromApi(
    path: string,
    searchParams: Record<string, string>,
  ): Promise<any> {
    const query = new URLSearchParams(searchParams).toString();

    return fetchJson(`${COIN_GECKO_API_URL}${path}?${query}`);
  }
}
