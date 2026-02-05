import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { SlashCommand } from '../../types';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica a latência do sistema'),
  
  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pingando...', fetchReply: true, ephemeral: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    
    const embed = new EmbedBuilder()
      .setTitle('🏓 PONG!')
      .setColor(latency < 100 ? '#00FF00' : latency < 200 ? '#FFFF00' : '#FF0000')
      .addFields(
        { name: '📡 Latência do Bot', value: `\`${latency}ms\``, inline: true },
        { name: '🌐 API do Discord', value: `\`${Math.round(interaction.client.ws.ping)}ms\``, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
  }
};

export default command;
