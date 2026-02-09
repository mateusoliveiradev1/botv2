import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { SlashCommand } from '../../types';
import { EmbedFactory } from '../../utils/embeds';
import { LogManager, LogType, LogLevel } from '../../modules/logger/LogManager';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Silenciar usuário')
    .addUserOption(option => option.setName('usuario').setDescription('Usuário').setRequired(true))
    .addIntegerOption(option => option.setName('minutos').setDescription('Tempo em minutos').setRequired(true))
    .addStringOption(option => option.setName('motivo').setDescription('Motivo').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const minutes = interaction.options.getInteger('minutos') ?? 5;
    const reason = interaction.options.getString('motivo') ?? 'Sem motivo';

    if (!user) {
      await interaction.reply({ content: 'Usuário não encontrado.', flags: 64 });
      return;
    }

    const member = await interaction.guild?.members.fetch(user.id);

    if (!member) return;

    // Proteções de Moderação
    if (!member.moderatable) {
      await interaction.reply({ embeds: [EmbedFactory.error('Não posso silenciar este usuário (Cargo superior ou igual ao meu).')], ephemeral: true });
      return;
    }
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ embeds: [EmbedFactory.error('Você não pode silenciar um Administrador.')], ephemeral: true });
      return;
    }

    try {
      await member.timeout(minutes * 60 * 1000, reason);
      
      // Premium Embed
      const embed = new EmbedBuilder()
        .setTitle('🔇 COMUNICAÇÃO CORTADA')
        .setDescription(`O operador **${user!.tag}** foi colocado em silêncio de rádio temporário.`)
        .setColor('#FFFF00') // Yellow
        .setThumbnail(user!.displayAvatarURL())
        .addFields(
            { name: '⏱️ Duração', value: `${minutes} minutos`, inline: true },
            { name: '⚖️ Motivo', value: reason, inline: true },
            { name: '👮‍♂️ Executor', value: interaction.user.toString(), inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Audit Log
      await LogManager.log({
        guild: interaction.guild!,
        type: LogType.MODERATION,
        level: LogLevel.WARN,
        title: 'Timeout Aplicado',
        description: `Usuário silenciado temporariamente.`,
        executor: interaction.user,
        target: user!,
        fields: [
            { name: 'Duração', value: `${minutes} minutos`, inline: true },
            { name: 'Motivo', value: reason, inline: true }
        ]
      });

    } catch (error) {
      await interaction.reply({ embeds: [EmbedFactory.error('Erro ao aplicar timeout.')], ephemeral: true });
    }
  }
};

export default command;
