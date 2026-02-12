import axios from 'axios';
import * as cheerio from 'cheerio';
import logger from '../../../core/logger';

export interface ScrapedWeapon {
    name: string;
    damage: number;
    ammo: string;
    dps?: number;
}

export class LiquipediaScraper {
    private static readonly BASE_URL = 'https://liquipedia.net/pubg';

    /**
     * Scrapes Weapon stats from Liquipedia
     * Fallback mechanism: If structure changes, returns null to avoid breaking DB.
     */
    static async scrapeWeapons(): Promise<ScrapedWeapon[] | null> {
        try {
            logger.info("📡 Iniciando scraping tático da Liquipedia (Weapons)...");
            
            // Using a public wiki URL. Note: In production, consider rate limits.
            const { data } = await axios.get(`${this.BASE_URL}/Weapons`, {
                headers: { 'User-Agent': 'BlueZoneSentinel/2.0' }
            });

            const $ = cheerio.load(data);
            const weapons: ScrapedWeapon[] = [];

            // Selector strategy: Look for tables with "wikitable" class
            // This is a simplified parser logic assuming standard Liquipedia table structure
            $('.wikitable tbody tr').each((i, row) => {
                if (i === 0) return; // Skip header

                const cols = $(row).find('td');
                if (cols.length < 5) return;

                const name = $(cols[0]).text().trim();
                const damageStr = $(cols[2]).text().trim();
                const ammo = $(cols[1]).text().trim();

                const damage = parseInt(damageStr, 10);

                if (name && !isNaN(damage)) {
                    weapons.push({
                        name,
                        damage,
                        ammo
                    });
                }
            });

            logger.info(`✅ Scraping concluído. ${weapons.length} armas extraídas.`);
            return weapons;

        } catch (error) {
            logger.error(error, "❌ Falha no scraping tático da Liquipedia.");
            return null; // Safety fallback
        }
    }
}
