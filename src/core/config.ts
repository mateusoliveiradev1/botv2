import dotenv from 'dotenv';
import { z } from 'zod';
import logger from './logger';

dotenv.config();

const envSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1, 'Discord Bot Token is required'),
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  CLIENT_ID: z.string().optional(),
  GUILD_ID: z.string().optional(),
  LOG_CHANNEL_ID: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error({ err: error.format() }, '❌ Invalid environment variables:');
    }
    process.exit(1);
  }
};

export const config = parseEnv();
