export interface IAccount {
  id: string;
  address?: string;
  name: string;
}

export interface ISender {
  id: number | string;
  name: string;
  isDirect: boolean;
}

/**
 * Steps in multi-interaction stateful conversations.
 */
export enum Steps {
  TOKEN_SELECT_AWAITING_USER_CHOICE = "TOKEN_SELECT_AWAITING_USER_CHOICE",
}

export interface IMessage {
  chatId: number | string;
  text: string;
  taggedAccounts?: IAccount[];
  step?: Steps;
  roomName?: string;
}

export interface IBotCommandArguments {
  name: string;
  required: boolean;
  description?: string;
  isFixed?: boolean;
  example?: string;
  enum?: string[];
}

export interface IChatEvent {
  content: {
    displayname: string;
    membership: string;
  };
  origin_server_ts: number;
  sender: string;
  state_key: string;
  type: string;
  unsigned?: {
    replaces_state: string;
    prev_content?: {
      displayname: string;
      is_direct?: boolean;
      membership: string;
    };
    prev_sender: string;
    age: number;
  };
  event_id: string;
}
