import { SlashCommandBuilder, PermissionFlagsBits, TextChannel, MessageFlags } from 'discord.js';
import { SlashCommand } from '../../types';
import { ShopManager } from '../../modules/shop/ShopManager';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('setup-shop')
    .setDescription('Envia o painel da loja')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option => 
        option.setName('channel')
              .setDescription('Canal onde a loja será enviada (Opcional)')
              .setRequired(false)
    ),

  async execute(interaction) {
    const targetChannel = interaction.options.getChannel('channel') as TextChannel;
    const channel = targetChannel || (interaction.channel as TextChannel);
    
    if (!channel || !channel.isTextBased()) {
        await interaction.reply({ content: '❌ Canal inválido. Selecione um canal de texto.', flags: MessageFlags.Ephemeral });
        return;
    }

    await ShopManager.sendPanel(channel);
    await interaction.reply({ content: `✅ Painel da Loja enviado para ${channel}!`, flags: MessageFlags.Ephemeral });
  }
};

export default command;
