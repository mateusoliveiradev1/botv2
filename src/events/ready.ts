import { Client, Events, REST, Routes, ActivityType } from "discord.js";
import { BotEvent } from "../types";
import logger from "../core/logger";
import { config } from "../core/config";
import { db } from "../core/DatabaseManager";
import { NewsService } from "../services/news";
import { VoiceXpService } from "../services/voiceXp";
import { MissionManager } from "../modules/missions/manager";
import { VoiceManager } from "../modules/voice/manager";
import { BackupScheduler } from "../modules/backup/scheduler";

// Global instances
export let voiceXpService: VoiceXpService;
export let voiceManager: VoiceManager;

// Helper para delay (Staggered Boot)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const event: BotEvent = {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    logger.info(`🤖 BlueZone Sentinel Online as ${client.user?.tag}`);

    // --- PHASE 1: DATABASE INITIALIZATION ---
    try {
      logger.info("📦 Phase 1: Initializing Database...");
      await db.init(); // Wait for DB to be ready before anything else!
      await sleep(1000); // Give it a breath
    } catch (e) {
      logger.error(e, "❌ Phase 1 Failed: DB Init");
    }

    // --- PHASE 2: CRITICAL SERVICES (Voice) ---
    try {
      logger.info("🎙️ Phase 2: Starting Voice Services...");
      voiceManager = new VoiceManager(client);
      await voiceManager.cleanupOrphans(); // Clean DB state

      voiceXpService = new VoiceXpService(client);
      voiceXpService.start();

      await sleep(2000); // Stagger
    } catch (e) {
      logger.error(e, "❌ Phase 2 Failed: Voice Services");
    }

    // --- PHASE 3: BACKGROUND SERVICES (News, Missions) ---
    try {
      logger.info("📰 Phase 3: Starting Background Services...");
      const newsService = new NewsService(client);
      newsService.start();

      await sleep(2000); // Stagger

      MissionManager.init(client);

      await sleep(1000);

      BackupScheduler.init(client);
    } catch (e) {
      logger.error(e, "❌ Phase 3 Failed: Background Services");
    }

    // --- PHASE 4: COMMAND REGISTRATION ---
    // Register Slash Commands
    const commands = client.commands.map((c) => c.data.toJSON());
    const rest = new REST({ version: "10" }).setToken(config.DISCORD_BOT_TOKEN);

    try {
      logger.info("⚡ Phase 4: Registering Commands...");

      // Force Global Registration for Production
      if (config.NODE_ENV === "production") {
        logger.info("🌍 Production Mode: Registering Global Commands...");
        await rest.put(Routes.applicationCommands(client.user!.id), {
          body: commands,
        });
      } else if (config.GUILD_ID) {
        logger.info(
          `🏠 Development Mode: Registering Guild Commands for ${config.GUILD_ID}...`,
        );
        await rest.put(
          Routes.applicationGuildCommands(client.user!.id, config.GUILD_ID),
          { body: commands },
        );
      } else {
        await rest.put(Routes.applicationCommands(client.user!.id), {
          body: commands,
        });
      }

      logger.info("✅ Commands Registered Successfully.");
    } catch (error) {
      logger.error(error);
    }

    // --- PHASE 5: SHOP LAUNCH ANNOUNCEMENT ---
    try {
        const launched = await db.read(async (prisma) => prisma.systemState.findUnique({ where: { key: 'shop_launch_v2' } }));
        
        if (!launched && client.guilds.cache.size > 0) {
            const guild = client.guilds.cache.first();
            if (guild) {
                 // Tenta achar canal SITREP especificamente
                 const channel = guild.channels.cache.find(c => 
                     (c.name.toLowerCase().includes('sitrep') || c.name.toLowerCase() === 'sitrep') && 
                     c.isTextBased()
                 );

                 // Busca o canal da LOJA para pegar o ID correto
                 const shopChannel = guild.channels.cache.find(c => 
                    (c.name.toLowerCase().includes('loja-oficial'))
                 );

                 if (channel && channel.isTextBased()) {
                     const shopLink = shopChannel ? `<#${shopChannel.id}>` : '#loja';

                     await channel.send({
                         content: `🛒 **BlueZone Market Aberto!**\n\nO sistema de economia oficial da BlueZone está no ar. \nUse o canal ${shopLink} para acessar o painel e gastar seus BCs!`,
                     });
                     
                     // Marcar como anunciado
                     await db.write(async (prisma) => prisma.systemState.create({
                         data: { key: 'shop_launch_v2', value: 'true' }
                     }));
                     
                     logger.info(`📢 Shop Launch Announced in #${channel.name}!`);
                 } else {
                     logger.warn("⚠️ Could not find #sitrep channel to announce shop launch.");
                 }
             }
         }
    } catch (e) {
        logger.warn("⚠️ Failed to announce shop launch (maybe already announced or db busy)");
    }

    // Dynamic Status Rotation
    const activities = [
      { name: "PUBG: BATTLEGROUNDS", type: ActivityType.Playing },
      { name: "🛡️ Patrulhando a Zona Azul", type: ActivityType.Custom },
      { name: "🎫 Tickets de Suporte", type: ActivityType.Watching },
      { name: "👥 Membros do Esquadrão", type: ActivityType.Watching },
    ];

    let i = 0;
    setInterval(() => {
      const activity = activities[i++ % activities.length];
      // Update dynamic values
      if (activity.name.includes("Membros")) {
        const memberCount = client.guilds.cache.reduce(
          (acc, g) => acc + g.memberCount,
          0,
        );
        activity.name = `👥 ${memberCount} Membros`;
      }
      client.user?.setActivity(activity.name, { type: activity.type as any });
    }, 15000);

    logger.info("🚀 System Fully Operational.");
  },
};

export default event;
