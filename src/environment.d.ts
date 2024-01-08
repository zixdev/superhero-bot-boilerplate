declare namespace NodeJS {
  export interface ProcessEnv {
    MATRIX_BOT_HOME_SERVER_URL?: string;
    MATRIX_WALLET_BOT_ACCESS_TOKEN?: string;
    MATRIX_WALLET_BOT_USERNAME?: string;
    MATRIX_WALLET_BOT_PASSWORD?: string;
    BOT_STORAGE_FILE?: string;
    BOT_ENCRYPTION_DIR?: string;
    ACTIVE_NETWORK?: string;
    BACKEND_CALLBACK_BASE_URL?: string;
  }
}
