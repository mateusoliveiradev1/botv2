import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { SlashCommand } from "../../types";
import { WarningManager } from "../../modules/moderation/WarningManager";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("warns")
    .setDescription("Visualiza o histórico de advertências de um usuário")
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("O usuário para ver o histórico (vazio para ver o seu)")
        .setRequired(false),
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("usuario") || interaction.user;
    const guildId = interaction.guildId!;

    const warnings = await WarningManager.getWarnings(guildId, user.id);
    const count = warnings.length;

    const embed = new EmbedBuilder()
      .setTitle(`📜 Histórico de Advertências - ${user.tag}`)
      .setColor(count > 0 ? "#FFA500" : "#00FF00")
      .setThumbnail(user.displayAvatarURL())
      .setDescription(`Total de advertências: **${count}**`);

    if (count === 0) {
      embed.setDescription(
        "Este usuário não possui advertências. Usuário exemplar! 🌟",
      );
    } else {
      // Mostrar as últimas 10 warns para não estourar o limite do embed
      const lastWarnings = warnings.slice(-10).reverse(); // Mais recentes primeiro

      const history = lastWarnings
        .map(
          (
            w: { createdAt: Date; moderatorId: string; reason: string },
            index: number,
          ) => {
            const date = new Date(w.createdAt).toLocaleDateString("pt-BR");
            const mod =
              w.moderatorId === "AUTO_MOD"
                ? "🤖 AutoMod"
                : `<@${w.moderatorId}>`;
            return `**${count - index}.** [${date}] ${w.reason} (por ${mod})`;
          },
        )
        .join("\n");

      embed.addFields({ name: "Últimas Infrações", value: history });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
