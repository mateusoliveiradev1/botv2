"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const lovable_1 = require("../../services/lovable");
const embeds_1 = require("../../utils/embeds");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('passe')
        .setDescription('Verifica progresso do Season Pass'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const response = await lovable_1.LovableService.getSeasonPass(interaction.user.id);
        if (response.success && response.data) {
            const d = response.data;
            const embed = embeds_1.EmbedFactory.create('🎟️ Season Pass', `Nível Atual: **${d.current_level}**\nXP: ${d.season_xp}\nProgresso: ${d.progress_percent}%`);
            await interaction.editReply({ embeds: [embed] });
        }
        else {
            await interaction.editReply({ embeds: [embeds_1.EmbedFactory.error('Erro ao buscar Passe. Conta vinculada?')] });
        }
    }
};
exports.default = command;
