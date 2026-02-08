import { PrismaClient } from '@prisma/client';
import { Mutex } from 'async-mutex';
import logger from './logger';
import { config } from './config';

class DatabaseManager {
  private static instance: DatabaseManager;
  public prisma: PrismaClient;
  private mutex: Mutex;

  private constructor() {
    const dbUrl = this.configureDatabaseUrl(config.DATABASE_URL);

    this.prisma = new PrismaClient({
        log: config.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        datasources: {
            db: {
                url: dbUrl
            }
        }
    });
    this.mutex = new Mutex();
  }

  private configureDatabaseUrl(url: string): string {
    let finalUrl = url;

    // Forçar connection_limit para 50 (substitui valor existente ou adiciona)
    if (finalUrl.includes('connection_limit')) {
        finalUrl = finalUrl.replace(/connection_limit=\d+/, 'connection_limit=50');
    } else {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'connection_limit=50';
    }

    // Forçar pool_timeout para 60s (substitui valor existente ou adiciona)
    if (finalUrl.includes('pool_timeout')) {
        finalUrl = finalUrl.replace(/pool_timeout=\d+/, 'pool_timeout=60');
    } else {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'pool_timeout=60';
    }

    // Adicionar socket_timeout para garantir que conexões mortas sejam fechadas
    if (!finalUrl.includes('socket_timeout')) {
        finalUrl += '&socket_timeout=60';
    }

    logger.info(`🔌 Database URL configured with params: connection_limit=50, pool_timeout=60`);
    return finalUrl;
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Inicializa o banco de dados com configurações otimizadas para SQLite (WAL).
   * Com sistema de retry para robustez.
   */
  public async init() {
    const maxRetries = 5;
    const retryDelay = 2000;

    for (let i = 0; i < maxRetries; i++) {
        try {
            await this.prisma.$connect();
            // Ativar WAL Mode para concorrência
            await this.prisma.$queryRaw`PRAGMA journal_mode = WAL;`;
            await this.prisma.$queryRaw`PRAGMA synchronous = NORMAL;`;
            await this.prisma.$queryRaw`PRAGMA busy_timeout = 5000;`; // Espera até 5s se estiver lockado
            logger.info('🚀 Database Manager Initialized (WAL Mode + Mutex)');
            return;
        } catch (error) {
            const isLastAttempt = i === maxRetries - 1;
            logger.warn(`⚠️ Database initialization failed (Attempt ${i + 1}/${maxRetries}): ${(error as Error).message}`);

            if (isLastAttempt) {
                logger.error(error, '❌ Failed to initialize DatabaseManager after retries');
                process.exit(1); // Falha crítica
            }
            
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
  }

  /**
   * Executa uma operação de ESCRITA com lock exclusivo (Mutex).
   * Use isso para create, update, delete, upsert.
   */
  public async write<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> {
    return await this.mutex.runExclusive(async () => {
        try {
            return await operation(this.prisma);
        } catch (error) {
            logger.error(`❌ DB Write Error: ${(error as Error).message}`);
            throw error;
        }
    });
  }

  /**
   * Executa uma operação de LEITURA (sem lock, aproveitando o WAL).
   * Use isso para findUnique, findMany.
   */
  public async read<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> {
    try {
        return await operation(this.prisma);
    } catch (error) {
        logger.error(`❌ DB Read Error: ${(error as Error).message}`);
        throw error;
    }
  }
}

export const db = DatabaseManager.getInstance();
