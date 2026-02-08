import { Guild, TextChannel, EmbedBuilder, User, ColorResolvable, AttachmentBuilder } from 'discord.js';
import logger from '../../core/logger';

export enum LogType {
  TICKET = '🎫 TICKET',
  MODERATION = '⚖️ MODERAÇÃO',
  ADMIN = '🛡️ ADMIN',
  SYSTEM = '⚙️ SYSTEM',
  MEMBER = '👥 MEMBRO'
}

export enum LogLevel {
  INFO = '#0099FF', // Blue
  SUCCESS = '#00FF00', // Green
  WARN = '#FFA500', // Orange
  DANGER = '#FF0000', // Red
}

export interface LogEntry {
  guild: Guild;
  type: LogType;
  level: LogLevel;
  title: string;
  description: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  executor?: User;
  target?: User;
  footer?: string;
  files?: AttachmentBuilder[];
}

import { config } from '../../core/config';
import prisma from '../../core/prisma';

export class LogManager {
  private static async getLogChannel(guild: Guild): Promise<TextChannel | null> {
    // 1. Tenta pegar pelo ID configurado no .env
    if (config.LOG_CHANNEL_ID) {
        const channel = guild.channels.cache.get(config.LOG_CHANNEL_ID) as TextChannel;
        if (channel) return channel;
    }

    // 2. Fallback: Procura pelo nome padrão
    const channel = guild.channels.cache.find(c => c.name === '🛡️-caixa-preta') as TextChannel;
    if (!channel) {
      // Evita spam de logs se não achar o canal
      // logger.warn(`⚠️ Log channel #caixa-preta not found in guild ${guild.name}`);
      return null;
    }
    return channel;
  }

  static async log(entry: LogEntry) {
    const channel = await this.getLogChannel(entry.guild);
    if (!channel) return;

    // Premium Layout Logic
    const embed = new EmbedBuilder()
      .setColor(entry.level as ColorResolvable)
      .setTimestamp();

    // Custom Headers based on Type
    let icon = '';
    switch(entry.type) {
        case LogType.TICKET: icon = '🎫'; break;
        case LogType.MODERATION: icon = '⚖️'; break;
        case LogType.ADMIN: icon = '🛡️'; break;
        case LogType.MEMBER: icon = '👤'; break;
        default: icon = '📝';
    }

    embed.setAuthor({ name: `${icon} LOG DO SISTEMA | ${entry.type}`, iconURL: entry.guild.iconURL() || undefined });
    embed.setTitle(entry.title);
    embed.setDescription(entry.description);

    // ID Card Layout for Members/Targets
    if (entry.target) {
        embed.setThumbnail(entry.target.displayAvatarURL());
        embed.addFields(
            { name: '🆔 Alvo', value: `${entry.target}\n\`${entry.target.id}\``, inline: true }
        );
    }

    if (entry.executor) {
        embed.addFields(
            { name: '👮‍♂️ Executor', value: `${entry.executor}\n\`${entry.executor.id}\``, inline: true }
        );
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
      // 1. Send to Discord
      await channel.send({ embeds: [embed], files: entry.files || [] });
      
      // 2. Persist to Database (AuditLog)
      await prisma.auditLog.create({
        data: {
            guildId: entry.guild.id,
            type: entry.type,
            title: entry.title,
            description: entry.description + (entry.fields ? '\n\n' + entry.fields.map(f => `**${f.name}**: ${f.value}`).join('\n') : ''),
            executorId: entry.executor?.id || null,
            targetId: entry.target?.id || null,
            createdAt: new Date()
        }
      });

    } catch (error) {
      logger.error(error, 'Failed to process log (Discord or DB)');
    }
  }
}
