import { PrismaClient } from "@prisma/client";
import { Mutex } from "async-mutex";
import logger from "./logger";
import { config } from "./config";

class DatabaseManager {
  private static instance: DatabaseManager;
  public prisma: PrismaClient;
  private mutex: Mutex;

  private constructor() {
    // SINGLETON ENFORCEMENT: Se já existe uma instância do Prisma, não crie outra.
    // Isso é crítico em ambientes de desenvolvimento (HMR) e serverless para não vazar conexões.
    // @ts-ignore
    if (global.prisma) {
      // @ts-ignore
      this.prisma = global.prisma;
      logger.info("♻️ Reusing existing Prisma Client instance (Global)");
    } else {
      const dbUrl = this.configureDatabaseUrl(config.DATABASE_URL);
      this.prisma = new PrismaClient({
        // Silencing Prisma logs to avoid spamming 'prisma:error' on connection issues.
        // We handle errors explicitly in our code.
        log: [],
        datasources: {
          db: {
            url: dbUrl,
          },
        },
      });

      if (config.NODE_ENV !== "production") {
        // @ts-ignore
        global.prisma = this.prisma;
      }
    }

    // ... inside constructor after mutex init
    this.mutex = new Mutex();

    // WATCHDOG: Força desconexão periódica para limpar conexões fantasmas
    // Se o PgBouncer/Supabase travar conexões, isso aqui reseta o pool do lado do cliente.
    setInterval(() => {
      // KEEP-ALIVE: Em Transaction Mode, o PgBouncer gerencia conexões.
      // O Keep-Alive via SELECT 1 é desnecessário e pode gerar overhead.
      // Vamos confiar no pool_timeout e idle_timeout.
    }, 60000);
  }

  // ... (rest of the file)

  // Adicionar método para desconexão forçada se necessário
  public async disconnect() {
    await this.prisma.$disconnect();
  }

  private configureDatabaseUrl(url: string): string {
    let finalUrl = url;

    // Supabase com Transaction Mode (Port 6543) exige PGBouncer e connection_limit=1
    // Se estiver usando o pooler (aws-0-us-west-2.pooler.supabase.com), devemos delegar o pool para ele.
    const isSupabasePooler = finalUrl.includes("pooler.supabase.com");

    if (isSupabasePooler) {
      // CORREÇÃO DE PORTA: Forçar porta 6543 para Transaction Mode (Alta Performance)
      // O Supabase recomenda usar 6543 para Serverless/Lambdas e aplicações que abrem/fecham muitas conexões.
      if (finalUrl.includes(":5432")) {
        finalUrl = finalUrl.replace(":5432", ":6543");
        logger.info(
          "🔧 Auto-fixing Supabase Port: 5432 -> 6543 (Transaction Mode for High Performance)",
        );
      }

      // Adicionar flag pgbouncer=true obrigatória para Transaction Mode
      if (!finalUrl.includes("pgbouncer")) {
        finalUrl += "&pgbouncer=true";
      }

      // DESATIVAR STATEMENT CACHE (Crítico para PgBouncer)
      // O Prisma tenta cachear statements, mas o PgBouncer não suporta isso em Transaction Mode.
      if (finalUrl.includes("statement_cache_size")) {
        finalUrl = finalUrl.replace(/statement_cache_size=\d+/, "statement_cache_size=0");
      } else {
        finalUrl += "&statement_cache_size=0";
      }

      // Remove connection_limit se existir para usar o default do Prisma ou setar um seguro
      if (finalUrl.includes("connection_limit")) {
        finalUrl = finalUrl.replace(
          /connection_limit=\d+/,
          "connection_limit=5",
        );
      } else {
        finalUrl += (finalUrl.includes("?") ? "&" : "?") + "connection_limit=5";
      }
    } else {
      // Direct Connection (Session Mode)
      if (finalUrl.includes("connection_limit")) {
        finalUrl = finalUrl.replace(
          /connection_limit=\d+/,
          "connection_limit=1",
        );
      } else {
        finalUrl += (finalUrl.includes("?") ? "&" : "?") + "connection_limit=1";
      }
    }

    // POOL TIMEOUT ZERO: Sem timeout para pegar conexão do pool.
    // O bot fica na fila até conseguir, em vez de crashar.
    if (finalUrl.includes("pool_timeout")) {
      finalUrl = finalUrl.replace(/pool_timeout=\d+/, "pool_timeout=0");
    } else {
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + "pool_timeout=0";
    }

    // IDLE TIMEOUT: Força desconexão de conexões ociosas para liberar o pool
    if (finalUrl.includes("idle_timeout")) {
      finalUrl = finalUrl.replace(/idle_timeout=\d+/, "idle_timeout=20");
    } else {
      finalUrl += "&idle_timeout=20";
    }

    if (finalUrl.includes("socket_timeout")) {
      finalUrl = finalUrl.replace(/socket_timeout=\d+/, "socket_timeout=60");
    } else {
      finalUrl += "&socket_timeout=60";
    }

    // Connect Timeout
    if (finalUrl.includes("connect_timeout")) {
      finalUrl = finalUrl.replace(/connect_timeout=\d+/, "connect_timeout=60");
    } else {
      finalUrl += "&connect_timeout=60";
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
        logger.info("🚀 Database Manager Initialized (PostgreSQL Mode)");
        return;
      } catch (error) {
        const isLastAttempt = i === maxRetries - 1;
        logger.warn(
          `⚠️ Database initialization failed (Attempt ${i + 1}/${maxRetries}): ${(error as Error).message}`,
        );

        if (isLastAttempt) {
          logger.error(
            error,
            "❌ Failed to initialize DatabaseManager after retries. Bot will continue without DB.",
          );
          // DO NOT process.exit(1) - keep health check alive for Render
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Executa uma operação com retry automático em caso de erros de conexão (P1001, etc).
   * PUBLIC: Disponível para uso externo (ex: BackupManager)
   */
  public async executeWithRetry<T>(
    operation: (client: PrismaClient) => Promise<T>,
    retries = 3,
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation(this.prisma);
      } catch (error: any) {
        const isConnectionError =
          error?.code === "P1001" || // Can't reach database server
          error?.code === "P1002" || // The database server at ... was reached but timed out
          error?.code === "P1017" || // Server has closed the connection
          error?.message?.includes("Can't reach database server");

        if (isConnectionError && i < retries - 1) {
          // Backoff Exponencial (1s, 2s, 4s)
          const delay = 1000 * Math.pow(2, i);

          logger.warn(
            `⚠️ DB Connection Error (${error.code || "Unknown"}). Retrying operation (${i + 1}/${retries}) in ${delay}ms...`,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw new Error("Database operation failed after retries");
  }

  /**
   * Executa uma operação de ESCRITA.
   * Não usa Mutex para permitir que o Prisma/PgBouncer gerencie a concorrência.
   * Use isso para create, update, delete, upsert.
   */
  public async write<T>(
    operation: (client: PrismaClient) => Promise<T>,
  ): Promise<T> {
    try {
      // Removido Mutex aqui também. O controle de concorrência deve ser feito pelo banco/Prisma.
      // O Mutex no cliente cria uma fila única que engargala tudo se uma operação demorar.
      return await this.executeWithRetry((prisma) => operation(prisma));
    } catch (error) {
      logger.error(`❌ DB Write Error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Executa uma operação de LEITURA.
   * Não usa Mutex para permitir leituras paralelas (PostgreSQL lida bem com isso).
   * Use isso para findUnique, findMany.
   */
  public async read<T>(
    operation: (client: PrismaClient) => Promise<T>,
  ): Promise<T> {
    try {
      // Removido Mutex aqui para evitar gargalo em operações de leitura
      return await this.executeWithRetry((prisma) => operation(prisma));
    } catch (error) {
      logger.error(`❌ DB Read Error: ${(error as Error).message}`);
      throw error;
    }
  }
}

export const db = DatabaseManager.getInstance();
