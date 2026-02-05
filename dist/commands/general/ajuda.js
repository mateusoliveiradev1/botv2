"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('ajuda')
        .setDescription('Central de ajuda e comandos do sistema'),
    async execute(interaction) {
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('📘 CENTRAL DE AJUDA BLUEZONE')
            .setDescription('Bem-vindo ao sistema operacional do servidor. Selecione uma categoria abaixo para ver os comandos disponíveis.')
            .setColor('#0099FF')
            .setThumbnail(interaction.client.user?.displayAvatarURL() || '')
            .addFields({ name: '🆕 Primeiros Passos', value: 'Use o menu abaixo para navegar entre os módulos do bot.' })
            .setImage('https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg');
        const select = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('Selecione uma categoria...')
            .addOptions([
            { label: '📊 Dados & Stats', value: 'stats', description: 'Comandos de estatísticas e perfil', emoji: '📊' },
            { label: '🛡️ Clã & Social', value: 'social', description: 'Gestão de clãs e interação', emoji: '🛡️' },
            { label: '👮 Moderação', value: 'mod', description: 'Ferramentas para oficiais (Staff)', emoji: '👮' },
            { label: '⚙️ Utilitários', value: 'utils', description: 'Configurações e diversos', emoji: '⚙️' },
        ]);
        const row = new discord_js_1.ActionRowBuilder().addComponents(select);
        // Dynamic Support Channel Link logic moved to Interaction Handler for better UX
        // We change the button to be an interaction button instead of a link button
        const buttonRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setLabel('Suporte Humano').setStyle(discord_js_1.ButtonStyle.Primary).setCustomId('human_support').setEmoji('🆘'), new discord_js_1.ButtonBuilder().setLabel('Reportar Bug').setStyle(discord_js_1.ButtonStyle.Secondary).setCustomId('report_bug').setEmoji('🐛'));
        const response = await interaction.reply({
            embeds: [embed],
            components: [row, buttonRow],
            ephemeral: true
        });
        const collector = response.createMessageComponentCollector({ componentType: discord_js_1.ComponentType.StringSelect, time: 60000 });
        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id)
                return;
            const selection = i.values[0];
            const newEmbed = new discord_js_1.EmbedBuilder().setColor('#0099FF').setTimestamp();
            if (selection === 'stats') {
                newEmbed.setTitle('📊 DADOS E ESTATÍSTICAS');
                newEmbed.setDescription('Comandos para monitorar seu desempenho em campo.');
                newEmbed.addFields({ name: '`/stats`', value: 'Exibe seu cartão de jogador com K/D, vitórias e rank.', inline: true }, { name: '`/ranking`', value: 'Mostra o Top 10 global do servidor.', inline: true }, { name: '`/nivel`', value: 'Verifica seu progresso de XP e Patente no Discord.', inline: true }, { name: '`/conquistas`', value: 'Lista suas medalhas desbloqueadas.', inline: true });
            }
            else if (selection === 'social') {
                newEmbed.setTitle('🛡️ CLÃ E SOCIAL');
                newEmbed.setDescription('Ferramentas de interação com outros operadores.');
                newEmbed.addFields({ name: '`/clan`', value: 'Informações sobre seu esquadrão/clã.', inline: true }, { name: '`/vincular`', value: 'Conecta sua conta PUBG para rastreamento.', inline: true }, { name: '`/passe`', value: 'Verifica status do Passe de Batalha (Season Pass).', inline: true });
            }
            else if (selection === 'mod') {
                newEmbed.setTitle('👮 MODERAÇÃO (STAFF)');
                newEmbed.setDescription('Ferramentas de controle de distúrbios.');
                newEmbed.addFields({ name: '`/ban`', value: 'Remove permanentemente um usuário.', inline: true }, { name: '`/kick`', value: 'Remove o usuário (permite retorno).', inline: true }, { name: '`/timeout`', value: 'Silencia o usuário temporariamente.', inline: true }, { name: '`/warn`', value: 'Aplica uma advertência manual.', inline: true }, { name: '`/unwarn`', value: 'Remove a última advertência.', inline: true }, { name: '`/warns`', value: 'Vê histórico de advertências.', inline: true }, { name: '`/clear`', value: 'Limpa mensagens do chat em massa.', inline: true }, { name: '`/sitrep`', value: 'Envia um relatório de situação (Anúncio).', inline: true });
            }
            else if (selection === 'utils') {
                newEmbed.setTitle('⚙️ UTILITÁRIOS');
                newEmbed.setDescription('Outras funções do sistema.');
                newEmbed.addFields({ name: '`/ajuda`', value: 'Exibe este menu.', inline: true }, { name: '`/ping`', value: 'Verifica latência do bot.', inline: true });
            }
            await i.update({ embeds: [newEmbed], components: [row, buttonRow] });
        });
    }
};
exports.default = command;
