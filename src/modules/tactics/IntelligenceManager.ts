import { db } from '../../core/DatabaseManager';
import logger from '../../core/logger';
import { LiquipediaScraper } from './scrapers/LiquipediaScraper';
import { WEAPONS } from './weapons'; // Fallback static data
import { MAPS } from './maps';
import { PRO_ROTATIONS } from './pro_rotations';

export class IntelligenceManager {
    
    /**
     * Initializes the Intelligence Database.
     * Seeds data if empty.
     */
    static async init() {
        const count = await db.prisma.weaponMeta.count();
        if (count === 0) {
            logger.info("🧠 Inicializando Banco de Inteligência (Seeding)...");
            await this.seedDatabase();
        }
    }

    /**
     * Seeds the database with the hardcoded TS data (Initial Knowledge)
     */
    static async seedDatabase() {
        // Seed Weapons
        for (const [type, weapons] of Object.entries(WEAPONS)) {
            for (const w of weapons) {
                await db.prisma.weaponMeta.upsert({
                    where: { name: w.name },
                    update: {},
                    create: {
                        name: w.name,
                        type: w.type,
                        ammo: w.ammo,
                        damage: w.damage,
                        tier: w.tier,
                        description: w.description,
                        meta_notes: w.meta_notes
                    }
                });
            }
        }

        // Seed Maps
        for (const [key, m] of Object.entries(MAPS)) {
            await db.prisma.mapStrategy.upsert({
                where: { name: m.name },
                update: {},
                create: {
                    name: m.name,
                    size: m.size,
                    image: m.image,
                    features: m.features,
                    locations: m.locations as any // Prisma JSON type
                }
            });
        }

        // Seed Pro Rotations
        for (const p of PRO_ROTATIONS) {
            await db.prisma.proRotation.upsert({
                where: { team_map: { team: p.team, map: p.map } },
                update: {},
                create: {
                    team: p.team,
                    map: p.map,
                    drop_spot: p.drop_spot,
                    strategy: p.strategy,
                    signature_move: p.signature_move
                }
            });
        }
        logger.info("🧠 Seeding concluído com sucesso.");
    }

    /**
     * Updates Weapon Stats from External Sources (Liquipedia)
     * This is the "Auto-Learning" function.
     */
    static async updateFromSource() {
        const scrapedData = await LiquipediaScraper.scrapeWeapons();
        
        if (!scrapedData || scrapedData.length === 0) {
            logger.warn("⚠️ Abortando atualização automática: Fonte de dados vazia.");
            return;
        }

        let updates = 0;
        for (const weapon of scrapedData) {
            // Only update damage if it changed significantly (prevents noise)
            const existing = await db.prisma.weaponMeta.findUnique({ where: { name: weapon.name } });
            
            if (existing && existing.damage !== weapon.damage) {
                await db.prisma.weaponMeta.update({
                    where: { name: weapon.name },
                    data: { 
                        damage: weapon.damage,
                        meta_notes: `${existing.meta_notes} [AUTO-UPDATE: Dano ajustado de ${existing.damage} para ${weapon.damage}]`
                    }
                });
                updates++;
                logger.info(`🔄 [AUTO-UPDATE] ${weapon.name}: Dano ${existing.damage} -> ${weapon.damage}`);
            }
        }

        if (updates > 0) {
            logger.info(`✅ Atualização automática concluída. ${updates} armas modificadas.`);
        } else {
            logger.info("✅ Nenhuma mudança de meta detectada.");
        }
    }

    // --- Accessors ---

    static async getWeaponsByType(type: string) {
        return db.prisma.weaponMeta.findMany({ where: { type } });
    }

    static async getMap(name: string) {
        return db.prisma.mapStrategy.findUnique({ where: { name } });
    }

    static async getProTeam(teamName: string) {
        return db.prisma.proRotation.findFirst({ where: { team: teamName } });
    }
}
