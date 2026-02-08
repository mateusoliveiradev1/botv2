import prisma from '../src/core/prisma';
import { XpManager } from '../src/modules/xp/manager';
import { WarningManager } from '../src/modules/moderation/WarningManager';
import { MercenaryManager } from '../src/modules/mercenary/manager';

// Mock Discord objects
const mockMember = {
    id: 'verify_user_1',
    user: { bot: false, username: 'VerifyUser' },
    guild: {
        id: 'guild_1',
        roles: { cache: { find: () => null } },
        channels: { cache: { find: () => null } }
    },
    roles: { add: async () => {} }
} as any;

async function main() {
    console.log('🧪 Starting Database Verification...');

    try {
        // 1. Test XP Manager
        console.log('🔹 Testing XP Manager...');
        await XpManager.addXp(mockMember, 100);
        const xpData = await XpManager.getStats(mockMember.id);
        console.log(`   XP Result: ${xpData.xp} (Expected >= 100)`);
        if (xpData.xp < 100) throw new Error('XP check failed');

        // 2. Test Warning Manager
        console.log('🔹 Testing Warning Manager...');
        await WarningManager.addWarning(mockMember, 'Test Warning', 'ADMIN_ID');
        const warnCount = await WarningManager.getWarningCount(mockMember.guild.id, mockMember.id);
        console.log(`   Warning Count: ${warnCount} (Expected >= 1)`);
        if (warnCount < 1) throw new Error('Warning check failed');

        // 3. Test Mercenary Manager
        console.log('🔹 Testing Mercenary Manager...');
        const merc = await MercenaryManager.getMercenary(mockMember.id);
        console.log(`   Mercenary Profile: Contracts=${merc.contracts}`);
        if (merc.contracts === undefined) throw new Error('Mercenary check failed');

        console.log('✅ ALL SYSTEMS OPERATIONAL!');
        console.log('   Connected to Supabase successfully.');

        // Cleanup
        await prisma.warning.deleteMany({ where: { userId: mockMember.id } });
        await prisma.userXP.deleteMany({ where: { userId: mockMember.id } });
        await prisma.mercenaryProfile.deleteMany({ where: { userId: mockMember.id } });
        await prisma.user.deleteMany({ where: { id: mockMember.id } });
        
    } catch (e) {
        console.error('❌ Verification Failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
