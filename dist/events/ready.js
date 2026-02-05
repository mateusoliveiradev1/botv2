"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceManager = exports.voiceXpService = void 0;
const discord_js_1 = require("discord.js");
const logger_1 = __importDefault(require("../core/logger"));
const config_1 = require("../core/config");
const news_1 = require("../services/news");
const voiceXp_1 = require("../services/voiceXp");
const manager_1 = require("../modules/missions/manager");
const manager_2 = require("../modules/voice/manager");
const event = {
    name: discord_js_1.Events.ClientReady,
    once: true,
    async execute(client) {
        logger_1.default.info(`🤖 BlueZone Sentinel Online as ${client.user?.tag}`);
        // Initialize Services
        const newsService = new news_1.NewsService(client);
        newsService.start();
        exports.voiceXpService = new voiceXp_1.VoiceXpService(client);
        exports.voiceXpService.start();
        exports.voiceManager = new manager_2.VoiceManager(client);
        manager_1.MissionManager.init(client);
        // Register Slash Commands
        const commands = client.commands.map(c => c.data.toJSON());
        const rest = new discord_js_1.REST({ version: '10' }).setToken(config_1.config.DISCORD_BOT_TOKEN);
        try {
            logger_1.default.info('Started refreshing application (/) commands.');
            if (config_1.config.GUILD_ID) {
                await rest.put(discord_js_1.Routes.applicationGuildCommands(client.user.id, config_1.config.GUILD_ID), { body: commands });
            }
            else {
                await rest.put(discord_js_1.Routes.applicationCommands(client.user.id), { body: commands });
            }
            logger_1.default.info('Successfully reloaded application (/) commands.');
        }
        catch (error) {
            logger_1.default.error(error);
        }
        // Dynamic Status Rotation
        const activities = [
            { name: 'PUBG: BATTLEGROUNDS', type: discord_js_1.ActivityType.Playing },
            { name: '🛡️ Patrulhando a Zona Azul', type: discord_js_1.ActivityType.Custom },
            { name: '🎫 Tickets de Suporte', type: discord_js_1.ActivityType.Watching },
            { name: '👥 Membros do Esquadrão', type: discord_js_1.ActivityType.Watching }
        ];
        let i = 0;
        setInterval(() => {
            const activity = activities[i++ % activities.length];
            // Update dynamic values
            if (activity.name.includes('Membros')) {
                const memberCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
                activity.name = `👥 ${memberCount} Membros`;
            }
            client.user?.setActivity(activity.name, { type: activity.type });
        }, 15000);
    },
};
exports.default = event;
