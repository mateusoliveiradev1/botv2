"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const lovable_1 = require("../../services/lovable");
const embeds_1 = require("../../utils/embeds");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('conquistas')
        .setDescription('Suas últimas conquistas'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const response = await lovable_1.LovableService.getAchievements(interaction.user.id);
        if (response.success && response.data) {
            const list = response.data.map((a) => `${a.icon} **${a.name}**: ${a.description}`).join('\n');
            const embed = embeds_1.EmbedFactory.create('🏅 Conquistas Recentes', list || 'Nenhuma conquista recente.');
            await interaction.editReply({ embeds: [embed] });
        }
        else {
            await interaction.editReply({ embeds: [embeds_1.EmbedFactory.error('Erro ao buscar conquistas.')] });
        }
    }
};
exports.default = command;
