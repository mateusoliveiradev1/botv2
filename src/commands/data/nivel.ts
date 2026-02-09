
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { SlashCommand } from '../../types';
import { XpManager } from '../../modules/xp/manager';
import { XP_LEVELS } from '../../modules/xp/constants';
import { Colors } from '../../utils/embeds';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('nivel')
    .setDescription('Exibe seu nível e XP atual no Discord'),
  
  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: 64 });
      const stats = await XpManager.getStats(interaction.user.id);
      
      // Calcular próximo nível
      const nextLevel = XP_LEVELS.find(l => l.xp > stats.xp);
      const currentLevelBase = [...XP_LEVELS].reverse().find(l => l.xp <= stats.xp) || XP_LEVELS[0];
      
      let description;

      if (nextLevel) {
        const xpNeeded = nextLevel.xp - currentLevelBase.xp;
        const xpCurrentInLevel = stats.xp - currentLevelBase.xp;
        const progress = Math.min(Math.max(xpCurrentInLevel / xpNeeded, 0), 1);
        const nextXp = nextLevel.xp;
        
        // Barra de progresso visual
        const barLength = 10;
        const filledLength = Math.round(progress * barLength);
        const bar = '🟩'.repeat(filledLength) + '⬜'.repeat(barLength - filledLength);
        
        description = `
        **Nível Atual:** ${stats.level}
        **XP Total:** ${stats.xp} / ${nextXp}
        
        ${bar} **${Math.floor(progress * 100)}%**
        
        *Faltam ${nextLevel.xp - stats.xp} XP para o próximo rank: ${nextLevel.role}*`;
      } else {
        description = `
        **Nível Atual:** ${stats.level}
        **XP Total:** ${stats.xp}
        
        🏆 **Nível Máximo Alcançado!**`;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📊 Nível de ${interaction.user.username}`)
        .setDescription(description)
        .setColor(Colors.PUBG_YELLOW)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: 'Interaja no chat para ganhar mais XP!' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      console.error('Erro ao executar comando nivel:', error);
      const msg = error.message?.includes('reach database') || error.code === 'P1001'
        ? '⚠️ O banco de dados está demorando para responder. Tente novamente.'
        : '❌ Erro ao buscar dados de nível.';
        
      await interaction.editReply({ content: msg });
    }
  }
};

export default command;
