"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("../core/config");
const logger_1 = __importDefault(require("../core/logger"));
const client = new discord_js_1.Client({
    intents: [discord_js_1.GatewayIntentBits.Guilds],
});
client.once('ready', async () => {
    logger_1.default.info(`🤖 Bot logged in as ${client.user?.tag}`);
    logger_1.default.info(`📊 Currently in ${client.guilds.cache.size} guilds:`);
    client.guilds.cache.forEach(guild => {
        logger_1.default.info(` - [${guild.id}] ${guild.name}`);
    });
    if (config_1.config.GUILD_ID) {
        const target = client.guilds.cache.get(config_1.config.GUILD_ID);
        if (target) {
            logger_1.default.info(`✅ MATCH: Bot is inside the target GUILD_ID (${config_1.config.GUILD_ID})`);
        }
        else {
            logger_1.default.error(`❌ MISMATCH: Bot is NOT in the target GUILD_ID (${config_1.config.GUILD_ID}) defined in .env`);
        }
    }
    process.exit(0);
});
client.login(config_1.config.DISCORD_BOT_TOKEN).catch(err => {
    logger_1.default.error(err, '❌ Failed to login:');
    process.exit(1);
});
