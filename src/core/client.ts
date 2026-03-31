import { Client, Collection, GatewayIntentBits, Partials, REST, Routes } from "discord.js";
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

    // Auto-Register Commands to API
    if (config.NODE_ENV === 'production') {
      try {
        logger.info('🌍 Production Mode: Registering Global Commands...');
        const rest = new REST({ version: '10' }).setToken(config.DISCORD_BOT_TOKEN);
        const commandsData = this.commands.map(c => c.data.toJSON());

        await rest.put(
          Routes.applicationCommands(config.CLIENT_ID!),
          { body: commandsData },
        );
        logger.info('✅ Commands Registered Successfully.');
      } catch (error) {
        logger.error(error, '❌ Failed to register commands:');
      }
    }

    // Retry Logic for Login (infinite retry - NEVER exit, keep health check alive for Render)
    let attempts = 0;

    while (true) {
      try {
        await this.login(config.DISCORD_BOT_TOKEN);
        logger.info('✅ Connected to Discord Gateway!');
        break;
      } catch (error: any) {
        attempts++;
        logger.error(`❌ Login failed (Attempt ${attempts}): ${error.message}`);

        // Exponential Backoff capped at 30s
        const waitTime = Math.min(Math.pow(2, attempts) * 1000, 30000);
        logger.warn(`⏳ Retrying in ${waitTime / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
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
