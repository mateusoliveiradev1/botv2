import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { SlashCommand } from '../../types';
import { EmbedFactory } from '../../utils/embeds';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Limpar mensagens do chat')
    .addIntegerOption(option => 
      option.setName('quantidade')
        .setDescription('Número de mensagens a apagar (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  async execute(interaction) {
    const amount = interaction.options.getInteger('quantidade') || 1;
    const channel = interaction.channel;

    if (!channel) {
      await interaction.reply({ content: '❌ Canal inválido.', flags: 64 });
      return;
    }

    await interaction.deferReply({ flags: 64 });

    try {
      // Bulk delete only works in guild text channels
      if ('bulkDelete' in channel) {
        await channel.bulkDelete(amount, true); // true = filterOld (older than 14 days)
        
        await interaction.editReply({ 
            embeds: [EmbedFactory.success('Limpeza Concluída', `🗑️ **${amount}** mensagens foram removidas.`)] 
        });
        
        // Auto-delete reply after 3 seconds
        setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
      } else {
        await interaction.editReply({ content: 'Este canal não suporta limpeza em massa.' });
        return;
      }
    } catch (error) {
      await interaction.editReply({ embeds: [EmbedFactory.error('Erro ao limpar mensagens (talvez sejam muito antigas).')] });
    }
  }
};

export default command;