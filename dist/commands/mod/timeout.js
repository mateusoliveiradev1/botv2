"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const LogManager_1 = require("../../modules/logger/LogManager");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Silenciar usuário')
        .addUserOption(option => option.setName('usuario').setDescription('Usuário').setRequired(true))
        .addIntegerOption(option => option.setName('minutos').setDescription('Tempo em minutos').setRequired(true))
        .addStringOption(option => option.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const minutes = interaction.options.getInteger('minutos') || 1;
        const reason = interaction.options.getString('motivo') || 'Sem motivo';
        const member = await interaction.guild?.members.fetch(user.id);
        if (!member)
            return;
        // Proteções de Moderação
        if (!member.moderatable) {
            await interaction.reply({ embeds: [embeds_1.EmbedFactory.error('Não posso silenciar este usuário (Cargo superior ou igual ao meu).')], ephemeral: true });
            return;
        }
        if (member.permissions.has(discord_js_1.PermissionFlagsBits.Administrator)) {
            await interaction.reply({ embeds: [embeds_1.EmbedFactory.error('Você não pode silenciar um Administrador.')], ephemeral: true });
            return;
        }
        try {
            await member.timeout(minutes * 60 * 1000, reason);
            // Premium Embed
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle('🔇 COMUNICAÇÃO CORTADA')
                .setDescription(`O operador **${user.tag}** foi colocado em silêncio de rádio temporário.`)
                .setColor('#FFFF00') // Yellow
                .setThumbnail(user.displayAvatarURL())
                .addFields({ name: '⏱️ Duração', value: `${minutes} minutos`, inline: true }, { name: '⚖️ Motivo', value: reason, inline: true }, { name: '👮‍♂️ Executor', value: interaction.user.toString(), inline: false })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
            // Audit Log
            await LogManager_1.LogManager.log({
                guild: interaction.guild,
                type: LogManager_1.LogType.MODERATION,
                level: LogManager_1.LogLevel.WARN,
                title: 'Timeout Aplicado',
                description: `Usuário silenciado temporariamente.`,
                executor: interaction.user,
                target: user,
                fields: [
                    { name: 'Duração', value: `${minutes} minutos`, inline: true },
                    { name: 'Motivo', value: reason, inline: true }
                ]
            });
        }
        catch (error) {
            await interaction.reply({ embeds: [embeds_1.EmbedFactory.error('Erro ao aplicar timeout.')], ephemeral: true });
        }
    }
};
exports.default = command;
