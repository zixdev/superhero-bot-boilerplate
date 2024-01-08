import { PROTOCOLS } from "../constants/common";

/**
 * Blockchain protocol slug name
 */
export type Protocol = (typeof PROTOCOLS)[number];

export type ProtocolRecord<T = any> = Partial<Record<Protocol, T>>;
