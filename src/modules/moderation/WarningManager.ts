import { GuildMember, TextChannel } from 'discord.js';
import { LogManager, LogType, LogLevel } from '../logger/LogManager';
import prisma from '../../core/prisma';

export class WarningManager {

    static async addWarning(member: GuildMember, reason: string, moderatorId: string = 'AUTO_MOD') {
        const guildId = member.guild.id;
        const userId = member.id;

        // Ensure User
        await prisma.user.upsert({
            where: { id: userId },
            update: { username: member.user.username },
            create: { id: userId, username: member.user.username }
        });

        // Add Warning
        await prisma.warning.create({
            data: {
                userId,
                guildId,
                moderatorId,
                reason
            }
        });

        const count = await this.getWarningCount(guildId, userId);
        await this.checkPunishments(member, count);
        
        return count;
    }

    static async removeWarning(guildId: string, userId: string): Promise<boolean> {
        const latest = await prisma.warning.findFirst({
            where: { userId, guildId },
            orderBy: { createdAt: 'desc' }
        });

        if (latest) {
            await prisma.warning.delete({ where: { id: latest.id } });
            return true;
        }
        return false;
    }

    static async clearWarnings(guildId: string, userId: string): Promise<boolean> {
        const result = await prisma.warning.deleteMany({
            where: { userId, guildId }
        });
        return result.count > 0;
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
                
                const warnings = await this.getWarnings(member.guild.id, member.id);
                const lastReason = warnings.length > 0 ? warnings[warnings.length - 1].reason : 'Unknown';

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
                        { name: 'Motivo Última Warn', value: lastReason, inline: true }
                    ]
                });

            } catch (error) {
                console.error(`Falha ao aplicar punição em ${member.user.tag}:`, error);
            }
        }
    }

    static async getWarningCount(guildId: string, userId: string): Promise<number> {
        return await prisma.warning.count({
            where: { userId, guildId }
        });
    }

    static async getWarnings(guildId: string, userId: string) {
        return await prisma.warning.findMany({
            where: { userId, guildId },
            orderBy: { createdAt: 'asc' }
        });
    }
}

