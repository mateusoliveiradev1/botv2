"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogManager = exports.LogLevel = exports.LogType = void 0;
const discord_js_1 = require("discord.js");
const logger_1 = __importDefault(require("../../core/logger"));
var LogType;
(function (LogType) {
    LogType["TICKET"] = "\uD83C\uDFAB TICKET";
    LogType["MODERATION"] = "\u2696\uFE0F MODERA\u00C7\u00C3O";
    LogType["ADMIN"] = "\uD83D\uDEE1\uFE0F ADMIN";
    LogType["SYSTEM"] = "\u2699\uFE0F SYSTEM";
    LogType["MEMBER"] = "\uD83D\uDC65 MEMBRO";
})(LogType || (exports.LogType = LogType = {}));
var LogLevel;
(function (LogLevel) {
    LogLevel["INFO"] = "#0099FF";
    LogLevel["SUCCESS"] = "#00FF00";
    LogLevel["WARN"] = "#FFA500";
    LogLevel["DANGER"] = "#FF0000";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
const config_1 = require("../../core/config");
class LogManager {
    static async getLogChannel(guild) {
        // 1. Tenta pegar pelo ID configurado no .env
        if (config_1.config.LOG_CHANNEL_ID) {
            const channel = guild.channels.cache.get(config_1.config.LOG_CHANNEL_ID);
            if (channel)
                return channel;
        }
        // 2. Fallback: Procura pelo nome padrão
        const channel = guild.channels.cache.find(c => c.name === '🛡️-caixa-preta');
        if (!channel) {
            // Evita spam de logs se não achar o canal
            // logger.warn(`⚠️ Log channel #caixa-preta not found in guild ${guild.name}`);
            return null;
        }
        return channel;
    }
    static async log(entry) {
        const channel = await this.getLogChannel(entry.guild);
        if (!channel)
            return;
        // Premium Layout Logic
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(entry.level)
            .setTimestamp();
        // Custom Headers based on Type
        let icon = '';
        switch (entry.type) {
            case LogType.TICKET:
                icon = '🎫';
                break;
            case LogType.MODERATION:
                icon = '⚖️';
                break;
            case LogType.ADMIN:
                icon = '🛡️';
                break;
            case LogType.MEMBER:
                icon = '👤';
                break;
            default: icon = '📝';
        }
        embed.setAuthor({ name: `${icon} LOG DO SISTEMA | ${entry.type}`, iconURL: entry.guild.iconURL() || undefined });
        embed.setTitle(entry.title);
        embed.setDescription(entry.description);
        // ID Card Layout for Members/Targets
        if (entry.target) {
            embed.setThumbnail(entry.target.displayAvatarURL());
            embed.addFields({ name: '🆔 Alvo', value: `${entry.target}\n\`${entry.target.id}\``, inline: true });
        }
        if (entry.executor) {
            embed.addFields({ name: '👮‍♂️ Executor', value: `${entry.executor}\n\`${entry.executor.id}\``, inline: true });
        }
        // Custom Fields
        if (entry.fields) {
            // Add a spacer if needed, or just append
            embed.addFields(entry.fields);
        }
        // Footer with ID
        const logId = entry.footer || `LOG-ID: ${Date.now().toString(36).toUpperCase()}`;
        embed.setFooter({ text: logId, iconURL: 'https://cdn-icons-png.flaticon.com/512/2961/2961948.png' }); // Shield Icon
        try {
            await channel.send({ embeds: [embed], files: entry.files || [] });
        }
        catch (error) {
            logger_1.default.error(error, 'Failed to send audit log');
        }
    }
}
exports.LogManager = LogManager;
