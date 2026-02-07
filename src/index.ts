import { BlueZoneClient } from './core/client';
import logger from './core/logger';
import http from 'http';

const client = new BlueZoneClient();

// Render Web Service Health Check (Port 80/10000)
// This is required to keep the "Web Service" alive on Render Free Tier
const port = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('BlueZone Sentinel is Online!');
});

server.listen(port, () => {
    logger.info(`🌐 Health Check Server listening on port ${port}`);
});

// Graceful Shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  client.destroy().then(() => {
    logger.info('Client destroyed');
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (error) => {
  logger.error(error, '❌ Unhandled Rejection:');
});

process.on('uncaughtException', (error) => {
  logger.error(error, '❌ Uncaught Exception:');
});

client.start().catch((err) => {
  logger.error(err, '❌ Failed to start bot:');
});
