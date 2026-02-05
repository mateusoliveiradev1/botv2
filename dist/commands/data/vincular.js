"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const lovable_1 = require("../../services/lovable");
const embeds_1 = require("../../utils/embeds");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('vincular')
        .setDescription('Gera link para conectar conta Discord ao PUBG'),
    async execute(interaction) {
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        const response = await lovable_1.LovableService.generateLoginLink(interaction.user.id, interaction.user.username);
        if (response.success && response.data) {
            const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                .setLabel('🔗 Conectar Agora')
                .setStyle(discord_js_1.ButtonStyle.Link)
                .setURL(response.data.login_url));
            await interaction.editReply({
                embeds: [embeds_1.EmbedFactory.create('Vincular Conta', 'Clique no botão abaixo para acessar o Web App e conectar sua conta PUBG.')],
                components: [row]
            });
        }
        else {
            await interaction.editReply({ embeds: [embeds_1.EmbedFactory.error('Falha ao gerar link.')] });
        }
    }
};
exports.default = command;
