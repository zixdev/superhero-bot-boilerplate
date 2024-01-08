import { DEFAULT_LOCALE } from "../constants";
import { CurrencyCode } from "../types";

/**
 * @returns value formatted as a currency according to DEFAULT_LOCALE
 *   eg.: "23 789,98 £", "$ 25.269,00"
 */
export function formatCurrency(value: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currencyDisplay: "narrowSymbol",
    currency,
  }).format(value);
}
