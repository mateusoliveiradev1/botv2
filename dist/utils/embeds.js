"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedFactory = exports.Colors = void 0;
const discord_js_1 = require("discord.js");
exports.Colors = {
    PUBG_YELLOW: '#F2A900',
    TACTICAL_BLACK: '#000000',
    SUCCESS: '#00FF00',
    ERROR: '#FF0000',
    INFO: '#0099FF',
};
class EmbedFactory {
    static create(title, description) {
        return new discord_js_1.EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(exports.Colors.PUBG_YELLOW)
            .setTimestamp()
            .setFooter({ text: 'BlueZone Sentinel | Hawk Esports', iconURL: 'https://i.imgur.com/example.png' });
    }
    static success(title, message) {
        return new discord_js_1.EmbedBuilder()
            .setTitle(`✅ ${title}`)
            .setDescription(message)
            .setColor(exports.Colors.SUCCESS);
    }
    static error(message) {
        return new discord_js_1.EmbedBuilder()
            .setTitle('❌ Erro Operacional')
            .setDescription(message)
            .setColor(exports.Colors.ERROR);
    }
    static statsCard(stats) {
        const clanTag = stats.clan_tag ? `[${stats.clan_tag}]` : '';
        const title = `📊 Relatório de Combate: ${clanTag} ${stats.player_name}`.trim();
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(title)
            .setColor(exports.Colors.PUBG_YELLOW)
            .setDescription(`Resumo da temporada atual para **${stats.player_name}**`)
            .addFields(
        // Linha 1: Performance de Combate
        { name: '🎯 K/D Ratio', value: `\`${Number(stats.kd_ratio).toFixed(2)}\``, inline: true }, { name: '💥 Dano Médio', value: `\`${Math.round(stats.average_damage)}\``, inline: true }, { name: '💀 Kills Totais', value: `\`${stats.total_kills}\``, inline: true }, 
        // Linha 2: Resultados de Partida
        { name: '🏆 Vitórias', value: `\`${stats.wins}\``, inline: true }, { name: '🏅 Top 10', value: `\`${stats.top_10s}\``, inline: true }, { name: '🎮 Partidas', value: `\`${stats.matches_played}\``, inline: true }, 
        // Linha 3: Competitivo
        { name: '🎖️ Rank Atual', value: `**${stats.current_rank.toUpperCase()}**`, inline: true }, { name: '💠 RP Total', value: `\`${stats.total_rp}\``, inline: true }, { name: '\u200b', value: '\u200b', inline: true } // Spacer para alinhar 3 colunas se necessário
        )
            .setThumbnail('https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg')
            .setFooter({ text: 'BlueZone Sentinel • Estatísticas em tempo real', iconURL: 'https://i.imgur.com/example.png' })
            .setTimestamp();
        if (stats.matches_played === 0) {
            embed.setDescription(`⚠️ **Aviso:** Nenhum dado de partida encontrado para esta temporada no Web App.\nCertifique-se de que sua conta está vinculada e que você jogou partidas recentes.`);
        }
        return embed;
    }
}
exports.EmbedFactory = EmbedFactory;
