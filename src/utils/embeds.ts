import { EmbedBuilder, ColorResolvable } from 'discord.js';

export const Colors = {
  PUBG_YELLOW: '#F2A900' as ColorResolvable,
  TACTICAL_BLACK: '#000000' as ColorResolvable,
  SUCCESS: '#00FF00' as ColorResolvable,
  ERROR: '#FF0000' as ColorResolvable,
  INFO: '#0099FF' as ColorResolvable,
};

export class EmbedFactory {
  static create(title: string, description: string) {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(Colors.PUBG_YELLOW)
      .setTimestamp()
      .setFooter({ text: 'BlueZone Sentinel | Hawk Esports', iconURL: 'https://i.imgur.com/example.png' });
  }

  static success(title: string, message: string) {
    return new EmbedBuilder()
      .setTitle(`✅ ${title}`)
      .setDescription(message)
      .setColor(Colors.SUCCESS);
  }

  static error(message: string) {
    return new EmbedBuilder()
      .setTitle('❌ Erro Operacional')
      .setDescription(message)
      .setColor(Colors.ERROR);
  }

  static statsCard(stats: any) {
    const clanTag = stats.clan_tag ? `[${stats.clan_tag}]` : '';
    const title = `📊 Relatório de Combate: ${clanTag} ${stats.player_name}`.trim();

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(Colors.PUBG_YELLOW)
      .setDescription(`Resumo da temporada atual para **${stats.player_name}**`)
      .addFields(
        // Linha 1: Performance de Combate
        { name: '🎯 K/D Ratio', value: `\`${Number(stats.kd_ratio).toFixed(2)}\``, inline: true },
        { name: '💥 Dano Médio', value: `\`${Math.round(stats.average_damage)}\``, inline: true },
        { name: '💀 Kills Totais', value: `\`${stats.total_kills}\``, inline: true },
        
        // Linha 2: Resultados de Partida
        { name: '🏆 Vitórias', value: `\`${stats.wins}\``, inline: true },
        { name: '🏅 Top 10', value: `\`${stats.top_10s}\``, inline: true },
        { name: '🎮 Partidas', value: `\`${stats.matches_played}\``, inline: true },

        // Linha 3: Competitivo
        { name: '🎖️ Rank Atual', value: `**${stats.current_rank.toUpperCase()}**`, inline: true },
        { name: '💠 RP Total', value: `\`${stats.total_rp}\``, inline: true },
        { name: '\u200b', value: '\u200b', inline: true } // Spacer para alinhar 3 colunas se necessário
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
