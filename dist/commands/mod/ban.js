"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const LogManager_1 = require("../../modules/logger/LogManager");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banir usuário')
        .addUserOption(option => option.setName('usuario').setDescription('Usuário a banir').setRequired(true))
        .addStringOption(option => option.setName('motivo').setDescription('Motivo do ban').setRequired(false))
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.BanMembers),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('motivo') || 'Sem motivo especificado';
        if (!user)
            return;
        // Proteções de Moderação
        const member = await interaction.guild?.members.fetch(user.id).catch(() => null);
        if (member) {
            if (!member.bannable) {
                await interaction.reply({ embeds: [embeds_1.EmbedFactory.error('Não posso banir este usuário (Cargo superior ou igual ao meu).')], ephemeral: true });
                return;
            }
            if (member.id === interaction.guild?.ownerId) {
                await interaction.reply({ embeds: [embeds_1.EmbedFactory.error('Você não pode banir o dono do servidor.')], ephemeral: true });
                return;
            }
        }
        try {
            // Tenta avisar o usuário via DM antes do ban
            try {
                await user.send({
                    embeds: [new discord_js_1.EmbedBuilder()
                            .setTitle(`🚫 Você foi banido de ${interaction.guild?.name}`)
                            .setColor('#FF0000')
                            .setDescription(`**Motivo:** ${reason}`)
                            .setTimestamp()]
                });
            }
            catch (dmError) {
                // Ignora erro de DM fechada
            }
            await interaction.guild?.members.ban(user, { reason });
            // Premium Embed
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle('🚫 AMEAÇA NEUTRALIZADA')
                .setDescription(`O martelo da justiça foi batido. O operador **${user.tag}** foi removido permanentemente do perímetro.`)
                .setColor('#8B0000') // Dark Red
                .setThumbnail(user.displayAvatarURL())
                .addFields({ name: '⚖️ Motivo', value: reason, inline: false }, { name: '👮‍♂️ Executor', value: interaction.user.toString(), inline: true }, { name: '🆔 User ID', value: `\`${user.id}\``, inline: true })
                .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z6cW55eHl5eHl5eHl5eHl5eHl5eHl5eHl5eHl5eHl5eHl5eHl5/feqkVgjJpYhq/giphy.gif') // Ban Hammer GIF (Generic or Custom)
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
            // Audit Log
            await LogManager_1.LogManager.log({
                guild: interaction.guild,
                type: LogManager_1.LogType.MODERATION,
                level: LogManager_1.LogLevel.DANGER,
                title: 'Banimento Executado',
                description: `Usuário banido permanentemente.`,
                executor: interaction.user,
                target: user,
                fields: [
                    { name: 'Motivo', value: reason, inline: true }
                ]
            });
        }
        catch (error) {
            await interaction.reply({ embeds: [embeds_1.EmbedFactory.error('Não foi possível banir. Verifique permissões.')], ephemeral: true });
        }
    }
};
exports.default = command;
