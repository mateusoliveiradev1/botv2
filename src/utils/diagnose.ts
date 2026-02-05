import { Client, GatewayIntentBits } from 'discord.js';
import { config } from '../core/config';
import logger from '../core/logger';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('ready', async () => {
  logger.info(`🤖 Bot logged in as ${client.user?.tag}`);
  logger.info(`📊 Currently in ${client.guilds.cache.size} guilds:`);
  
  client.guilds.cache.forEach(guild => {
    logger.info(` - [${guild.id}] ${guild.name}`);
  });

  if (config.GUILD_ID) {
    const target = client.guilds.cache.get(config.GUILD_ID);
    if (target) {
      logger.info(`✅ MATCH: Bot is inside the target GUILD_ID (${config.GUILD_ID})`);
    } else {
      logger.error(`❌ MISMATCH: Bot is NOT in the target GUILD_ID (${config.GUILD_ID}) defined in .env`);
    }
  }

  process.exit(0);
});

client.login(config.DISCORD_BOT_TOKEN).catch(err => {
  logger.error(err, '❌ Failed to login:');
  process.exit(1);
});
