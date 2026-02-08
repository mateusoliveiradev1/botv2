import logger from "./logger";

/**
 * Executes a database operation with retry logic for handling SQLite locking/timeout issues.
 * @param operation The database operation to execute (promise)
 * @param retries Number of retries (default: 3)
 * @param delayMs Delay between retries in ms (default: 1000)
 */
export async function dbRetry<T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      const isTimeout = error.message?.includes(
        "Timed out fetching a new connection",
      );
      const isLocked = error.message?.includes("database is locked");

      if ((isTimeout || isLocked) && i < retries - 1) {
        logger.warn(`⚠️ DB Locked/Timeout. Retrying (${i + 1}/${retries})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Database operation failed after retries");
}
