import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { SlashCommand } from "../../types";
import { db } from "../../core/DatabaseManager";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("dbstatus")
    .setDescription("Verifica integridade do banco (leituras/gravacoes)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const results: { name: string; ok: boolean; detail?: string }[] = [];

    try {
      // Timeout de 5s para o teste de banco
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de Conexão (5s)')), 5000));
      
      const dbCheckPromise = (async () => {
          const counts = await db.read(async (prisma) => {
            const xpCount = await prisma.userXP.count();
            const warnCount = await prisma.warning.count();
            return { xpCount, warnCount };
          });
          return counts;
      })();

      const counts: any = await Promise.race([dbCheckPromise, timeoutPromise]);

      results.push({ name: `UserXP: ${counts.xpCount}`, ok: true });
      results.push({ name: `Warnings: ${counts.warnCount}`, ok: true });

      // Teste de Escrita Simplificado
      const ts = Date.now().toString();
      const writePromise = (async () => {
          await db.write(async (prisma) => {
            await prisma.systemState.upsert({
              where: { key: "healthcheck" },
              update: { value: ts },
              create: { key: "healthcheck", value: ts },
            });
          });
      })();
      
      await Promise.race([writePromise, timeoutPromise]);
      
      results.push({
        name: "Write/Read: SystemState.healthcheck",
        ok: true,
        detail: "OK"
      });

      const embed = new EmbedBuilder()
        .setTitle("🗄️ Banco de Dados – Status")
        .setColor("#00FF00")
        .setDescription("Verificação rápida de leitura e escrita (Supabase)")
        .addFields(
          results.map((r) => ({
            name: r.ok ? `✅ ${r.name}` : `⚠️ ${r.name}`,
            value: r.detail ? r.detail : "OK",
            inline: true,
          }))
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Falha ao checar Banco")
        .setColor("#FF0000")
        .setDescription(`Erro: ${error?.message || "Desconhecido"}`)
        .setFooter({ text: "O banco pode estar inacessível ou reiniciando." })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    }
  },
};

export default command;
