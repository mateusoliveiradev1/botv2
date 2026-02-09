import { SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../types';
import { LovableService } from '../../services/lovable';
import { EmbedFactory } from '../../utils/embeds';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('clan')
    .setDescription('Informações do Clã'),
  
  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });
    const response = await LovableService.getClan(interaction.user.id);

    if (response.success && response.data) {
      const d = response.data;
      const embed = EmbedFactory.create(`🛡️ ${d.name} [${d.tag}]`, `Membros: ${d.member_count}\nNível: ${d.current_level}`);
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({ embeds: [EmbedFactory.error('Erro ao buscar Clã.')] });
    }
  }
};

export default command;
