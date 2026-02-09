import { SlashCommandBuilder, PermissionFlagsBits, TextChannel, MessageFlags } from 'discord.js';
import { SlashCommand } from '../../types';
import { ShopManager } from '../../modules/shop/ShopManager';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('setup-shop')
    .setDescription('Envia o painel da loja para o canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = interaction.channel as TextChannel;
    
    if (!channel) {
        await interaction.reply({ content: '❌ Use este comando em um canal de texto.', flags: MessageFlags.Ephemeral });
        return;
    }

    await ShopManager.sendPanel(channel);
    await interaction.reply({ content: '✅ Painel da Loja enviado com sucesso!', flags: MessageFlags.Ephemeral });
  }
};

export default command;
