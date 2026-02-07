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
  static async handleInteraction(interaction: any) {
    if (!interaction.isButton()) return;
    
    // 1. Open Ticket
    if (interaction.customId === 'open_ticket') {
         await interaction.deferReply({ flags: 64 });
         try {
             const channel = await this.createTicket(interaction.guild!, interaction.user);
             await interaction.editReply({ 
                 content: `✅ Ticket criado com sucesso: ${channel}`
             });
         } catch (e: any) {
             await interaction.editReply({ content: `❌ Erro: ${e.message}` });
         }
         return;
    }

    // 2. Claim Ticket
    if (interaction.customId === 'claim_ticket') {
         await this.handleClaim(interaction);
         return;
    }

    // 3. Close Ticket
    if (interaction.customId === 'close_ticket') {
         await this.handleCloseRequest(interaction);
         return;
    }
  }

  static async handleClaim(interaction: any) {
        // Check Permission (MANAGE_MESSAGES as proxy for Staff)
        const member = interaction.member;
        if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            await interaction.reply({ content: '⛔ Apenas Staff pode assumir tickets.', flags: 64 });
            return;
        }

        const channel = interaction.channel as TextChannel;
        const originalEmbed = interaction.message.embeds[0];
        
        // Update Embed
        const newEmbed = EmbedBuilder.from(originalEmbed)
            .setColor('#00FF00') // Green
            .spliceFields(1, 1, { name: '📋 Status', value: `🟢 Em Atendimento por ${interaction.user.username}`, inline: true });

        // Update Buttons (Disable Claim)
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
             new ButtonBuilder().setCustomId('close_ticket').setLabel('Encerrar Chamado').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
             new ButtonBuilder().setCustomId('claim_ticket').setLabel('Assumido').setStyle(ButtonStyle.Secondary).setEmoji('👨‍💻').setDisabled(true)
        );

        await interaction.update({ embeds: [newEmbed], components: [row] });
        await channel.send(`👋 **${interaction.user}** assumiu este chamado. Como podemos ajudar?`);

        // Log
        await LogManager.log({
            guild: interaction.guild!,
            type: LogType.TICKET,
            level: LogLevel.INFO,
            title: 'Ticket Assumido',
            description: `Staff iniciou o atendimento.`,
            executor: interaction.user,
            fields: [{ name: 'Canal', value: channel.name, inline: true }]
        });
  }

  static async handleCloseRequest(interaction: any) {
      await interaction.reply({ content: '🔒 Encerrando ticket em 5 segundos...' });
      
      // 5s Delay
      setTimeout(async () => {
          if (interaction.channel) {
              await this.closeTicket(interaction.channel as TextChannel, interaction.user);
          }
      }, 5000);
  }

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
