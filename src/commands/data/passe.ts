import { SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../types';
import { LovableService } from '../../services/lovable';
import { EmbedFactory } from '../../utils/embeds';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('passe')
    .setDescription('Verifica progresso do Season Pass'),
  
  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });
    const response = await LovableService.getSeasonPass(interaction.user.id);

    if (response.success && response.data) {
      const d = response.data;
      const embed = EmbedFactory.create('🎟️ Season Pass', `Nível Atual: **${d.current_level}**\nXP: ${d.season_xp}\nProgresso: ${d.progress_percent}%`);
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({ embeds: [EmbedFactory.error('Erro ao buscar Passe. Conta vinculada?')] });
    }
  }
};

export default command;
