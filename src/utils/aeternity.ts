import BigNumber from "bignumber.js";

export function toShiftedBigNumber(
  value: number | string | BigNumber,
  precision: number | bigint,
): BigNumber {
  return new BigNumber(value).shiftedBy(Number(precision));
}

export function toTokenDecimals(
  count: bigint | string | number,
  denominationDecimals: bigint,
  decimals: bigint,
) {
  return new BigNumber(count.toString())
    .shiftedBy(Number(-denominationDecimals) - Number(-decimals))
    .toFixed();
}
