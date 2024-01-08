import { BaseBot } from "./BaseBot";
import { IBotCommandArguments, ISender } from "../../types";
import { BotCommand } from "./BotCommand";

export class HelpCommand extends BotCommand {
  name: string = "help";
  description: string = "Show help";

  getArguments(): IBotCommandArguments[] {
    return [];
  }
  getOptions(): IBotCommandArguments[] {
    return [];
  }

  async handle(bot: BaseBot, sender: ISender, message: any) {
    let help = "Available commands:\n";
    for (const [commandName, command] of Object.entries(bot.commands)) {
      const args = command.getArguments();
      const argsString = args
        .map(({ name, isFixed }) => (isFixed ? name : `{${name}}`))
        .join(" ");

      help = `${help}${bot.commandPrefix}${commandName} ${argsString} - ${command.description}\n`;
    }
    return help;
  }
}
