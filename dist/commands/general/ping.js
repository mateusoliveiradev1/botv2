"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('ping')
        .setDescription('Verifica a latência do sistema'),
    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pingando...', fetchReply: true, ephemeral: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('🏓 PONG!')
            .setColor(latency < 100 ? '#00FF00' : latency < 200 ? '#FFFF00' : '#FF0000')
            .addFields({ name: '📡 Latência do Bot', value: `\`${latency}ms\``, inline: true }, { name: '🌐 API do Discord', value: `\`${Math.round(interaction.client.ws.ping)}ms\``, inline: true })
            .setTimestamp();
        await interaction.editReply({ content: null, embeds: [embed] });
    }
};
exports.default = command;
