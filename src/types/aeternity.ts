import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import BigNumber from "bignumber.js";

export type Aex9TokenInformation = Aex9BasicTokenInformation & {
  balance: BigNumber;
  decimals: bigint;
};

type Aex9BasicTokenInformation = {
  contractId: Encoded.ContractAddress;
  symbol: string;
};
