"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const WarningManager_1 = require("../../modules/moderation/WarningManager");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Remove a última advertência de um usuário')
        .addUserOption(option => option.setName('usuario')
        .setDescription('O usuário para remover a advertência')
        .setRequired(true))
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario', true);
        const guildId = interaction.guildId;
        const success = WarningManager_1.WarningManager.removeWarning(guildId, user.id);
        if (success) {
            const currentCount = WarningManager_1.WarningManager.getWarningCount(guildId, user.id);
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle('✅ Advertência Removida')
                .setColor('#00FF00')
                .setDescription(`A última advertência de ${user} foi removida com sucesso.`)
                .addFields({ name: 'Contagem Atual', value: currentCount.toString() });
            await interaction.reply({ embeds: [embed] });
        }
        else {
            await interaction.reply({
                content: `O usuário ${user} não possui advertências para remover.`,
                ephemeral: true
            });
        }
    }
};
exports.default = command;
