"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('sitrep')
        .setDescription('Abrir painel de criação de comunicado SITREP (Admin Only)')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const modal = new discord_js_1.ModalBuilder()
            .setCustomId('sitrep_modal')
            .setTitle('📢 Criar Comunicado SITREP');
        const tituloInput = new discord_js_1.TextInputBuilder()
            .setCustomId('sitrep_titulo')
            .setLabel('Título do Comunicado')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setPlaceholder('Ex: Manutenção Extraordinária')
            .setRequired(true);
        const mensagemInput = new discord_js_1.TextInputBuilder()
            .setCustomId('sitrep_mensagem')
            .setLabel('Mensagem (Suporta Markdown)')
            .setStyle(discord_js_1.TextInputStyle.Paragraph)
            .setPlaceholder('Ex: Os servidores ficarão offline por 2h...')
            .setRequired(true);
        const imagemInput = new discord_js_1.TextInputBuilder()
            .setCustomId('sitrep_imagem')
            .setLabel('URL da Imagem (Opcional)')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setPlaceholder('https://...')
            .setRequired(false);
        const mencaoInput = new discord_js_1.TextInputBuilder()
            .setCustomId('sitrep_mencao')
            .setLabel('Menção (Opcional: @everyone ou @here)')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setPlaceholder('@everyone')
            .setRequired(false);
        modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(tituloInput), new discord_js_1.ActionRowBuilder().addComponents(mensagemInput), new discord_js_1.ActionRowBuilder().addComponents(imagemInput), new discord_js_1.ActionRowBuilder().addComponents(mencaoInput));
        await interaction.showModal(modal);
    }
};
exports.default = command;
