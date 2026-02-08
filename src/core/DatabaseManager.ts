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

    // Supabase com Transaction Mode (Port 6543) exige PGBouncer e connection_limit=1
    // Se estiver usando o pooler (aws-0-us-west-2.pooler.supabase.com), devemos delegar o pool para ele.
    const isSupabasePooler = finalUrl.includes('pooler.supabase.com');

    if (isSupabasePooler) {
        // Reduzir connection limit para 1 ou 2, pois o PgBouncer gerencia o resto
        if (finalUrl.includes('connection_limit')) {
            finalUrl = finalUrl.replace(/connection_limit=\d+/, 'connection_limit=2');
        } else {
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'connection_limit=2';
        }

        // Adicionar flag pgbouncer=true obrigatória para Transaction Mode
        if (!finalUrl.includes('pgbouncer')) {
            finalUrl += '&pgbouncer=true';
        }
    } else {
        // Direct Connection (Session Mode)
        if (finalUrl.includes('connection_limit')) {
            finalUrl = finalUrl.replace(/connection_limit=\d+/, 'connection_limit=10');
        } else {
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'connection_limit=10';
        }
    }

    // Aumentar timeouts para garantir conexão estável
    if (finalUrl.includes('pool_timeout')) {
        finalUrl = finalUrl.replace(/pool_timeout=\d+/, 'pool_timeout=30');
    } else {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'pool_timeout=30';
    }

    if (finalUrl.includes('socket_timeout')) {
        finalUrl = finalUrl.replace(/socket_timeout=\d+/, 'socket_timeout=30');
    } else {
        finalUrl += '&socket_timeout=30';
    }
    
    // Connect Timeout
    if (finalUrl.includes('connect_timeout')) {
        finalUrl = finalUrl.replace(/connect_timeout=\d+/, 'connect_timeout=30');
    } else {
        finalUrl += '&connect_timeout=30';
    }

    logger.info(`🔌 Database URL configured (Is Pooler: ${isSupabasePooler})`);
    return finalUrl;
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Inicializa o banco de dados.
   * Com sistema de retry para robustez.
   */
  public async init() {
    const maxRetries = 5;
    const retryDelay = 2000;

    for (let i = 0; i < maxRetries; i++) {
        try {
            await this.prisma.$connect();
            // Remover comandos específicos do SQLite (PRAGMA)
            // PostgreSQL gerencia concorrência nativamente
            logger.info('🚀 Database Manager Initialized (PostgreSQL Mode)');
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
   * Executa uma operação com retry automático em caso de erros de conexão (P1001, etc).
   */
  private async executeWithRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            const isConnectionError = 
                error?.code === 'P1001' || // Can't reach database server
                error?.code === 'P1002' || // The database server at ... was reached but timed out
                error?.message?.includes('Can\'t reach database server');

            if (isConnectionError && i < retries - 1) {
                logger.warn(`⚠️ DB Connection Error (${error.code}). Retrying operation (${i + 1}/${retries})...`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Espera 1s antes de tentar de novo
                continue;
            }
            throw error;
        }
    }
    throw new Error('Database operation failed after retries');
  }

  /**
   * Executa uma operação de ESCRITA com lock exclusivo (Mutex).
   * Use isso para create, update, delete, upsert.
   */
  public async write<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> {
    return await this.mutex.runExclusive(async () => {
        try {
            return await this.executeWithRetry(() => operation(this.prisma));
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
        return await this.executeWithRetry(() => operation(this.prisma));
    } catch (error) {
        logger.error(`❌ DB Read Error: ${(error as Error).message}`);
        throw error;
    }
  }
}

export const db = DatabaseManager.getInstance();
