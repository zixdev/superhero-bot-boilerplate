import { AutojoinRoomsMixin, MatrixAuth, MatrixClient } from "matrix-bot-sdk";
import OpenAI from 'openai';

import { VerifiedAccounts } from "../backend/VerifiedAccounts";
import {
  MATRIX_BOT_HOME_SERVER_URL,
  OPENAI_API_KEY
} from "../config";
import {
  getRoomMetadata,
  IMDirect,
  IRoomMetadata,
  setRoomMetadata,
} from "../libs/RoomCache";
import { IAccount, IChatEvent, IMessage, ISender } from "../types";
import { cryptoStorageProvider } from "../utils/cryptoStorage";
import { fileStorageProvider } from "../utils/storage";
import { BaseAdapter, BaseAdapterOptions } from "./base";

type MatrixAdapterOptions = BaseAdapterOptions & {
  password?: string;
  accessToken?: string;
};

export class MatrixAdapter extends BaseAdapter {
  client: MatrixClient;
  options: MatrixAdapterOptions;
  openAI: OpenAI;

  constructor(options: MatrixAdapterOptions) {
    super(options);

    if (!("accessToken" in options)) {
      console.warn(
        "No access token provided through environment. Please PERMANENTLY store the access token in an the environment variable.",
      );
    }
   
    this.openAI = new OpenAI({
      apiKey: OPENAI_API_KEY,
    })

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
      this.client.setTyping(roomId, true);

      /**
       * store the thread id with the room id
       */
      let threadId = await fileStorageProvider.readValue(`Thread: ${roomId}`)

      if (!threadId) {
        const thread = await this.openAI.beta.threads.create({
          metadata: {
            roomId: roomId,
          },
        })
        console.log('===========')
        console.log('CREATED NEW THREAD')
        console.log('===========')
        console.log('===========')
        threadId = thread.id
        fileStorageProvider.storeValue(`Thread: ${roomId}`, threadId)
      }

      console.log('messageBody::', messageBody)
      await this.openAI.beta.threads.messages.create(
        threadId,
        {
          role: 'user',
          content: messageBody,
        },
      )

      const assistant = {
        id: 'asst_KS0vuSbKlM0WaifuNCLvEudY'
      }

      const tools = Object.values(this.bot.commands).map((command) => {
        return {
          type: 'function',
          function: {
            name: command.name,
            description: command.description,
            parameters: {
              type: 'object',
              properties: command.getArguments().reduce((acc, arg) => {
                acc[arg.name] = {
                  type: 'string',
                  description: arg.description,
                  // required: arg.required,
                  // example: arg.example,
                }
                return acc
              }, {})
            },
          }
        }
      });

      let run = await this.openAI.beta.threads.runs.createAndPoll(
        threadId,
        {
          assistant_id: assistant.id,
          instructions: `
          You're Superhero Wallet Bot, you help people understanding more information about aeternity, and get information about their balances
          `,
          tools,
        }
      );

      if (run.status === 'completed') {
        const messages = await this.openAI.beta.threads.messages.list(
          run.thread_id,
          {
            order: 'desc',
            limit: 1,
          }
        );
        for (const message of messages.data.reverse()) {
          console.log('AI REPLU::', JSON.stringify(message, null, 2))
          console.log(`${message.role} > ${message.content[0].text.value}`);
          this.client.replyText(roomId, event, message.content[0].text.value);
          break;
        }
      } else if (run.status === 'requires_action' && run.required_action) {
        const tool_calls = run.required_action.submit_tool_outputs.tool_calls;


        const tool_outputs = []
        for (const tool_call of tool_calls) {
          const args = JSON.parse(tool_call.function.arguments);

          const reply = await this.bot.commands[tool_call.function.name].handle(
            this.bot,
            sender,
            message,
            args,
            {}
          )

          if (reply) {
            await this.client.replyHtmlNotice(roomId, event, reply);
          }
          tool_outputs.push({
            tool_call_id: tool_call.id,
            output: reply
          })


          console.log('BOT REPLY::', reply)
        }
        await this.openAI.beta.threads.runs.submitToolOutputsAndPoll(
          threadId,
          run.id,
          {
            tool_outputs
          },
        );
        // close run
        // run = await this.openAI.beta.threads.runs.complete(run.id);
      } else {
        console.log('=============');
        console.log(run.status);
        console.log('run', JSON.stringify(run, null, 2));
      }

      this.client.setTyping(roomId, false);

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
