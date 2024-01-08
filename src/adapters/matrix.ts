import { AutojoinRoomsMixin, MatrixClient, MatrixAuth } from "matrix-bot-sdk";

import { MATRIX_BOT_HOME_SERVER_URL } from "../config";
import { IAccount, IChatEvent, IMessage, ISender } from "../types";
import { fileStorageProvider } from "../utils/storage";
import { cryptoStorageProvider } from "../utils/cryptoStorage";
import { BaseAdapter, BaseAdapterOptions } from "./base";
import {
  setRoomMetadata,
  getRoomMetadata,
  IRoomMetadata,
  IMDirect,
} from "../libs/RoomCache";
import { VerifiedAccounts } from "../backend/VerifiedAccounts";

type MatrixAdapterOptions = BaseAdapterOptions & {
  password?: string;
  accessToken?: string;
};

export class MatrixAdapter extends BaseAdapter {
  client: MatrixClient;
  options: MatrixAdapterOptions;

  constructor(options: MatrixAdapterOptions) {
    super(options);

    if (!("accessToken" in options)) {
      console.warn(
        "No access token provided through environment. Please PERMANENTLY store the access token in an the environment variable.",
      );
    }

    this.options = options;
  }

  async init({ autoJoin }: { autoJoin?: boolean } = { autoJoin: true }) {
    if (!MATRIX_BOT_HOME_SERVER_URL) {
      throw new Error(
        "Matrix home server URL is undefined, please set MATRIX_BOT_HOME_SERVER_URL",
      );
    }

    let accessToken;

    if ("password" in this.options && this.options.password) {
      accessToken = fileStorageProvider.readValue(
        `${this.options.username}_accessToken`,
      );
      if (!accessToken) {
        console.warn("Trying to login with username and password.");
        const authClient = new MatrixAuth(MATRIX_BOT_HOME_SERVER_URL);
        const clientInstance = await authClient.passwordLogin(
          this.options.username,
          this.options.password,
        );
        fileStorageProvider.storeValue(
          `${this.options.username}_accessToken`,
          clientInstance.accessToken,
        );
        accessToken = clientInstance.accessToken;
      }
    } else {
      if (!this.options.accessToken) {
        throw new Error("No access token or password provided");
      }
      accessToken = this.options.accessToken;
    }

    this.client = new MatrixClient(
      MATRIX_BOT_HOME_SERVER_URL,
      accessToken,
      fileStorageProvider,
      cryptoStorageProvider(this.options.username),
    );

    await this.client.start();
    if (autoJoin) {
      AutojoinRoomsMixin.setupOnClient(this.client);
    }

    console.log("MatrixBot started");
    return this.client;
  }

  setupListeners() {
    this.client.on("room.message", async (roomId, event) => {
      if (event["content"]?.["msgtype"] !== "m.text") {
        return;
      }

      const currentUserId = await this.client.getUserId();

      if (event["sender"] === currentUserId) {
        return;
      }

      let messageBody = event["content"]["body"];

      console.info("room.message->event ::", event);
      const taggedAccounts: IAccount[] = [];

      if (event["content"]["formatted_body"]) {
        // parse users using regex
        const users = event["content"]["formatted_body"].match(
          /<a href=".*?">(.*?)<\/a>/g,
        );
        if (users?.length) {
          // map users and extract the name and id that is after /user/@ from the href
          for (const user of users) {
            const [name] = user
              .replace(/<a href=".*?">/, "")
              .replace(/<\/a>/, "")
              .split("/user/@");

            /**
             * need to extract @tsvetan:superhero.com
             * from <a href="https://chat.superhero.com/#/user/@tsvetan:superhero.com">
             */
            const id = user.replace(/<a href=".*?#\/user\//, "").split('">')[0];

            const address = VerifiedAccounts.getVerifiedAccountOrException(id);
            messageBody = messageBody.replace(name, address);

            taggedAccounts.push({
              name,
              id,
              address,
            });
          }
        }
      }

      const roomMetadata = await this.getMetaData(roomId);

      const sender: ISender = {
        id: event["sender"],
        name: event["sender"],
        isDirect: roomMetadata.isDirect,
      };

      const message: IMessage = {
        chatId: roomId,
        text: messageBody,
        taggedAccounts,
        roomName: roomMetadata.roomName,
      };

      const reply = await this.bot.onMessage(sender, message);

      if (reply) {
        await this.client.replyHtmlNotice(roomId, event, reply);
      }
    });

    this.client.on("room.join", async (roomId: string, event: IChatEvent) => {
      // save meta data
      const metaData = await this.getMetaData(roomId);

      const reply = await this.bot.onRoomJoin(roomId, event, metaData);
      if (reply) {
        await this.client.replyHtmlText(roomId, event, reply);
      }
    });

    this.client.on("room.leave", async (roomId: string) => {
      fileStorageProvider.storeValue(`Room: ${roomId}`, "");
    });

    console.log("Matrix event listeners setup complete");
  }

  async sendMessage(text: string, chatId: string) {
    void (await this.client.sendHtmlText(chatId, text));
  }

  async getMetaData(roomId: string): Promise<IRoomMetadata> {
    let roomMetadata: IRoomMetadata | undefined = getRoomMetadata(roomId);

    // fixme checking for room name here this is a migration for old metadata
    if (!roomMetadata || (!roomMetadata.isDirect && !roomMetadata.roomName)) {
      const directRooms =
        await this.client.getAccountData<IMDirect>("m.direct");
      const isDirect = Object.values(directRooms).some((rooms) =>
        rooms.includes(roomId),
      );
      const roomNameStateEvent = await this.client
        .getRoomStateEvent(roomId, "m.room.name", "")
        .catch(() => undefined);

      roomMetadata = {
        isDirect,
        roomName: roomNameStateEvent?.name,
      };
      setRoomMetadata(roomId, roomMetadata);
    }

    return roomMetadata;
  }
}
