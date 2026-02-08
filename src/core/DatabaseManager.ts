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
    // Aumentar connection limit para suportar concorrência
    if (!finalUrl.includes('connection_limit')) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'connection_limit=20';
    }
    // Aumentar timeout do pool para evitar erros de inicialização
    if (!finalUrl.includes('pool_timeout')) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'pool_timeout=30';
    }
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
