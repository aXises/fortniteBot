import ExecutableCommand from "command/ExecutableCommand";
import { AccessLevel } from "user/AccessLevel";
import Action from "action/Action";
import OnMessageState from "state/OnMessageState";
import { GuildConfig } from "config/GuildBooleanConfig";
import DBGuildPropertySchema from "database/schemas/DBGuildPropertySchema";

enum Args {
    CONFIG_NAME,
    CONFIG_VALUE,
}

export default class SetConfig extends ExecutableCommand {
    public constructor() {
        super({
            commandString: "setconfig",
            accessLevel: AccessLevel.ADMINISTRATOR,
            argLength: 2,
            description: "Set bot configurations.",
            usage: "Usage: !f setconfig [config_name] [value]",
        });
    }
    public setCustomAction(): Action {
        return new Action(async (state: OnMessageState, args: string[]): Promise<boolean> => {
            try {
                const guild = await DBGuildPropertySchema.getGuildById(state.getHandle().guild.id);
                if (GuildConfig.BooleanConfig.keys.indexOf(args[Args.CONFIG_NAME]) !== -1) {
                    if (args[Args.CONFIG_VALUE].toLowerCase() === "true") {
                        guild.setBooleanConfig(args[Args.CONFIG_NAME], true);
                    } else if (args[Args.CONFIG_VALUE].toLowerCase() === "false") {
                        guild.setBooleanConfig(args[Args.CONFIG_NAME], false);
                    } else {
                        state.getHandle().reply("Config value must be a boolean.");
                        return false;
                    }
                } else {
                    let keys = "";
                    for (const key of GuildConfig.BooleanConfig.keys) {
                        keys += key + "\n";
                    }
                    state.getHandle().reply(`Not a valid configuration name. Available names include:`
                            + `\`\`\``
                            + keys
                            + `\`\`\``,
                    );
                    return false;
                }
                state.getHandle().reply(`**${args[Args.CONFIG_NAME]}**`
                        + ` successfully set to **${args[Args.CONFIG_VALUE].toLowerCase()}**.`);
                return true;
            } catch (err) {
                throw err;
            }
        });
    }
}
