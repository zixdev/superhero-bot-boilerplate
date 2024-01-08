import { BaseBot } from "./BaseBot";
import { IBotCommandArguments, IMessage, ISender } from "../../types";
import { UserState } from "../../libs/UserState";

export abstract class BotCommand {
  /**
   * The name and signature of the console command.
   *
   * @var string
   */
  name: string;

  /**
   * The console command description.
   *
   * @var string
   */
  description: string;

  /**
   * If the argument error is handled by the base class or passed to the handle method
   *
   * @var string
   */
  handleArgumentError: boolean = true;

  usageContext: {
    dm: boolean;
    room: boolean | string; // can be boolean or prefix
  } = {
    dm: true,
    room: true,
  };

  /**
   * Get the console command arguments.
   *
   * @return array
   */
  abstract getArguments(): Array<IBotCommandArguments>;

  /**
   * Get the console command arguments.
   *
   * @return array
   */
  getOptions(): Array<IBotCommandArguments> {
    return [
      {
        name: "help",
        required: false,
        description: "Display this help message",
      },
    ];
  }

  async handleCommand(
    bot: BaseBot,
    sender: ISender,
    message: IMessage,
  ): Promise<string | undefined> {
    if (!this.isValidContext(bot, sender, message)) {
      return;
    }

    if (message.text.includes("--help")) {
      return this.handleHelpCommand(bot, sender, message);
    }

    return this.handleCommandWithArgs(bot, sender, message);
  }

  isValidContext(_bot: BaseBot, sender: ISender, message: IMessage): boolean {
    const { dm, room } = this.usageContext;

    if (dm && sender.isDirect) {
      return true;
    }

    if (room && !sender.isDirect) {
      if (room === true) {
        return false;
      }

      if (typeof room === "string") {
        return !!message.roomName?.startsWith(room);
      }
    }

    return false;
  }

  async handleHelpCommand(
    _bot: BaseBot,
    _sender: ISender,
    _message: IMessage,
  ): Promise<string> {
    const args = this.getArguments();
    const options = this.getOptions();
    let help = `!${this.name} ${args
      .map(({ name, isFixed }) => (isFixed ? name : `{${name}}`))
      .join(" ")} ${options
      .map(
        (option) =>
          `--${option.name}${option.example ? `=${option.example}` : ""}`,
      )
      .join(" ")}\n`;
    if (args.length > 0) {
      help += `- Arguments:\n`;
      args.forEach((arg) => {
        help += `  ${arg.name} - ${arg.description}\n`;
      });
    }
    if (options.length > 0) {
      help += `- Options:\n`;
      options.forEach((option) => {
        help += `  --${option.name} - ${option.description}\n`;
      });
    }
    return help;
  }

  async handleCommandWithArgs(
    bot: BaseBot,
    sender: ISender,
    message: IMessage,
  ): Promise<string> {
    const args = this.getArguments();
    const options = this.getOptions();

    const argsArray = message.text.trim().split(" ");
    const optionsObject: Record<string, string> = {};

    const actualArgsArrayLength = argsArray.length - 1;

    const { missingArgs, argsObject } = args.reduce(
      (acc, arg, argIndex) => {
        const nextArgIsFixed =
          args.length > acc.nextIndex && args[acc.nextIndex].isFixed;
        const indexOfNextFixedArg = nextArgIsFixed
          ? argsArray.indexOf(args[acc.nextIndex].name)
          : -1;

        return {
          argsObject: {
            ...acc.argsObject,
            [arg.name]: nextArgIsFixed
              ? argsArray.slice(acc.nextIndex, indexOfNextFixedArg).join(" ") // take all arguments until next fixed
              : args.length === argIndex + 1
                ? argsArray.slice(acc.nextIndex).join(" ") // for last argument always include all remaining text
                : argsArray[acc.nextIndex],
          },
          missingArgs: [
            ...acc.missingArgs,
            ...(arg.required && !argsArray[acc.nextIndex] ? [arg.name] : []),
          ],
          nextIndex: nextArgIsFixed
            ? indexOfNextFixedArg // keeps track of next to be considered index for skipping until is fixed
            : acc.nextIndex + 1,
        };
      },
      {
        argsObject: {},
        missingArgs: [],
        nextIndex: 1,
      } as {
        argsObject: Record<string, string>;
        missingArgs: string[];
        nextIndex: number;
      },
    );

    const requiredArgs = args.filter((arg) => arg.required);
    let errorMessages: string[] = [];
    if (requiredArgs.length > actualArgsArrayLength) {
      errorMessages.push(
        `Not enough arguments. Expected ${
          requiredArgs.length
        }, got ${actualArgsArrayLength}\nMissing required arguments: ${missingArgs.join(
          ", ",
        )}`,
      );
    }

    options.forEach((option) => {
      argsArray.forEach((arg) => {
        if (arg.includes(`--${option.name}`)) {
          const value = arg.split("=")[1];

          if (option.enum && !option.enum.includes(value)) {
            errorMessages.push(
              `Option ${option.name} must be one of:\n- ${option.enum.join(
                "\n- ",
              )}`,
            );
          }

          optionsObject[option.name] = value;
        }
      });
    });

    if (this.handleArgumentError && errorMessages.length > 0) {
      return errorMessages[0];
    }

    return this.handle(
      bot,
      sender,
      message,
      argsObject,
      optionsObject,
      errorMessages,
    );
  }

  handleStep(
    bot: BaseBot,
    sender: ISender,
    message: IMessage,
    userState: UserState,
  ): Promise<string> {
    throw new Error("Method not implemented.");
  }

  abstract handle(
    bot: BaseBot,
    sender: ISender,
    message: IMessage,
    args: Record<string, string>,
    options: Record<string, string>,
    errorMessages?: string[],
  ): Promise<string>;
}
