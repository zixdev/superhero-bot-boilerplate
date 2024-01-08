import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import { NoVerifiedAccountError } from "../utils/errors";
import Aeternity, { VerifiedAccountsMap } from "./Aeternity";

export class VerifiedAccounts {
  // in-memory lookup cache for verified accounts, kept up to date for new accounts from verification callback or on restart
  private static verifiedAccounts: VerifiedAccountsMap = new Map();
  private static verificationInterval: NodeJS.Timeout;

  static async init() {
    if (this.verificationInterval) {
      clearInterval(this.verificationInterval);
    }
    // set interval
    this.verificationInterval = setInterval(
      () => this.updateVerifiedAccounts(),
      1000 * 60 * 5, // every 5 minutes
    );

    await this.updateVerifiedAccounts();
  }

  private static async updateVerifiedAccounts() {
    this.addVerifiedAccounts(
      await Aeternity.verifiedAccounts().then((c) =>
        c.getAllVerifiedAccounts(),
      ),
    );
  }

  private static async addVerifiedAccounts(accounts: VerifiedAccountsMap) {
    accounts.forEach((account: Encoded.AccountAddress, userId: string) => {
      this.verifiedAccounts.set(userId, account);
    });

    console.log("verifiedAccountsAdded", accounts);
  }

  static async verifyAndAddAccount(
    senderId: string,
    address: Encoded.AccountAddress,
  ) {
    const verifiedAccount = await Aeternity.verifiedAccounts().then((c) =>
      c.getVerifiedAccount(senderId),
    );

    if (verifiedAccount === address) {
      await this.addVerifiedAccounts(new Map([[senderId, address]]));
    }
  }

  static getVerifiedAccountOrException(userId: string): Encoded.AccountAddress {
    const account = this.getVerifiedAccountOrUndefined(userId);
    if (!account) throw new NoVerifiedAccountError();
    return account;
  }

  static getVerifiedAccountOrUndefined(userId: string) {
    return this.verifiedAccounts.get(userId);
  }

  static async removeVerifiedAccount(userId: string) {
    this.verifiedAccounts.delete(userId);
  }

  static getVerifiedAccounts(filterAccounts: string[] = []) {
    if (filterAccounts.length > 0) {
      return Object.fromEntries(
        Array.from(this.verifiedAccounts).filter(([userId]) =>
          filterAccounts.includes(userId),
        ),
      );
    }
    return Object.fromEntries(this.verifiedAccounts);
  }
}
