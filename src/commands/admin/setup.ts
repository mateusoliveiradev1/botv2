import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { SlashCommand } from '../../types';
import { SetupManager } from '../../modules/setup/manager';
import { EmbedFactory } from '../../utils/embeds';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Constrói a estrutura do servidor (Admin Only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: 64 });

      if (interaction.guild) {
        const manager = new SetupManager(interaction.guild);
        await manager.run();
        await interaction.editReply({ embeds: [EmbedFactory.success('Setup Concluído', 'Estrutura BlueZone criada com sucesso.')] });
      } else {
        await interaction.editReply('Erro: Comando apenas para servidores.');
      }
    } catch (error) {
      // Ignorar erro se a interação expirou (setup demorou mas funcionou)
    }
  }
};

export default command;
