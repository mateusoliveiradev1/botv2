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

process.on('unhandledRejection', (error) => {
  logger.error(error, '❌ Unhandled Rejection:');
});

process.on('uncaughtException', (error) => {
  logger.error(error, '❌ Uncaught Exception:');
});

client.start().catch((err) => {
  logger.error(err, '❌ Failed to start bot:');
});
