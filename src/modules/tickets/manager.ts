import { 
  Guild, 
  User, 
  ChannelType, 
  PermissionFlagsBits, 
  TextChannel, 
  CategoryChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';
import { EmbedFactory } from '../../utils/embeds';
import { LogManager, LogType, LogLevel } from '../logger/LogManager';

import { TranscriptService } from '../../services/transcript';
import { formatDuration } from '../../utils/time';

export class TicketManager {
  static async createTicket(guild: Guild, user: User) {
    // Busca a nova categoria (pelo ID se possível seria melhor, mas vamos pelo nome novo)
    let category = guild.channels.cache.find(c => c.name === '📂 | OPERAÇÕES EM ANDAMENTO' && c.type === ChannelType.GuildCategory) as CategoryChannel;
    
    // Fallback para nome antigo se não rodou setup
    if (!category) {
        category = guild.channels.cache.find(c => c.name === '🆘 | AIR DROP' && c.type === ChannelType.GuildCategory) as CategoryChannel;
    }

    if (!category) throw new Error('Categoria de Tickets não encontrada. Execute /setup.');

    // Check existing
    const existing = guild.channels.cache.find(c => c.name === `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
    if (existing) return existing;

    // Create
    const channel = await guild.channels.create({
      name: `ticket-${user.username}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ]
    });

    // Send Init Message (Dashboard Style)
    const embed = new EmbedBuilder()
      .setTitle(`🆘 SUPORTE TÁTICO: ${user.username}`)
      .setDescription(`Olá, operador **${user.username}**. Nossa equipe de comando já foi notificada.\n\nEnquanto aguarda, por favor descreva seu problema com o máximo de detalhes possível.`)
      .setColor('#FFA500') // Orange
      .addFields(
        { name: '⏱️ Tempo Estimado', value: '5-10 minutos', inline: true },
        { name: '📋 Status', value: '🔴 Aguardando Staff', inline: true }
      )
      .setThumbnail(user.displayAvatarURL())
      .setFooter({ text: 'BlueZone Sentinel Support System', iconURL: guild.iconURL() || undefined })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('close_ticket').setLabel('Encerrar Chamado').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
      new ButtonBuilder().setCustomId('claim_ticket').setLabel('Assumir (Staff)').setStyle(ButtonStyle.Secondary).setEmoji('🙋‍♂️')
    );

    await channel.send({ content: `${user} ||@here||`, embeds: [embed], components: [row] });

    // Log Creation
    await LogManager.log({
        guild: guild,
        type: LogType.TICKET,
        level: LogLevel.SUCCESS,
        title: 'Ticket Aberto',
        description: `Novo chamado de suporte iniciado.`,
        target: user,
        fields: [
            { name: 'Canal', value: `<#${channel.id}>`, inline: true }
        ]
    });

    return channel;
  }

  static async closeTicket(channel: TextChannel, closer: User) {
    // Generate Transcript
    const transcript = await TranscriptService.generate(channel);

    // Calculate Duration
    const durationMs = Date.now() - channel.createdTimestamp;
    const durationStr = formatDuration(durationMs);

    // Audit Log
    await LogManager.log({
        guild: channel.guild,
        type: LogType.TICKET,
        level: LogLevel.DANGER,
        title: 'Ticket Encerrado',
        description: `Atendimento finalizado. O histórico da conversa está anexado.`,
        executor: closer,
        files: [transcript],
        fields: [
            { name: 'Ticket', value: channel.name, inline: true },
            { name: 'Duração', value: durationStr, inline: true }
        ]
    });

    // Delete
    await channel.delete();
  }
}
