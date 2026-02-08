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
export async function enableWAL() {
  try {
    // Tenta conectar primeiro para garantir que o banco existe
    await prisma.$connect();
    await prisma.$queryRaw`PRAGMA journal_mode = WAL;`;
    await prisma.$queryRaw`PRAGMA synchronous = NORMAL;`; // Aumenta performance arriscando um pouco em crashs (aceitável para bot)
    logger.info('🚀 SQLite WAL Mode Enabled & Optimized');
  } catch (error) {
    logger.warn(`⚠️ Failed to enable WAL mode: ${(error as Error).message}`);
  }
}

export default prisma;
