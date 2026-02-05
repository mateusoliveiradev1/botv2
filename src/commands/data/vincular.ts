import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { SlashCommand } from '../../types';
import { LovableService } from '../../services/lovable';
import { EmbedFactory } from '../../utils/embeds';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('vincular')
    .setDescription('Gera link para conectar conta Discord ao PUBG'),
  
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const response = await LovableService.generateLoginLink(interaction.user.id, interaction.user.username);

    if (response.success && response.data) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('🔗 Conectar Agora')
          .setStyle(ButtonStyle.Link)
          .setURL(response.data.login_url)
      );

      await interaction.editReply({ 
        embeds: [EmbedFactory.create('Vincular Conta', 'Clique no botão abaixo para acessar o Web App e conectar sua conta PUBG.')],
        components: [row]
      });
    } else {
      await interaction.editReply({ embeds: [EmbedFactory.error('Falha ao gerar link.')] });
    }
  }
};

export default command;
