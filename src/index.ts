import { BlueZoneClient } from './core/client';
import logger from './core/logger';

const client = new BlueZoneClient();

process.on('unhandledRejection', (error) => {
  logger.error(error, '❌ Unhandled Rejection:');
});

process.on('uncaughtException', (error) => {
  logger.error(error, '❌ Uncaught Exception:');
});

client.start().catch((err) => {
  logger.error(err, '❌ Failed to start bot:');
});
