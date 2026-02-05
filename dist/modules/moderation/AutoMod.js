"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoMod = void 0;
const discord_js_1 = require("discord.js");
const LogManager_1 = require("../logger/LogManager");
const badWords_1 = require("./badWords");
const WarningManager_1 = require("./WarningManager");
const SPAM_MAP = new Map();
class AutoMod {
    static async handle(message) {
        if (message.author.bot)
            return false;
        if (message.member?.permissions.has(discord_js_1.PermissionFlagsBits.Administrator) ||
            message.member?.permissions.has(discord_js_1.PermissionFlagsBits.ManageMessages)) {
            return false;
        }
        const contentLower = message.content.toLowerCase();
        // 1. Anti-Link (Invite & Suspicious Links)
        if (contentLower.includes('discord.gg/') ||
            contentLower.includes('discord.com/invite') ||
            badWords_1.SUSPICIOUS_DOMAINS.some(domain => contentLower.includes(domain))) {
            await this.punish(message, 'Divulgação de Links / Link Suspeito', true);
            return true;
        }
        // 2. Anti-Profanity / Scam
        if (badWords_1.BAD_WORDS.some(word => contentLower.includes(word))) {
            await this.punish(message, 'Linguagem Imprópria / Scam', true);
            return true;
        }
        // 3. Anti-Caps (Gritar)
        if (message.content.length > 10) {
            const capsCount = message.content.replace(/[^A-Z]/g, "").length;
            const percentage = capsCount / message.content.length;
            if (percentage > 0.7) {
                await this.punish(message, 'Uso excessivo de CAPS LOCK', true);
                return true;
            }
        }
        // 4. Anti-Spam (Flood)
        if (this.checkSpam(message)) {
            try {
                // Spam já aplica timeout direto além do warn normal
                await message.member?.timeout(60 * 1000, 'AutoMod: Spam/Flood');
                await this.punish(message, 'Spam/Flood detectado', true);
            }
            catch (e) { }
            return true;
        }
        return false;
    }
    static checkSpam(message) {
        const id = message.author.id;
        const now = Date.now();
        const data = SPAM_MAP.get(id) || { count: 0, lastMsg: 0 };
        if (now - data.lastMsg < 3000) { // 3 segundos
            data.count++;
        }
        else {
            data.count = 1;
        }
        data.lastMsg = now;
        SPAM_MAP.set(id, data);
        return data.count >= 5; // 5 mensagens em < 3s = Spam
    }
    static async punish(message, reason, log) {
        if (message.deletable)
            await message.delete().catch(() => { });
        // Adicionar advertência e verificar punições escalonadas
        let warnCount = 0;
        if (message.member) {
            warnCount = await WarningManager_1.WarningManager.addWarning(message.member, reason);
        }
        if (message.channel.isTextBased()) {
            const warning = await message.channel.send(`⚠️ ${message.author}, sua mensagem foi removida: **${reason}**. (Warn ${warnCount})`);
            setTimeout(() => warning.delete().catch(() => { }), 5000);
        }
        if (log) {
            await LogManager_1.LogManager.log({
                guild: message.guild,
                type: LogManager_1.LogType.MODERATION,
                level: LogManager_1.LogLevel.WARN,
                title: '🛡️ AutoMod Interceptou',
                description: `Uma infração foi detectada e tratada automaticamente.`,
                executor: message.client.user,
                target: message.author,
                fields: [
                    { name: 'Infração', value: reason, inline: true },
                    { name: 'Conteúdo', value: `\`\`\`${message.content.substring(0, 100)}\`\`\``, inline: false },
                    { name: 'Total de Warns', value: warnCount.toString(), inline: true }
                ]
            });
        }
    }
}
exports.AutoMod = AutoMod;
