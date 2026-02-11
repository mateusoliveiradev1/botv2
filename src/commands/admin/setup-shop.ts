import { SlashCommandBuilder, PermissionFlagsBits, TextChannel, MessageFlags, Guild } from 'discord.js';
import { SlashCommand } from '../../types';
import { ShopManager } from '../../modules/shop/ShopManager';
import { SHOP_ITEMS } from '../../modules/shop/constants';
import logger from '../../core/logger';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('setup-shop')
    .setDescription('Envia o painel da loja e cria os cargos necessários')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option => 
        option.setName('channel')
              .setDescription('Canal onde a loja será enviada (Opcional)')
              .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild) return;

    // 1. Setup Roles
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    let createdCount = 0;
    let existingCount = 0;

    try {
        const guild = interaction.guild;
        const roles = await guild.roles.fetch();

        for (const item of SHOP_ITEMS) {
            if (item.type === 'ROLE' && item.roleName) {
                const exists = roles.find(r => r.name === item.roleName);
                
                if (!exists) {
                    await guild.roles.create({
                        name: item.roleName,
                        color: '#99AAB5', // Grey default
                        reason: 'BlueZone Shop Auto-Setup',
                        permissions: [] // Cosmetic only
                    });
                    createdCount++;
                    logger.info(`[Shop Setup] Created role: ${item.roleName}`);
                } else {
                    existingCount++;
                }
            }
        }
    } catch (error) {
        logger.error(error, '[Shop Setup] Failed to create roles');
        await interaction.editReply({ content: '❌ Erro ao criar cargos. Verifique minhas permissões.' });
        return;
    }

    // 2. Send Panel
    const targetChannel = interaction.options.getChannel('channel') as TextChannel;
    const channel = targetChannel || (interaction.channel as TextChannel);
    
    if (!channel || !channel.isTextBased()) {
        await interaction.editReply({ content: '❌ Canal inválido. Selecione um canal de texto.' });
        return;
    }

    await ShopManager.sendPanel(channel);
    
    await interaction.editReply({ 
        content: `✅ **Setup Concluído!**\n` +
                 `📦 Cargos Criados: ${createdCount}\n` +
                 `📦 Cargos Existentes: ${existingCount}\n` +
                 `🛒 Painel enviado para ${channel}` 
    });
  }
};

export default command;
