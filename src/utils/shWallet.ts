import { Encoded } from "@aeternity/aepp-sdk";
import { ACTIVE_NETWORK } from "../constants";

export function generateSignTransactionDeeplinkUrl(
  rawTx: Encoded.Transaction,
  callbackPath: string,
) {
  const query = new URLSearchParams({
    transaction: rawTx,
    networkId: ACTIVE_NETWORK.networkId,
    broadcast: "true",
  });

  return `https://wallet.superhero.com/sign-transaction?${query.toString()}&x-success=${encodeURIComponent(
    `${process.env.BACKEND_CALLBACK_BASE_URL}/${callbackPath}`,
  )}`;
}
