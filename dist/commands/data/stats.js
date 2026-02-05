"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const lovable_1 = require("../../services/lovable");
const embeds_1 = require("../../utils/embeds");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('stats')
        .setDescription('Verifica estatísticas do PUBG'),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const response = await lovable_1.LovableService.getStats(interaction.user.id);
            if (response.success && response.data) {
                const d = response.data;
                // Premium Stats Card
                const embed = new discord_js_1.EmbedBuilder()
                    .setTitle(`📊 ESTATÍSTICAS DE COMBATE: ${d.player_name}`)
                    .setColor('#FFA500') // PUBG Orange
                    .setThumbnail(d.avatar_url || interaction.user.displayAvatarURL())
                    .addFields({ name: '🎖️ Rank Atual', value: `**${d.current_rank}** (${d.total_rp} RP)`, inline: true }, { name: '⚔️ K/D Ratio', value: `**${d.kd_ratio.toFixed(2)}**`, inline: true }, { name: '🦅 Clã', value: d.clan_tag ? `[${d.clan_tag}]` : 'Sem Clã', inline: true }, { name: '💀 Total Kills', value: `${d.total_kills}`, inline: true }, { name: '🏆 Vitórias', value: `${d.wins}`, inline: true }, { name: '🎮 Partidas', value: `${d.matches_played}`, inline: true })
                    .setImage('https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg')
                    .setFooter({ text: 'Dados sincronizados via Krafton API', iconURL: 'https://cdn-icons-png.flaticon.com/512/3112/3112946.png' })
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
            }
            else {
                await interaction.editReply({ embeds: [embeds_1.EmbedFactory.error(response.error || 'Não foi possível buscar os dados. Você vinculou sua conta?')] });
            }
        }
        catch (error) {
            if (error.code !== 10062) {
                console.error('Erro ao executar comando stats:', error);
            }
        }
    }
};
exports.default = command;
