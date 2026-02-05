import fs from 'fs';
import path from 'path';
import { GuildMember, TextChannel } from 'discord.js';
import { LogManager, LogType, LogLevel } from '../logger/LogManager';

const WARNINGS_FILE = path.join(process.cwd(), 'data', 'warnings.json');

interface Warning {
    reason: string;
    timestamp: number;
    moderatorId: string; // 'AUTO_MOD' ou ID do moderador
}

interface UserWarnings {
    [userId: string]: Warning[];
}

interface GuildWarnings {
    [guildId: string]: UserWarnings;
}

export class WarningManager {
    private static warnings: GuildWarnings = {};

    static load() {
        try {
            if (fs.existsSync(WARNINGS_FILE)) {
                this.warnings = JSON.parse(fs.readFileSync(WARNINGS_FILE, 'utf-8'));
            }
        } catch (error) {
            console.error('Erro ao carregar warnings:', error);
            this.warnings = {};
        }
    }

    static save() {
        try {
            fs.writeFileSync(WARNINGS_FILE, JSON.stringify(this.warnings, null, 2));
        } catch (error) {
            console.error('Erro ao salvar warnings:', error);
        }
    }

    static async addWarning(member: GuildMember, reason: string, moderatorId: string = 'AUTO_MOD') {
        const guildId = member.guild.id;
        const userId = member.id;

        if (!this.warnings[guildId]) this.warnings[guildId] = {};
        if (!this.warnings[guildId][userId]) this.warnings[guildId][userId] = [];

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

    static removeWarning(guildId: string, userId: string): boolean {
        if (this.warnings[guildId]?.[userId]?.length > 0) {
            this.warnings[guildId][userId].pop(); // Remove o último aviso
            this.save();
            return true;
        }
        return false;
    }

    static clearWarnings(guildId: string, userId: string): boolean {
        if (this.warnings[guildId]?.[userId]) {
            delete this.warnings[guildId][userId];
            this.save();
            return true;
        }
        return false;
    }

    private static async checkPunishments(member: GuildMember, count: number) {
        let punishment = '';
        let duration = 0;

        // Escada de Punições
        if (count === 3) {
            duration = 10 * 60 * 1000; // 10 minutos
            punishment = 'Timeout (10min)';
        } else if (count === 5) {
            duration = 60 * 60 * 1000; // 1 hora
            punishment = 'Timeout (1h)';
        } else if (count >= 7) {
            duration = 24 * 60 * 60 * 1000; // 24 horas
            punishment = 'Timeout (24h)';
        }

        if (duration > 0) {
            try {
                await member.timeout(duration, `Acúmulo de Advertências (${count})`);
                
                // Notificar no canal (se possível, mas o AutoMod já notifica. Aqui focamos no log)
                await LogManager.log({
                    guild: member.guild,
                    type: LogType.MODERATION,
                    level: LogLevel.WARN,
                    title: '⚖️ Punição Automática Aplicada',
                    description: `O usuário atingiu ${count} advertências e recebeu uma punição.`,
                    executor: member.client.user!,
                    target: member.user,
                    fields: [
                        { name: 'Punição', value: punishment, inline: true },
                        { name: 'Motivo Última Warn', value: this.warnings[member.guild.id][member.id].slice(-1)[0].reason, inline: true }
                    ]
                });

            } catch (error) {
                console.error(`Falha ao aplicar punição em ${member.user.tag}:`, error);
            }
        }
    }

    static getWarningCount(guildId: string, userId: string): number {
        return this.warnings[guildId]?.[userId]?.length || 0;
    }

    static getWarnings(guildId: string, userId: string): Warning[] {
        return this.warnings[guildId]?.[userId] || [];
    }
}

// Carregar ao iniciar (será chamado no index ou primeira execução)
WarningManager.load();
