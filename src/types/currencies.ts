export type CurrencyCode =
  | "usd"
  | "eur"
  | "aud"
  | "brl"
  | "cad"
  | "chf"
  | "cny"
  | "czk"
  | "dkk"
  | "gbp"
  | "hkd"
  | "huf"
  | "idr"
  | "ils"
  | "inr"
  | "jpy"
  | "krw"
  | "mxn"
  | "myr"
  | "nok"
  | "nzd"
  | "php"
  | "pln"
  | "rub"
  | "sek"
  | "sgd"
  | "thb"
  | "try"
  | "zar"
  | "xau";

export interface ICurrency {
  name: string;
  code: CurrencyCode;
  symbol: string;
}

export type CurrencyRates = Record<CurrencyCode, number>;
