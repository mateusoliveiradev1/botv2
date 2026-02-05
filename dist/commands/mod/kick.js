"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const LogManager_1 = require("../../modules/logger/LogManager");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsar usuário')
        .addUserOption(option => option.setName('usuario').setDescription('Usuário a expulsar').setRequired(true))
        .addStringOption(option => option.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.KickMembers),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('motivo') || 'Sem motivo';
        const member = await interaction.guild?.members.fetch(user.id);
        if (!member)
            return;
        // Proteções de Moderação
        if (!member.kickable) {
            await interaction.reply({ embeds: [embeds_1.EmbedFactory.error('Não posso expulsar este usuário (Cargo superior ou igual ao meu).')], ephemeral: true });
            return;
        }
        if (member.id === interaction.guild?.ownerId) {
            await interaction.reply({ embeds: [embeds_1.EmbedFactory.error('Você não pode expulsar o dono do servidor.')], ephemeral: true });
            return;
        }
        try {
            // Tenta avisar o usuário via DM antes do kick
            try {
                await user?.send({
                    embeds: [new discord_js_1.EmbedBuilder()
                            .setTitle(`🦵 Você foi expulso de ${interaction.guild?.name}`)
                            .setColor('#FFA500')
                            .setDescription(`**Motivo:** ${reason}\n\n*Você pode retornar ao servidor se receber um novo convite.*`)
                            .setTimestamp()]
                });
            }
            catch (dmError) {
                // Ignora erro de DM fechada
            }
            await member.kick(reason);
            // Premium Embed
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle('🦶 REMOÇÃO TÁTICA')
                .setDescription(`O operador **${user.tag}** foi retirado do esquadrão. Ele poderá retornar caso receba novo convite.`)
                .setColor('#FFA500') // Orange
                .setThumbnail(user.displayAvatarURL())
                .addFields({ name: '⚖️ Motivo', value: reason, inline: false }, { name: '👮‍♂️ Executor', value: interaction.user.toString(), inline: true })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
            // Audit Log
            await LogManager_1.LogManager.log({
                guild: interaction.guild,
                type: LogManager_1.LogType.MODERATION,
                level: LogManager_1.LogLevel.DANGER,
                title: 'Usuário Expulso (Kick)',
                description: `Membro removido forçadamente do servidor.`,
                executor: interaction.user,
                target: user,
                fields: [
                    { name: 'Motivo', value: reason, inline: true }
                ]
            });
        }
        catch (error) {
            await interaction.reply({ embeds: [embeds_1.EmbedFactory.error('Erro ao expulsar.')], ephemeral: true });
        }
    }
};
exports.default = command;
