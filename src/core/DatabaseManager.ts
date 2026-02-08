import { PrismaClient } from '@prisma/client';
import { Mutex } from 'async-mutex';
import logger from './logger';

class DatabaseManager {
  private static instance: DatabaseManager;
  public prisma: PrismaClient;
  private mutex: Mutex;

  private constructor() {
    this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        }
    });
    this.mutex = new Mutex();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Inicializa o banco de dados com configurações otimizadas para SQLite (WAL).
   */
  public async init() {
    try {
        await this.prisma.$connect();
        // Ativar WAL Mode para concorrência
        await this.prisma.$queryRaw`PRAGMA journal_mode = WAL;`;
        await this.prisma.$queryRaw`PRAGMA synchronous = NORMAL;`;
        await this.prisma.$queryRaw`PRAGMA busy_timeout = 5000;`; // Espera até 5s se estiver lockado
        logger.info('🚀 Database Manager Initialized (WAL Mode + Mutex)');
    } catch (error) {
        logger.error(error, '❌ Failed to initialize DatabaseManager');
        process.exit(1); // Falha crítica
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
