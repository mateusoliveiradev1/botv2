import { BlueZoneClient } from './core/client';
import logger from './core/logger';
import http from 'http';
import { db } from './core/DatabaseManager';

const client = new BlueZoneClient();

// Render Web Service Health Check (Port 80/10000)
// This is required to keep the "Web Service" alive on Render Free Tier
const port = process.env.PORT || 10000;
const server = http.createServer(async (req, res) => {
    // Basic Health Check (Liveness Probe)
    if (req.url === '/health' || req.url === '/') {
        try {
            // Deep Check: Verify Database Connection
            // Se o banco estiver fora, o bot deve ser reiniciado pelo Render
            await db.prisma.$queryRaw`SELECT 1`;
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                status: 'ok', 
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            logger.error(`❌ Health Check Failed: ${(error as Error).message}`);
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                status: 'error', 
                message: 'Database Unreachable' 
            }));
        }
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
        logger.warn(`⚠️ Porta ${port} já está em uso. O servidor de Health Check (Web) será ignorado.`);
        logger.warn(`ℹ️ Isso é normal em testes locais se você já tiver outra instância do bot rodando.`);
    } else {
        logger.error(e, '❌ Erro no servidor HTTP:');
    }
});

server.listen(Number(port), '0.0.0.0', () => {
    logger.info(`🌐 Health Check Server listening on port ${port} (0.0.0.0)`);
});

// Graceful Shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  try {
      // 1. Desconectar Bot Discord
      await client.destroy();
      logger.info('✅ Discord Client destroyed');

      // 2. Fechar Conexão com Banco
      await db.disconnect();
      logger.info('✅ Database Connection closed');

      // 3. Fechar Servidor HTTP
      server.close(() => {
        logger.info('✅ HTTP server closed');
        process.exit(0);
      });
  } catch (error) {
      logger.error(error, '❌ Error during shutdown');
      process.exit(1);
  }
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
