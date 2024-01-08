import { INetwork } from "../types";

/**
 * Default `networkId` values returned by the Node after establishing the connection.
 * Nodes returns different values when connecting to the Hyperchains.
 */

enum NETWORK_IDS {
  NETWORK_ID_MAINNET = "ae_mainnet",
  NETWORK_ID_TESTNET = "ae_uat",
}

const COMPILER_URL = "https://compiler.aepps.com";

export const NETWORK_MAINNET: INetwork = {
  url: "https://mainnet.aeternity.io",
  networkId: NETWORK_IDS.NETWORK_ID_MAINNET,
  middlewareUrl: "https://mainnet.aeternity.io/mdw",
  middlewareWebsocketUrl: "wss://mainnet.aeternity.io/mdw/v2/websocket",
  explorerUrl: "https://explorer.aeternity.io",
  compilerUrl: COMPILER_URL,
  name: "Mainnet",
};

export const NETWORK_TESTNET: INetwork = {
  url: "https://testnet.aeternity.io",
  networkId: NETWORK_IDS.NETWORK_ID_TESTNET,
  middlewareUrl: "https://testnet.aeternity.io/mdw",
  middlewareWebsocketUrl: "wss://testnet.aeternity.io/mdw/v2/websocket",
  explorerUrl: "https://explorer.testnet.aeternity.io",
  compilerUrl: COMPILER_URL,
  name: "Testnet",
};

export const NETWORKS = {
  [NETWORK_IDS.NETWORK_ID_MAINNET]: NETWORK_MAINNET,
  [NETWORK_IDS.NETWORK_ID_TESTNET]: NETWORK_TESTNET,
};

export const ACTIVE_NETWORK =
  NETWORKS[process.env.ACTIVE_NETWORK as NETWORK_IDS];
