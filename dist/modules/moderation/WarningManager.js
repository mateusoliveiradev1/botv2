"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarningManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LogManager_1 = require("../logger/LogManager");
const WARNINGS_FILE = path_1.default.join(process.cwd(), 'data', 'warnings.json');
class WarningManager {
    static warnings = {};
    static load() {
        try {
            if (fs_1.default.existsSync(WARNINGS_FILE)) {
                this.warnings = JSON.parse(fs_1.default.readFileSync(WARNINGS_FILE, 'utf-8'));
            }
        }
        catch (error) {
            console.error('Erro ao carregar warnings:', error);
            this.warnings = {};
        }
    }
    static save() {
        try {
            fs_1.default.writeFileSync(WARNINGS_FILE, JSON.stringify(this.warnings, null, 2));
        }
        catch (error) {
            console.error('Erro ao salvar warnings:', error);
        }
    }
    static async addWarning(member, reason, moderatorId = 'AUTO_MOD') {
        const guildId = member.guild.id;
        const userId = member.id;
        if (!this.warnings[guildId])
            this.warnings[guildId] = {};
        if (!this.warnings[guildId][userId])
            this.warnings[guildId][userId] = [];
        this.warnings[guildId][userId].push({
            reason,
            timestamp: Date.now(),
            moderatorId
        });
        this.save();
        const count = this.warnings[guildId][userId].length;
        await this.checkPunishments(member, count);
        return count;
    }
    static removeWarning(guildId, userId) {
        if (this.warnings[guildId]?.[userId]?.length > 0) {
            this.warnings[guildId][userId].pop(); // Remove o último aviso
            this.save();
            return true;
        }
        return false;
    }
    static clearWarnings(guildId, userId) {
        if (this.warnings[guildId]?.[userId]) {
            delete this.warnings[guildId][userId];
            this.save();
            return true;
        }
        return false;
    }
    static async checkPunishments(member, count) {
        let punishment = '';
        let duration = 0;
        // Escada de Punições
        if (count === 3) {
            duration = 10 * 60 * 1000; // 10 minutos
            punishment = 'Timeout (10min)';
        }
        else if (count === 5) {
            duration = 60 * 60 * 1000; // 1 hora
            punishment = 'Timeout (1h)';
        }
        else if (count >= 7) {
            duration = 24 * 60 * 60 * 1000; // 24 horas
            punishment = 'Timeout (24h)';
        }
        if (duration > 0) {
            try {
                await member.timeout(duration, `Acúmulo de Advertências (${count})`);
                // Notificar no canal (se possível, mas o AutoMod já notifica. Aqui focamos no log)
                await LogManager_1.LogManager.log({
                    guild: member.guild,
                    type: LogManager_1.LogType.MODERATION,
                    level: LogManager_1.LogLevel.WARN,
                    title: '⚖️ Punição Automática Aplicada',
                    description: `O usuário atingiu ${count} advertências e recebeu uma punição.`,
                    executor: member.client.user,
                    target: member.user,
                    fields: [
                        { name: 'Punição', value: punishment, inline: true },
                        { name: 'Motivo Última Warn', value: this.warnings[member.guild.id][member.id].slice(-1)[0].reason, inline: true }
                    ]
                });
            }
            catch (error) {
                console.error(`Falha ao aplicar punição em ${member.user.tag}:`, error);
            }
        }
    }
    static getWarningCount(guildId, userId) {
        return this.warnings[guildId]?.[userId]?.length || 0;
    }
    static getWarnings(guildId, userId) {
        return this.warnings[guildId]?.[userId] || [];
    }
}
exports.WarningManager = WarningManager;
// Carregar ao iniciar (será chamado no index ou primeira execução)
WarningManager.load();
