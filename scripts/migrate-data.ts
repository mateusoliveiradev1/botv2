import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting migration...');

    // 1. Migrate XP
    const xpPath = path.join(process.cwd(), 'data', 'xp_data.json');
    if (fs.existsSync(xpPath)) {
        console.log('📦 Reading XP Data...');
        const rawXp = fs.readFileSync(xpPath, 'utf-8');
        const xpData = JSON.parse(rawXp);
        console.log(`Found ${Object.keys(xpData).length} users in XP data.`);
        
        for (const [userId, data] of Object.entries(xpData) as any) {
            try {
                // Create User first if not exists
                await prisma.user.upsert({
                    where: { id: userId },
                    update: {},
                    create: { id: userId, username: 'Unknown (Migrated)' }
                });

                // Create XP
                await prisma.userXP.upsert({
                    where: { userId },
                    update: {
                        xp: data.xp,
                        level: data.level,
                        lastMessageAt: new Date(data.lastMessage || 0)
                    },
                    create: {
                        userId,
                        xp: data.xp,
                        level: data.level,
                        lastMessageAt: new Date(data.lastMessage || 0)
                    }
                });
            } catch (e) {
                console.error(`Failed to migrate XP for user ${userId}:`, e);
            }
        }
        console.log('✅ XP Migration complete.');
    } else {
        console.log('⚠️ No XP data file found.');
    }

    // 2. Migrate Warnings
    const warnPath = path.join(process.cwd(), 'data', 'warnings.json');
    if (fs.existsSync(warnPath)) {
        console.log('📦 Reading Warnings Data...');
        const rawWarn = fs.readFileSync(warnPath, 'utf-8');
        const warnData = JSON.parse(rawWarn);
        let warnCount = 0;
        
        // Structure: { guildId: { userId: [warnings] } }
        for (const guildId of Object.keys(warnData)) {
            for (const userId of Object.keys(warnData[guildId])) {
                const warnings = warnData[guildId][userId];
                
                try {
                    // Ensure user exists
                    await prisma.user.upsert({
                        where: { id: userId },
                        update: {},
                        create: { id: userId, username: 'Unknown (Migrated)' }
                    });

                    for (const warn of warnings) {
                        await prisma.warning.create({
                            data: {
                                userId,
                                guildId,
                                moderatorId: warn.moderatorId || 'AUTO_MOD',
                                reason: warn.reason || 'No reason',
                                createdAt: new Date(warn.timestamp || Date.now())
                            }
                        });
                        warnCount++;
                    }
                } catch (e) {
                    console.error(`Failed to migrate warnings for user ${userId}:`, e);
                }
            }
        }
        console.log(`✅ Warnings Migration complete. Imported ${warnCount} warnings.`);
    } else {
        console.log('⚠️ No Warnings data file found.');
    }

    // 3. Migrate Mercenaries
    const mercPath = path.join(process.cwd(), 'data', 'mercenaries.json');
    if (fs.existsSync(mercPath)) {
        console.log('📦 Reading Mercenary Data...');
        const rawMerc = fs.readFileSync(mercPath, 'utf-8');
        const mercData = JSON.parse(rawMerc);
        // Structure: { mercenaries: { userId: { ... } } }
        const mercenaries = mercData.mercenaries || {};
        
        for (const [userId, data] of Object.entries(mercenaries) as any) {
            try {
                // Ensure user exists
                await prisma.user.upsert({
                    where: { id: userId },
                    update: {},
                    create: { id: userId, username: 'Unknown (Migrated)' }
                });

                // Create Profile
                await prisma.mercenaryProfile.upsert({
                    where: { userId },
                    update: {
                        contracts: data.contracts,
                        repComms: data.reputation?.comms || 0,
                        repGunplay: data.reputation?.gunplay || 0,
                        repSense: data.reputation?.sense || 0,
                        repSynergy: data.reputation?.synergy || 0,
                        repCount: data.reputation?.count || 0,
                    },
                    create: {
                        userId,
                        contracts: data.contracts,
                        repComms: data.reputation?.comms || 0,
                        repGunplay: data.reputation?.gunplay || 0,
                        repSense: data.reputation?.sense || 0,
                        repSynergy: data.reputation?.synergy || 0,
                        repCount: data.reputation?.count || 0,
                    }
                });

                // Create History
                if (data.history && Array.isArray(data.history)) {
                    for (const contract of data.history) {
                        // Try to parse date (DD/MM/YYYY)
                        let date = new Date();
                        if (contract.date && typeof contract.date === 'string') {
                            const parts = contract.date.split('/');
                            if (parts.length === 3) {
                                // JS Date: MM/DD/YYYY or YYYY-MM-DD
                                // Input: 07/02/2026 (DD/MM/YYYY)
                                date = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
                            }
                        }

                        await prisma.mercenaryContract.create({
                            data: {
                                mercenaryId: userId,
                                clanName: contract.clan || 'Unknown',
                                feedback: contract.feedback || null,
                                date: date
                            }
                        });
                    }
                }
            } catch (e) {
                console.error(`Failed to migrate mercenary data for user ${userId}:`, e);
            }
        }
        console.log('✅ Mercenary Migration complete.');
    } else {
        console.log('⚠️ No Mercenary data file found.');
    }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
