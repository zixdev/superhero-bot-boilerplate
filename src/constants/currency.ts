import { CurrencyCode, ICurrency } from "../types";

export const DEFAULT_CURRENCY_CODE: CurrencyCode = "usd";

export const CURRENCIES: ICurrency[] = [
  {
    name: "United States Dollar",
    code: "usd",
    symbol: "$",
  },
  {
    name: "Euro",
    code: "eur",
    symbol: "€",
  },
  {
    name: "Australia Dollar",
    code: "aud",
    symbol: "AU$",
  },
  {
    name: "Brasil Real",
    code: "brl",
    symbol: "R$",
  },
  {
    name: "Canada Dollar",
    code: "cad",
    symbol: "CA$",
  },
  {
    name: "Swiss Franc",
    code: "chf",
    symbol: "CHF",
  },
  {
    name: "United Kingdom Pound",
    code: "gbp",
    symbol: "£",
  },
  {
    name: "Gold Ounce",
    code: "xau",
    symbol: "XAU",
  },
];
