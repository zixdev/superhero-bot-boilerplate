import {
  NETWORKS,
  NETWORK_TYPE_MAINNET,
  NETWORK_TYPE_TESTNET,
} from "../constants";
import { Protocol } from "../types";

export type NetworkTypeDefault =
  | typeof NETWORK_TYPE_MAINNET
  | typeof NETWORK_TYPE_TESTNET;

/**
 * List of required network settings for each of the protocols
 */
export type NetworkProtocolSettingsRequired = "nodeUrl";

/**
 * Every protocol besides the required settings can have it's own set of settings.
 * By default it's just a dictionary, but for the protocol-specific situations
 * we can narrow the list by pass the a list of the property names.
 */
export type INetworkProtocolSettings<T extends string = string> = Record<
  NetworkProtocolSettingsRequired,
  string
> &
  Record<T, string>;

export type NetworkProtocolsSettings = Record<
  Protocol,
  INetworkProtocolSettings
>;

export interface IAdapterNetworkSetting<T = string> {
  key: T;
  /**
   * Value used to fill the empty input when creating new custom network.
   */
  defaultValue?: string;
  getPlaceholder: () => string;
  getLabel: () => string;
  /**
   * Value used in automated tests. Remember to update the test cases when changing it.
   */
  testId?: string;
  required?: boolean;
}

export type AdapterNetworkSettingList<T = string> = IAdapterNetworkSetting<
  T | NetworkProtocolSettingsRequired
>[];

export type IDefaultNetworkTypeData<T = any> = Record<NetworkTypeDefault, T>;

export type INetworkTypeProtocolDefaultSettings<T extends string = string> =
  IDefaultNetworkTypeData<INetworkProtocolSettings<T>>;

export interface INetwork {
  url: string;
  name: string;
  middlewareUrl: string;
  middlewareWebsocketUrl: string;
  explorerUrl: string;
  networkId: string;
  compilerUrl: string;
  index?: number;
}

export type INetworkTypes = keyof typeof NETWORKS;
