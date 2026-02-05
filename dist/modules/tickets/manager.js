"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketManager = void 0;
const discord_js_1 = require("discord.js");
const LogManager_1 = require("../logger/LogManager");
const transcript_1 = require("../../services/transcript");
const time_1 = require("../../utils/time");
class TicketManager {
    static async createTicket(guild, user) {
        // Busca a nova categoria (pelo ID se possível seria melhor, mas vamos pelo nome novo)
        let category = guild.channels.cache.find(c => c.name === '📂 | OPERAÇÕES EM ANDAMENTO' && c.type === discord_js_1.ChannelType.GuildCategory);
        // Fallback para nome antigo se não rodou setup
        if (!category) {
            category = guild.channels.cache.find(c => c.name === '🆘 | AIR DROP' && c.type === discord_js_1.ChannelType.GuildCategory);
        }
        if (!category)
            throw new Error('Categoria de Tickets não encontrada. Execute /setup.');
        // Check existing
        const existing = guild.channels.cache.find(c => c.name === `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
        if (existing)
            return existing;
        // Create
        const channel = await guild.channels.create({
            name: `ticket-${user.username}`,
            type: discord_js_1.ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                { id: guild.id, deny: [discord_js_1.PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [discord_js_1.PermissionFlagsBits.ViewChannel, discord_js_1.PermissionFlagsBits.SendMessages] },
            ]
        });
        // Send Init Message (Dashboard Style)
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`🆘 SUPORTE TÁTICO: ${user.username}`)
            .setDescription(`Olá, operador **${user.username}**. Nossa equipe de comando já foi notificada.\n\nEnquanto aguarda, por favor descreva seu problema com o máximo de detalhes possível.`)
            .setColor('#FFA500') // Orange
            .addFields({ name: '⏱️ Tempo Estimado', value: '5-10 minutos', inline: true }, { name: '📋 Status', value: '🔴 Aguardando Staff', inline: true })
            .setThumbnail(user.displayAvatarURL())
            .setFooter({ text: 'BlueZone Sentinel Support System', iconURL: guild.iconURL() || undefined })
            .setTimestamp();
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId('close_ticket').setLabel('Encerrar Chamado').setStyle(discord_js_1.ButtonStyle.Danger).setEmoji('🔒'), new discord_js_1.ButtonBuilder().setCustomId('claim_ticket').setLabel('Assumir (Staff)').setStyle(discord_js_1.ButtonStyle.Secondary).setEmoji('🙋‍♂️'));
        await channel.send({ content: `${user} ||@here||`, embeds: [embed], components: [row] });
        // Log Creation
        await LogManager_1.LogManager.log({
            guild: guild,
            type: LogManager_1.LogType.TICKET,
            level: LogManager_1.LogLevel.SUCCESS,
            title: 'Ticket Aberto',
            description: `Novo chamado de suporte iniciado.`,
            target: user,
            fields: [
                { name: 'Canal', value: `<#${channel.id}>`, inline: true }
            ]
        });
        return channel;
    }
    static async closeTicket(channel, closer) {
        // Generate Transcript
        const transcript = await transcript_1.TranscriptService.generate(channel);
        // Calculate Duration
        const durationMs = Date.now() - channel.createdTimestamp;
        const durationStr = (0, time_1.formatDuration)(durationMs);
        // Audit Log
        await LogManager_1.LogManager.log({
            guild: channel.guild,
            type: LogManager_1.LogType.TICKET,
            level: LogManager_1.LogLevel.DANGER,
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
exports.TicketManager = TicketManager;
