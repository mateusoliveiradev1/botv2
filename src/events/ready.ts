import { Client, Events, REST, Routes, ActivityType } from 'discord.js';
import { BotEvent } from '../types';
import logger from '../core/logger';
import { config } from '../core/config';
import { NewsService } from '../services/news';
import { VoiceXpService } from '../services/voiceXp';
import { MissionManager } from '../modules/missions/manager';
import { VoiceManager } from '../modules/voice/manager';

// Global instances
export let voiceXpService: VoiceXpService;
export let voiceManager: VoiceManager;

const event: BotEvent = {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    logger.info(`🤖 BlueZone Sentinel Online as ${client.user?.tag}`);

    // Initialize Services
    const newsService = new NewsService(client);
    newsService.start();

    voiceXpService = new VoiceXpService(client);
    voiceXpService.start();

    voiceManager = new VoiceManager(client);

    MissionManager.init(client);

    // Register Slash Commands
    const commands = client.commands.map(c => c.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(config.DISCORD_BOT_TOKEN);

    try {
      logger.info('Started refreshing application (/) commands.');
      if (config.GUILD_ID) {
        await rest.put(
          Routes.applicationGuildCommands(client.user!.id, config.GUILD_ID),
          { body: commands },
        );
      } else {
        await rest.put(
          Routes.applicationCommands(client.user!.id),
          { body: commands },
        );
      }
      logger.info('Successfully reloaded application (/) commands.');
    } catch (error) {
      logger.error(error);
    }

    // Dynamic Status Rotation
    const activities = [
        { name: 'PUBG: BATTLEGROUNDS', type: ActivityType.Playing },
        { name: '🛡️ Patrulhando a Zona Azul', type: ActivityType.Custom },
        { name: '🎫 Tickets de Suporte', type: ActivityType.Watching },
        { name: '👥 Membros do Esquadrão', type: ActivityType.Watching }
    ];

    let i = 0;
    setInterval(() => {
        const activity = activities[i++ % activities.length];
        // Update dynamic values
        if (activity.name.includes('Membros')) {
            const memberCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
            activity.name = `👥 ${memberCount} Membros`;
        }
        client.user?.setActivity(activity.name, { type: activity.type as any });
    }, 15000);
  },
};

export default event;
