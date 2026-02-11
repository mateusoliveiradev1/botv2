import { PrismaClient } from '@prisma/client';
import logger from '../core/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('🔧 Starting Database Sequence Fix...');

  try {
    // Fix UserInventory ID Sequence
    // This SQL query resets the auto-increment counter to the max(id) + 1
    // It handles the case where the table is empty (coalesce to 0)
    await prisma.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('"UserInventory"', 'id'), coalesce(max(id), 0) + 1, false) FROM "UserInventory";
    `);
    logger.info('✅ Fixed UserInventory ID sequence.');

    // Optional: Fix other tables with auto-increment IDs just in case
    await prisma.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('"Warning"', 'id'), coalesce(max(id), 0) + 1, false) FROM "Warning";
    `);
    logger.info('✅ Fixed Warning ID sequence.');

    await prisma.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('"MercenaryContract"', 'id'), coalesce(max(id), 0) + 1, false) FROM "MercenaryContract";
    `);
    logger.info('✅ Fixed MercenaryContract ID sequence.');

    await prisma.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('"MissionProgress"', 'id'), coalesce(max(id), 0) + 1, false) FROM "MissionProgress";
    `);
    logger.info('✅ Fixed MissionProgress ID sequence.');

    await prisma.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('"AuditLog"', 'id'), coalesce(max(id), 0) + 1, false) FROM "AuditLog";
    `);
    logger.info('✅ Fixed AuditLog ID sequence.');

    logger.info('🚀 All database sequences synchronized successfully.');
  } catch (error) {
    logger.error(error, '❌ Failed to fix database sequences');
  } finally {
    await prisma.$disconnect();
  }
}

main();
