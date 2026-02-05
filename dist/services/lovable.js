"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LovableService = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../core/config");
const logger_1 = __importDefault(require("../core/logger"));
const API_URL = "https://vwcnlhvawrodtpsswxrn.supabase.co/functions/v1/discord-bot-api";
// Simple In-Memory Cache
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds
class LovableService {
    static async callAPI(action, discordId, discordUsername, extraParams = {}, useCache = false) {
        const cacheKey = `${action}:${discordId}:${JSON.stringify(extraParams)}`;
        if (useCache) {
            const cached = cache.get(cacheKey);
            if (cached && Date.now() < cached.expires) {
                logger_1.default.debug(`🚀 Cache Hit: ${action}`);
                return { success: true, data: cached.data };
            }
        }
        try {
            logger_1.default.debug(`📡 API Call: ${action} for ${discordId}`);
            const headers = {
                "Content-Type": "application/json",
            };
            if (config_1.config.DISCORD_BOT_TOKEN) {
                headers["X-Bot-Token"] = config_1.config.DISCORD_BOT_TOKEN;
            }
            const response = await axios_1.default.post(API_URL, {
                action,
                discord_id: discordId,
                discord_username: discordUsername,
                ...extraParams,
            }, { headers });
            const result = response.data;
            // DEBUG: Logar resposta bruta da API para debug
            if (action === "get_ranking") {
                logger_1.default.info(`🔍 DEBUG RANKING DATA: ${JSON.stringify(result, null, 2)}`);
            }
            if (useCache && result.success) {
                cache.set(cacheKey, {
                    data: result.data,
                    expires: Date.now() + CACHE_TTL,
                });
            }
            return result;
        }
        catch (error) {
            // Melhorar log de erro
            if (error.response) {
                logger_1.default.error(`❌ API Error [${action}]: Status ${error.response.status}`);
                logger_1.default.error(`❌ API Error Data: ${JSON.stringify(error.response.data)}`);
            }
            else {
                logger_1.default.error(`❌ API Error [${action}]: ${error.message}`);
            }
            // MOCK MODE if API fails (for development if token is missing/invalid)
            if (config_1.config.NODE_ENV === "development" && !config_1.config.DISCORD_BOT_TOKEN) {
                logger_1.default.warn("⚠️ Falling back to MOCK DATA due to API error");
                return this.getMockData(action);
            }
            return {
                success: false,
                error: "Erro de comunicação com o servidor de dados.",
            };
        }
    }
    // --- Public Methods ---
    static async generateLoginLink(discordId, username) {
        return this.callAPI("generate_login_link", discordId, username);
    }
    static async getLinkStatus(discordId) {
        return this.callAPI("get_link_status", discordId);
    }
    static async getStats(discordId) {
        const response = await this.callAPI("get_stats", discordId, undefined, {}, true); // Cached
        // Fallback para Stats também
        if (!response.success) {
            logger_1.default.warn("⚠️ Stats API returned error, switching to Mock Data to prevent crash");
            return this.getMockData("get_stats");
        }
        return response;
    }
    static async getRanking(discordId, limit = 10) {
        const response = await this.callAPI("get_ranking", discordId, undefined, { limit }, true);
        // Se a API falhar (500 ou outro erro), ativar Mock Data
        if (!response.success) {
            logger_1.default.warn("⚠️ Ranking API returned error (500/Fail), switching to Mock Data to prevent crash");
            return this.getMockData("get_ranking");
        }
        return response;
    }
    static async getSeasonPass(discordId) {
        return this.callAPI("get_season_pass", discordId, undefined, {}, true);
    }
    static async getClan(discordId) {
        return this.callAPI("get_clan", discordId, undefined, {}, true);
    }
    static async getAchievements(discordId) {
        return this.callAPI("get_achievements", discordId, undefined, { limit: 5 }, true);
    }
    // --- Mock Data Helper ---
    static getMockData(action) {
        const mockData = {
            get_stats: {
                player_name: "LiiiraaK1nG",
                kd_ratio: 4.2,
                wins: 15,
                current_rank: "Survivor",
                total_rp: 8355,
                clan_tag: "HWK",
                avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
                total_kills: 342,
                matches_played: 80,
            },
            get_ranking: [
                {
                    position: 1,
                    player_name: "LiiiraaK1nG",
                    total_rp: 8355,
                    current_rank: "Survivor",
                    clan_tag: "HWK",
                    avatar_url: null, // Forçar busca pelo Discord
                    kd_ratio: 4.2,
                    wins: 15,
                    total_kills: 342,
                    discord_id: "354050731558207488" // Seu ID real (Liiiraa)
                },
                {
                    position: 2,
                    player_name: "KLCraaaZyy",
                    total_rp: 3960,
                    current_rank: "Master",
                    clan_tag: "HWK",
                    avatar_url: null,
                    kd_ratio: 3.1,
                    wins: 8,
                    total_kills: 210,
                    discord_id: "987654321" // Mock ID
                },
                {
                    position: 3,
                    player_name: "O_GDs",
                    total_rp: 3137,
                    current_rank: "Diamond",
                    clan_tag: "HWK",
                    avatar_url: "https://cdn.discordapp.com/embed/avatars/2.png",
                    kd_ratio: 2.8,
                    wins: 5,
                    total_kills: 180,
                },
                {
                    position: 4,
                    player_name: "MEUREI",
                    total_rp: 2598,
                    current_rank: "Platinum",
                    clan_tag: "MR",
                    kd_ratio: 1.5,
                    wins: 2,
                    total_kills: 120,
                },
                {
                    position: 5,
                    player_name: "Kalifa777",
                    total_rp: 2127,
                    current_rank: "Gold",
                    clan_tag: "HWK",
                    kd_ratio: 1.2,
                    wins: 1,
                    total_kills: 90,
                },
                {
                    position: 6,
                    player_name: "EDIN-BALA",
                    total_rp: 476,
                    current_rank: "Bronze",
                    clan_tag: "MR",
                    kd_ratio: 0.8,
                    wins: 0,
                    total_kills: 45,
                },
            ],
            generate_login_link: {
                login_url: "https://mock-url.com",
                expires_in: "10 minutes",
            },
            get_link_status: { is_linked: true },
        };
        return { success: true, data: mockData[action] || null, is_mock: true };
    }
}
exports.LovableService = LovableService;
