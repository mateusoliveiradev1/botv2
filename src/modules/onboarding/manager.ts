import {
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  TextChannel,
  GuildMember,
} from "discord.js";
import { XpManager } from "../xp/manager";
import logger from "../../core/logger";

export class OnboardingManager {
  // --- 1. O SALTO (INÍCIO) ---
  static async startJump(interaction: ButtonInteraction) {
    const embed = new EmbedBuilder()
      .setTitle("🪂 ZONA DE SALTO: SOBREVOANDO A ILHA")
      .setDescription(
        "**🔊 VENTO FORTE... PORTA ABERTA!**\n\n" +
          "Você está a 5.000 pés de altitude. O servidor BlueZone se estende abaixo de você.\n" +
          "Sua jornada começa agora. Onde você vai pousar?",
      )
      .setColor("#00BFFF")
      .setImage("https://media.tenor.com/M6LwK70iOaEAAAAC/pubg-jump.gif") // GIF de salto do PUBG
      .setFooter({ text: "Passo 1/4 • Iniciação Tática" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("onboarding_land_comp")
        .setLabel("🏙️ POCHINKI (Competitivo)")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("onboarding_land_fun")
        .setLabel("🌲 GATKA (Casual/4Fun)")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("onboarding_land_learn")
        .setLabel("🎯 CAMP JACKAL (Treino)")
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: 64, // Ephemeral
    });
  }

  // --- 2. O POUSO (PERFILAGEM) ---
  static async handleLanding(interaction: ButtonInteraction) {
    const choice = interaction.customId;
    let flavorText;

    if (choice === "onboarding_land_comp") {
      flavorText =
        "**Você escolheu o caminho da glória.**\nAqui o foco é Scrims, Campeonatos e Rank Alto.";
    } else if (choice === "onboarding_land_fun") {
      flavorText =
        "**Você escolheu a diversão.**\nAqui o foco é resenha, duo/squad com a galera e eventos.";
    } else {
      flavorText =
        "**Você escolheu o aprendizado.**\nVamos te ajudar a dominar o recuo e as rotações.";
    }

    const embed = new EmbedBuilder()
      .setTitle("🪂 POUSO BEM SUCEDIDO")
      .setDescription(
        `${flavorText}\n\n` +
          "Agora que você está no chão, precisa se equipar. Um soldado sem identidade é um alvo fácil.",
      )
      .setColor("#F2A900")
      .setThumbnail("https://cdn-icons-png.flaticon.com/512/3050/3050253.png") // Backpack icon
      .setFooter({ text: "Passo 2/4 • Equipamento" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("onboarding_loot")
        .setLabel("🎒 ABRIR MOCHILA (Setup)")
        .setStyle(ButtonStyle.Primary),
    );

    await interaction.update({ embeds: [embed], components: [row] });
  }

  // --- 3. O LOOT (SETUP) ---
  static async handleLoot(interaction: ButtonInteraction) {
    // Find Identity Channel ID
    const channel = interaction.guild?.channels.cache.find((c) =>
      c.name.includes("identidade"),
    );
    const channelMention = channel
      ? `<#${channel.id}>`
      : "**#identidade-operacional**";

    const embed = new EmbedBuilder()
      .setTitle("🎒 SEU LOADOUT")
      .setDescription(
        "Sua mochila está vazia! Para sobreviver, você precisa definir:\n\n" +
          `1. **Especialização** (Sniper, Fragger, IGL...)\n` +
          `2. **Armamento** (M416, Beryl, Kar98k...)\n` +
          `3. **Notificações** (O que você quer ouvir no rádio)\n\n` +
          `👉 **Vá agora em ${channelMention} e configure seu cartão.**\n` +
          `Depois volte aqui para pegar sua recompensa.`,
      )
      .setColor("#00FF00")
      .setFooter({ text: "Passo 3/4 • Preparação Final" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("onboarding_finish")
        .setLabel("🍗 WINNER WINNER CHICKEN DINNER")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🏆"),
    );

    await interaction.update({ embeds: [embed], components: [row] });
  }

  // --- 4. A VITÓRIA (RECOMPENSA) ---
  static async handleFinish(interaction: ButtonInteraction) {
    const member = interaction.member as GuildMember;

    // Give XP Reward
    try {
      await XpManager.addXp(member, 500);
    } catch (e) {
      logger.error(e, "Error giving onboarding XP");
    }

    const embed = new EmbedBuilder()
      .setTitle("🏆 BEM-VINDO À BLUEZONE")
      .setDescription(
        "**BRIEFING CONCLUÍDO COM SUCESSO!**\n\n" +
          "🎁 **Recompensas Recebidas:**\n" +
          "• `500 XP` (Promoção para Cabo)\n" +
          "• `🏅 Medalha: Recruta Iniciado`\n\n" +
          "Agora você é um de nós. Nos vemos no campo de batalha.",
      )
      .setColor("#FFD700")
      .setImage(
        "https://media.tenor.com/images/3f6d7d5d3e7d5d3e7d5d3e7d5d3e7d5d/tenor.gif",
      ) // Winner Winner Chicken Dinner GIF (Placeholder or real one)
      .setFooter({ text: "Missão Cumprida" });

    // Link button to Ranking or Profile? No, just finish.
    await interaction.update({ embeds: [embed], components: [] });
  }
}
