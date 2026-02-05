import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import { glob } from "glob";
import path from "path";
import logger from "./logger";
import { SlashCommand, BotEvent } from "../types";
import { config } from "./config";

export class BlueZoneClient extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    });

    this.commands = new Collection();
    this.cooldowns = new Collection();
  }

  async start() {
    await this.registerModules();
    await this.login(config.DISCORD_BOT_TOKEN);
  }

  async registerModules() {
    // Commands
    this.commands.clear(); // Limpar comandos antigos antes de registrar
    const commandFiles = await glob(
      path.join(__dirname, "../commands/**/*{.ts,.js}").replace(/\\/g, "/"),
    );
    for (const file of commandFiles) {
      const command: SlashCommand = await import(file).then((m) => m.default);
      if (!command || !command.data) {
        logger.warn(`⚠️ Command missing data: ${file}`);
        continue;
      }
      this.commands.set(command.data.name, command);
      logger.info(`✅ Command loaded: /${command.data.name}`);
    }

    // Events
    // this.removeAllListeners(); // Removido pois causava instabilidade. A duplicação foi resolvida matando processos órfãos.

    const eventFiles = await glob(
      path.join(__dirname, "../events/**/*{.ts,.js}").replace(/\\/g, "/"),
    );
    for (const file of eventFiles) {
      const event: BotEvent = await import(file).then((m) => m.default);
      if (!event || !event.name) {
        logger.warn(`⚠️ Event missing name: ${file}`);
        continue;
      }

      if (event.once) {
        this.once(event.name, (...args) => event.execute(...args));
      } else {
        this.on(event.name, (...args) => event.execute(...args));
      }
      logger.info(`✅ Event loaded: ${event.name}`);
    }
  }
}
