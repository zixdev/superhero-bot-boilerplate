import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";

export class UserFacingError extends Error {
  constructor(userFacingMessage: string) {
    super(userFacingMessage);

    Object.setPrototypeOf(this, UserFacingError.prototype);
  }
}

export class NoVerifiedAccountError extends UserFacingError {
  constructor() {
    super(
      "Uh-oh! It seems like you missed out on something important - your wallet connection! \n" +
        'To connect your wallet, please use this format: /connect “your wallet address"',
    );

    Object.setPrototypeOf(this, NoVerifiedAccountError.prototype);
  }
}

export class NoTokenFoundError extends UserFacingError {
  constructor() {
    super(
      "Hmm.. I'm having trouble recognizing the token symbol you entered, are you sure you have that specific token in your wallet? Please double check and try again.",
    );

    Object.setPrototypeOf(this, NoTokenFoundError.prototype);
  }
}

export class MultipleTokensFoundError extends UserFacingError {
  constructor(
    tokenListInaction: {
      symbol: string;
      balance: string;
      contractId: Encoded.ContractAddress;
    }[],
    token: string,
  ) {
    super(
      `I see you own multiple ${token} tokens in your Superhero Wallet. Please reply with the number of the option you want to transfer from:
      ${tokenListInaction
        .map(
          ({ contractId, symbol }) => `${symbol} ${contractId}`,
        )
        .join("")}`,
    );


    Object.setPrototypeOf(this, NoTokenFoundError.prototype);
  }
}
