import {
  AeSdk,
  Contract,
  ContractMethodsBase,
  generateKeyPair,
  MemoryAccount,
  Node,
} from "@aeternity/aepp-sdk";
import { fileStorageProvider } from "../utils/storage";
import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import BYTECODE_HASHES from "superhero-bot-contracts/generated/bytecode_hashes.json";
import ACCOUNT_VERIFICATION_CONTRACT_ACI from "superhero-bot-contracts/generated/AccountVerification.aci.json";
import { ACTIVE_NETWORK, NETWORK_MAINNET, NETWORK_TESTNET } from "../constants";
import FUNGIBLE_TOKEN_FULL_ACI from "aeternity-fungible-token/generated/FungibleTokenFull.aci.json";

class BaseContract {
  protected contract: Contract<ContractMethodsBase>;
  constructor(contract: Contract<ContractMethodsBase>) {
    this.contract = contract;
  }

  get contractId(): Encoded.ContractAddress {
    return this.contract.$options.address!;
  }
}

type MetaInfo = {
  name: string;
  symbol: string;
  decimals: bigint;
};

class Aex9Token extends BaseContract {
  private metaInfo: MetaInfo;

  public async getBalance(address: Encoded.AccountAddress) {
    return this.contract
      .balance(address)
      .then(
        ({ decodedResult }) =>
          (decodedResult as bigint | undefined) || BigInt(0),
      );
  }

  public async getMetaInfo() {
    if (this.metaInfo) {
      return this.metaInfo;
    }

    const metaInfo = await this.contract
      .meta_info()
      .then(({ decodedResult }) => decodedResult as MetaInfo);
    this.metaInfo = metaInfo;
    return metaInfo;
  }

  public async getSupply() {
    return this.contract
      .total_supply()
      .then(({ decodedResult }) => decodedResult as bigint);
  }

  public async getAllowance(
    from: Encoded.AccountAddress,
    to: Encoded.AccountAddress,
  ) {
    return this.contract
      .allowance({
        from_account: from,
        for_account: to,
      })
      .then(({ decodedResult }) => decodedResult as bigint | undefined);
  }
}

export type VerifiedAccountsMap = Map<string, Encoded.AccountAddress>;

class AeVerifiedAccounts extends BaseContract {
  public async getAllVerifiedAccounts() {
    return this.contract
      .verified_accounts()
      .then(({ decodedResult }) => decodedResult as VerifiedAccountsMap);
  }

  public async getVerifiedAccount(matrixUserId: string) {
    return this.contract
      .get_verified_account(matrixUserId)
      .then(({ decodedResult }) => decodedResult as Encoded.AccountAddress);
  }
}

export default class Aeternity {
  private static aeSdk: AeSdk;
  private static _verifiedAccounts: AeVerifiedAccounts;
  private static _aex9TokenMap: Map<Encoded.ContractAddress, Aex9Token> =
    new Map();

  static async init() {
    let botAccountSecretKey = fileStorageProvider.readValue(
      "botAccountSecretKey",
    );
    if (!botAccountSecretKey) {
      botAccountSecretKey = generateKeyPair().secretKey;
      fileStorageProvider.storeValue(
        "botAccountSecretKey",
        botAccountSecretKey,
      );
    }

    this.aeSdk = new AeSdk({
      accounts: [new MemoryAccount(botAccountSecretKey)],
      nodes: [
        {
          name: NETWORK_MAINNET.networkId,
          instance: new Node(NETWORK_MAINNET.url),
        },
        {
          name: NETWORK_TESTNET.networkId,
          instance: new Node(NETWORK_TESTNET.url),
        },
      ],
    });

    console.log("sdk address", this.aeSdk.address);

    this.aeSdk.selectNode(ACTIVE_NETWORK.networkId);

    return this.aeSdk;
  }

  public static async aex9Token(contractId: Encoded.ContractAddress) {
    if (this._aex9TokenMap.has(contractId)) {
      return this._aex9TokenMap.get(contractId)!;
    }

    const contract = await this.aeSdk.initializeContract({
      aci: FUNGIBLE_TOKEN_FULL_ACI,
      address: contractId,
    });

    if (!contract.$options.address) {
      throw new Error("Contract not initialized");
    }

    const aex9Token = new Aex9Token(contract);
    this._aex9TokenMap.set(contractId, aex9Token);
    return aex9Token;
  }

  public static async verifiedAccounts() {
    if (this._verifiedAccounts) {
      return this._verifiedAccounts;
    }

    let accountVerificationContractAddress = fileStorageProvider.readValue(
      "accountVerificationContractAddress",
    );

    let contract: Contract<ContractMethodsBase>;

    if (accountVerificationContractAddress) {
      contract = await this.aeSdk.initializeContract({
        aci: ACCOUNT_VERIFICATION_CONTRACT_ACI,
        address: accountVerificationContractAddress as Encoded.ContractAddress,
      });
    } else {
      contract = await this.aeSdk.initializeContract({
        aci: ACCOUNT_VERIFICATION_CONTRACT_ACI,
        bytecode: BYTECODE_HASHES["7.4.0"]["AccountVerification.aes"]
          .bytecode as Encoded.ContractBytearray,
      });

      await contract.init();
      if (!contract.$options.address)
        throw new Error("Account Verification Contract not initialized");
      fileStorageProvider.storeValue(
        "accountVerificationContractAddress",
        contract.$options.address,
      );
    }

    console.log(
      "initialized account verification contract",
      contract.$options.address,
    );

    this._verifiedAccounts = new AeVerifiedAccounts(contract);
    return this._verifiedAccounts;
  }
}
