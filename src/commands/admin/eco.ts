import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { SlashCommand } from '../../types';
import { EconomyManager } from '../../modules/shop/EconomyManager';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('eco')
    .setDescription('Gerenciar economia do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => 
        sub.setName('add')
           .setDescription('Adicionar BC')
           .addUserOption(opt => opt.setName('user').setDescription('Usuário').setRequired(true))
           .addIntegerOption(opt => opt.setName('amount').setDescription('Quantidade').setRequired(true)))
    .addSubcommand(sub => 
        sub.setName('remove')
           .setDescription('Remover BC')
           .addUserOption(opt => opt.setName('user').setDescription('Usuário').setRequired(true))
           .addIntegerOption(opt => opt.setName('amount').setDescription('Quantidade').setRequired(true)))
    .addSubcommand(sub => 
        sub.setName('set')
           .setDescription('Definir Saldo')
           .addUserOption(opt => opt.setName('user').setDescription('Usuário').setRequired(true))
           .addIntegerOption(opt => opt.setName('amount').setDescription('Quantidade').setRequired(true)))
    .addSubcommand(sub => 
        sub.setName('check')
           .setDescription('Ver Saldo')
           .addUserOption(opt => opt.setName('user').setDescription('Usuário').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount') || 0;

    if (!targetUser) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (subcommand === 'check') {
        const bal = await EconomyManager.getBalance(targetUser.id);
        await interaction.editReply(`💰 Saldo de **${targetUser.username}**: \`${bal} BC\``);
        return;
    }

    if (subcommand === 'add') {
        const newBal = await EconomyManager.addBalance(targetUser.id, amount, 'Admin Command', interaction.guild!, interaction.user);
        await interaction.editReply(`✅ Adicionado \`${amount} BC\` para ${targetUser}. Novo saldo: \`${newBal} BC\``);
    }

    if (subcommand === 'remove') {
        const success = await EconomyManager.removeBalance(targetUser.id, amount, 'Admin Command', interaction.guild!, interaction.user);
        await interaction.editReply(success ? `✅ Removido \`${amount} BC\` de ${targetUser}.` : `❌ Falha: Saldo insuficiente.`);
    }
    
    if (subcommand === 'set') {
         const current = await EconomyManager.getBalance(targetUser.id);
         const diff = amount - current;
         if (diff > 0) await EconomyManager.addBalance(targetUser.id, diff, 'Admin Set', interaction.guild!, interaction.user);
         else if (diff < 0) await EconomyManager.removeBalance(targetUser.id, Math.abs(diff), 'Admin Set', interaction.guild!, interaction.user);
         
         await interaction.editReply(`✅ Saldo de ${targetUser} definido para \`${amount} BC\`.`);
    }
  }
};

export default command;
