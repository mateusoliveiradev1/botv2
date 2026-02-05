import { SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../types';
import { LovableService } from '../../services/lovable';
import { EmbedFactory } from '../../utils/embeds';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('conquistas')
    .setDescription('Suas últimas conquistas'),
  
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const response = await LovableService.getAchievements(interaction.user.id);

    if (response.success && response.data) {
      const list = response.data.map((a: any) => `${a.icon} **${a.name}**: ${a.description}`).join('\n');
      const embed = EmbedFactory.create('🏅 Conquistas Recentes', list || 'Nenhuma conquista recente.');
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({ embeds: [EmbedFactory.error('Erro ao buscar conquistas.')] });
    }
  }
};

export default command;
