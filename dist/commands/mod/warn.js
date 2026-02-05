"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const WarningManager_1 = require("../../modules/moderation/WarningManager");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('warn')
        .setDescription('Aplica uma advertência a um usuário')
        .addUserOption(option => option.setName('usuario')
        .setDescription('O usuário a ser advertido')
        .setRequired(true))
        .addStringOption(option => option.setName('motivo')
        .setDescription('Motivo da advertência')
        .setRequired(true))
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario', true);
        const reason = interaction.options.getString('motivo', true);
        const member = interaction.guild?.members.cache.get(user.id);
        if (!member) {
            await interaction.reply({ content: 'Usuário não encontrado no servidor.', ephemeral: true });
            return;
        }
        if (user.id === interaction.user.id) {
            await interaction.reply({ content: 'Você não pode advertir a si mesmo.', ephemeral: true });
            return;
        }
        if (member.permissions.has(discord_js_1.PermissionFlagsBits.Administrator)) {
            await interaction.reply({ content: 'Você não pode advertir um Administrador.', ephemeral: true });
            return;
        }
        const count = await WarningManager_1.WarningManager.addWarning(member, reason, interaction.user.id);
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('⚠️ Advertência Aplicada')
            .setColor('#FFA500')
            .addFields({ name: 'Usuário', value: `${user} (${user.tag})`, inline: true }, { name: 'Motivo', value: reason, inline: true }, { name: 'Total de Warns', value: count.toString(), inline: true }, { name: 'Moderador', value: interaction.user.toString(), inline: false })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
        // Tenta avisar o usuário no DM
        try {
            await user.send(`Você recebeu uma advertência no servidor **${interaction.guild?.name}**.\n**Motivo:** ${reason}\n**Total:** ${count}`);
        }
        catch (e) {
            // DM fechada, ignora
        }
    }
};
exports.default = command;
