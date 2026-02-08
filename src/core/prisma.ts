import { PrismaClient } from '@prisma/client';

// Configuração otimizada para evitar exaustão de conexões em Serverless/Render
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

export default prisma;
