import { PrismaClient } from '@prisma/client';
import logger from './logger';

// Configuração otimizada para evitar exaustão de conexões em Serverless/Render
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Ativar modo WAL para melhor performance de concorrência no SQLite
async function enableWAL() {
  try {
    await prisma.$queryRaw`PRAGMA journal_mode = WAL;`;
    logger.info('🚀 SQLite WAL Mode Enabled for High Performance');
  } catch (error) {
    logger.warn('⚠️ Failed to enable WAL mode (Is DB connected?)');
  }
}

// Executar na inicialização (após conectar)
enableWAL();

export default prisma;
