"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.XpManager = void 0;
const discord_js_1 = require("discord.js");
const constants_1 = require("./constants");
const logger_1 = __importDefault(require("../../core/logger"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// JSON Persistence Path
const DB_PATH = path_1.default.join(process.cwd(), 'data', 'xp_data.json');
// Ensure data directory exists
if (!fs_1.default.existsSync(path_1.default.dirname(DB_PATH))) {
    fs_1.default.mkdirSync(path_1.default.dirname(DB_PATH), { recursive: true });
}
// Load DB from JSON
let xpDb = new Map();
try {
    if (fs_1.default.existsSync(DB_PATH)) {
        const rawData = fs_1.default.readFileSync(DB_PATH, 'utf-8');
        const json = JSON.parse(rawData);
        xpDb = new Map(Object.entries(json));
    }
}
catch (error) {
    logger_1.default.error(error, 'Failed to load XP Database');
}
class XpManager {
    static saveDb() {
        try {
            const obj = Object.fromEntries(xpDb);
            fs_1.default.writeFileSync(DB_PATH, JSON.stringify(obj, null, 2));
        }
        catch (error) {
            logger_1.default.error(error, 'Failed to save XP Database');
        }
    }
    static async addXp(member, amount) {
        if (member.user.bot)
            return;
        const data = xpDb.get(member.id) || { xp: 0, level: 1, lastMessage: 0 };
        // Cooldown check for messages (if amount matches message range)
        if (amount >= constants_1.XP_RATES.MESSAGE_MIN && amount <= constants_1.XP_RATES.MESSAGE_MAX) {
            if (Date.now() - data.lastMessage < constants_1.XP_RATES.COOLDOWN)
                return;
            data.lastMessage = Date.now();
        }
        data.xp += amount;
        // Check Level Up
        // Better logic: find highest level reached
        const reachedLevel = [...constants_1.XP_LEVELS].reverse().find(l => data.xp >= l.xp);
        if (reachedLevel && reachedLevel.level > data.level) {
            data.level = reachedLevel.level;
            await this.handleLevelUp(member, reachedLevel);
        }
        xpDb.set(member.id, data);
        this.saveDb(); // Save on every update (simple but effective for small scale)
    }
    static async handleLevelUp(member, levelData) {
        // 1. Assign Role
        const role = member.guild.roles.cache.find(r => r.name === levelData.role);
        if (role) {
            await member.roles.add(role);
        }
        // 2. Announce with Premium Embed
        const channel = member.guild.channels.cache.find(c => c.name === '🏅-conquistas');
        if (channel) {
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle('⭐ PROMOÇÃO DE CAMPO')
                .setDescription(`**ATENÇÃO TODOS!**\n\nO operador **${member}** acumulou experiência de combate suficiente e foi promovido.`)
                .setColor('#FFD700') // Gold
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/3112/3112946.png') // Gold Medal Icon
                .addFields({ name: '🎖️ Nova Patente', value: `\`${levelData.role.toUpperCase()}\``, inline: true }, { name: '📊 Nível', value: `**${levelData.level}**`, inline: true }, { name: '📈 XP Total', value: `${(await this.getStats(member.id)).xp}`, inline: true })
                .setImage('https://i.pinimg.com/originals/30/1e/52/301e522e3799079728cb64f3d4569527.gif') // Level Up GIF (Gold Confetti)
                .setFooter({ text: 'Continue engajando para subir de patente!', iconURL: member.guild.iconURL() || undefined })
                .setTimestamp();
            await channel.send({ content: `🎉 Parabéns ${member}!`, embeds: [embed] });
        }
    }
    static getStats(memberId) {
        return xpDb.get(memberId) || { xp: 0, level: 1, lastMessage: 0 };
    }
}
exports.XpManager = XpManager;
