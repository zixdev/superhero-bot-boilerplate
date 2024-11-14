import OpenAI from "openai";
import { FunctionTool } from "openai/resources/beta/assistants";
import { RunCreateParamsNonStreaming } from "openai/resources/beta/threads/runs/runs";
import { VerifiedAccounts } from "../../backend/VerifiedAccounts";
import { OPENAI_API_KEY } from "../../config";
import { IMessage, ISender } from "../../types";
import { fileStorageProvider } from "../../utils/storage";
import { BaseBot, BaseBotOptions } from "./BaseBot";

export abstract class OpenAIAssistantBot extends BaseBot {
  openAI: OpenAI;

  assistantId: string;
  assistantInstructions: string;


  constructor(options: BaseBotOptions) {
    super(options);
    this.openAI = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
  }

  getAssistantTools(): Array<FunctionTool> {
    return Object.values(this.commands).map((command) => {
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
              }
              return acc
            }, {})
          },
        }
      } as FunctionTool;
    })
  }

  async getAssistant(senderAddress?: string): Promise<RunCreateParamsNonStreaming> {
    let instructions = this.assistantInstructions;
    if (senderAddress) {
      instructions += ` Sender Wallet Address: ${senderAddress}`;
    }
    return {
      assistant_id: this.assistantId,
      instructions,
      tools: this.getAssistantTools(),
    };
  }

  async getRoomThreadId(roomId: number | string): Promise<string> {
    let threadId = await fileStorageProvider.readValue(`Thread: ${roomId}`)

    if (threadId) {
      return threadId;
    }

    /**
     * TODO: try to get the thread by metadata
     */
    const thread = await this.openAI.beta.threads.create({
      metadata: {
        roomId: roomId,
      },
    })
    threadId = thread.id
    fileStorageProvider.storeValue(`Thread: ${roomId}`, threadId)

    return threadId;
  }

  async onMessage(
    sender: ISender, 
    message: IMessage, 
    onReply = (reply: string) => reply,
    onTyping = (isTyping: boolean) => {},
  ): Promise<string | null> {
    const senderWalletAddress = VerifiedAccounts.getVerifiedAccountOrUndefined(
      sender.id.toString(),
    );
    const threadId = await this.getRoomThreadId(message.chatId);
    const assistant = await this.getAssistant(
      senderWalletAddress,
    );
    await this.openAI.beta.threads.messages.create(
      threadId,
      {
        role: 'user',
        content: message.text,
      },
    );
    const isBotMentioned = this.chatAdapters.some((adapter: any) =>
      message.taggedAccounts?.some((account) =>
        adapter.options.username === account.name
      )
    );
    if (!sender.isDirect && !isBotMentioned) {
      return null;
    }
    onTyping?.(true);
    const run = await this.openAI.beta.threads.runs.createAndPoll(
      threadId,
      assistant,
    );

    if (run.status === 'completed') {
      const messages = await this.openAI.beta.threads.messages.list(
        run.thread_id,
        {
          order: 'desc',
          limit: 1,
        }
      );
      for (const reply of messages.data.reverse()) {
        console.log('AI REPLU::', JSON.stringify(reply, null, 2))
        console.log(`${reply.role} > ${reply.content[0].text.value}`);
        onReply(
          reply.content[0].text.value
        );
        break;
      }
    } else if (run.status === 'requires_action' && run.required_action) {
      const tool_calls = run.required_action.submit_tool_outputs.tool_calls;


      const tool_outputs = []
      for (const tool_call of tool_calls) {
        const args = JSON.parse(tool_call.function.arguments);

        let reply = null;
        try {
          reply = await this.commands[tool_call.function.name].handle(
            this,
            sender,
            message,
            args,
            {}
          )
        } catch (error) {
          reply = error.message;
        }
        if (reply) {
          await onReply(reply);
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
    } else {
      console.log('=============');
      console.log(run.status);
      console.log('run', JSON.stringify(run, null, 2));
    }
    onTyping?.(false);
    return null
  }
}
