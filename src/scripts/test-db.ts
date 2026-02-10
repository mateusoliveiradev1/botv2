import { db } from '../core/DatabaseManager';
import logger from '../core/logger';

async function testConnection() {
    logger.info("🧪 Starting Database Connection Test...");
    
    try {
        await db.init();
        
        logger.info("🧪 Testing Read Operation...");
        const result = await db.read(async (prisma) => {
            return await prisma.$queryRaw`SELECT 1 as result`;
        });
        logger.info(`✅ Read Success: ${JSON.stringify(result)}`);

        // Teste opcional de escrita se tiver tabela segura
        // logger.info("🧪 Testing Write Operation...");
        
        logger.info("🎉 Database Integrity Test Passed!");
        process.exit(0);
    } catch (error) {
        logger.error(error, "❌ Database Test Failed");
        process.exit(1);
    }
}

testConnection();