import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import { SlashCommand } from '../../types';
import prisma from '../../core/prisma';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('dbstatus')
    .setDescription('Verifica integridade do banco (leituras/gravacoes)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const results: { name: string; ok: boolean; detail?: string }[] = [];

    try {
      const xpCount = await prisma.userXP.count();
      const warnCount = await prisma.warning.count();
      const mercCount = await prisma.mercenaryProfile.count();
      const contractCount = await prisma.mercenaryContract.count();
      const tempCount = await prisma.tempChannel.count();
      const auditCount = await prisma.auditLog.count();
      const systemCount = await prisma.systemState.count();

      results.push({ name: `UserXP: ${xpCount}`, ok: true });
      results.push({ name: `Warnings: ${warnCount}`, ok: true });
      results.push({ name: `MercenaryProfile: ${mercCount}`, ok: true });
      results.push({ name: `MercenaryContract: ${contractCount}`, ok: true });
      results.push({ name: `TempChannel: ${tempCount}`, ok: true });
      results.push({ name: `AuditLog: ${auditCount}`, ok: true });
      results.push({ name: `SystemState: ${systemCount}`, ok: true });

      const ts = Date.now().toString();
      await prisma.systemState.upsert({
        where: { key: 'healthcheck' },
        update: { value: ts },
        create: { key: 'healthcheck', value: ts },
      });

      const check = await prisma.systemState.findUnique({ where: { key: 'healthcheck' } });
      const writeOk = check?.value === ts;
      results.push({ name: 'Write/Read: SystemState.healthcheck', ok: !!writeOk, detail: writeOk ? 'OK' : 'Mismatch' });

      const embed = new EmbedBuilder()
        .setTitle('🗄️ Banco de Dados – Status')
        .setColor(results.every(r => r.ok) ? '#00FF00' : '#FFA500')
        .setDescription('Verificação rápida de leitura e escrita usando Prisma (Supabase)')
        .addFields(
          ...results.map(r => ({
            name: r.ok ? `✅ ${r.name}` : `⚠️ ${r.name}`,
            value: r.detail ? r.detail : r.ok ? 'OK' : 'Verifique logs',
            inline: true,
          }))
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Falha ao checar Banco')
        .setColor('#FF0000')
        .setDescription(`Erro: ${error?.message || 'Desconhecido'}`)
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    }
  }
};

export default command;
