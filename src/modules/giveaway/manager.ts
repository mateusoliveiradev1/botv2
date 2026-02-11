import {
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonInteraction,
  ModalSubmitInteraction,
  Guild,
  Client,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { db } from "../../core/DatabaseManager";
import logger from "../../core/logger";

export class GiveawayManager {
  // --- ADMIN PANEL ---
  static async sendAdminPanel(channel: TextChannel) {
    // Check if panel exists to avoid spam
    const messages = await channel.messages.fetch({ limit: 5 });
    const hasPanel = messages.some(
      (m) =>
        m.embeds.length > 0 &&
        m.embeds[0]?.title === "🎉 PAINEL DE CONTROLE DE SORTEIOS" &&
        m.author.id === channel.client.user?.id,
    );

    if (hasPanel) {
      logger.info("Giveaway Panel already exists, skipping.");
      return;
    }

    await channel.bulkDelete(10).catch(() => {});

    const embed = new EmbedBuilder()
      .setTitle("🎉 PAINEL DE CONTROLE DE SORTEIOS")
      .setDescription(
        "Gerencie todas as premiações do servidor por aqui.\n\n" +
          "🆕 **Criar Sorteio**: Inicia o fluxo de configuração.\n" +
          "🎲 **Gerenciar Ativos**: Encerra ou refaz sorteios manualmente.",
      )
      .setColor("#9B59B6") // Purple
      .setThumbnail("https://cdn-icons-png.flaticon.com/512/4213/4213958.png") // Gift Icon
      .setFooter({ text: "Sistema de Sorteios v2.0 • BlueZone Sentinel" });

    // Step 1: Select Type
    const typeSelect = new StringSelectMenuBuilder()
      .setCustomId("giveaway_type_select")
      .setPlaceholder("🎁 Selecione o tipo de prêmio para começar...")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Blue Coins (Automático)")
          .setValue("COINS")
          .setDescription(
            "O bot entrega as moedas automaticamente ao vencedor.",
          )
          .setEmoji("💎"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Experiência / XP (Automático)")
          .setValue("XP")
          .setDescription("O bot adiciona XP ao nível do vencedor.")
          .setEmoji("⭐"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Item / Outro (Manual)")
          .setValue("MANUAL")
          .setDescription(
            "Skins, Gift Cards ou Itens que você entrega manualmente.",
          )
          .setEmoji("📦"),
      );

    const rowSelect =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(typeSelect);

    const rowBtns = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("giveaway_manage_btn")
        .setLabel("🎲 Gerenciar Ativos")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⚙️"),
    );

    await channel.send({ embeds: [embed], components: [rowSelect, rowBtns] });
  }

  // --- INTERACTION HANDLERS ---

  static async handleInteraction(interaction: any) {
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "giveaway_type_select") {
        await this.showCreateModal(interaction, interaction.values[0]);
      }
    } else if (interaction.isButton()) {
      if (interaction.customId === "giveaway_join_btn") {
        await this.handleJoin(interaction);
      } else if (interaction.customId === "giveaway_manage_btn") {
        await interaction.reply({
          content:
            "🚧 Funcionalidade em desenvolvimento (Use o banco de dados por enquanto).",
          flags: 64,
        });
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("giveaway_create_modal_")) {
        await this.handleCreateSubmit(interaction);
      }
    }
  }

  // --- CREATE FLOW ---

  private static async showCreateModal(interaction: any, type: string) {
    const modal = new ModalBuilder()
      .setCustomId(`giveaway_create_modal_${type}`)
      .setTitle(
        `🎁 Sorteio: ${type === "COINS" ? "Blue Coins" : type === "XP" ? "Experiência" : "Item Manual"}`,
      );

    let label = "Nome do Prêmio";
    let placeholder = "Ex: Skin M416 Gold";

    if (type === "COINS") {
      label = "Quantidade de Blue Coins";
      placeholder = "Ex: 1000";
    } else if (type === "XP") {
      label = "Quantidade de XP";
      placeholder = "Ex: 500";
    }

    const prizeInput = new TextInputBuilder()
      .setCustomId("ga_prize")
      .setLabel(label)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(placeholder)
      .setRequired(true);

    const durationInput = new TextInputBuilder()
      .setCustomId("ga_duration")
      .setLabel("Duração (m/h/d)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Ex: 2h, 30m, 1d")
      .setRequired(true);

    const winnersInput = new TextInputBuilder()
      .setCustomId("ga_winners")
      .setLabel("Número de Ganhadores")
      .setStyle(TextInputStyle.Short)
      .setValue("1")
      .setRequired(true);

    const descInput = new TextInputBuilder()
      .setCustomId("ga_desc")
      .setLabel("Descrição / Regras (Opcional)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Ex: Necessário estar no canal de voz durante o sorteio.")
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(prizeInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(durationInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(winnersInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(descInput),
    );

    await interaction.showModal(modal);
  }

  private static async handleCreateSubmit(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: 64 });

    const type = interaction.customId.split("_")[3]; // COINS, XP, MANUAL
    const rawPrize = interaction.fields.getTextInputValue("ga_prize");
    const durationStr = interaction.fields.getTextInputValue("ga_duration");
    const winnersCount =
      parseInt(interaction.fields.getTextInputValue("ga_winners")) || 1;
    const description = interaction.fields.getTextInputValue("ga_desc");

    // Validation for Auto Types
    let amount: number | null = null;
    let prizeDisplay = rawPrize;

    if (type === "COINS" || type === "XP") {
      amount = parseInt(rawPrize);
      if (isNaN(amount) || amount <= 0) {
        await interaction.editReply(
          "❌ Quantidade inválida! Digite apenas números.",
        );
        return;
      }
      prizeDisplay = `${amount} ${type === "COINS" ? "Blue Coins" : "XP"}`;
    }

    // Parse Duration
    const endsAt = this.parseDuration(durationStr);
    if (!endsAt) {
      await interaction.editReply(
        "❌ Duração inválida! Use formatos como: 10m, 2h, 1d.",
      );
      return;
    }

    // Find Public Channel
    const publicChannel = interaction.guild?.channels.cache.find(
      (c) => c.name === "🎁-premiações" && c.type === 0,
    ) as TextChannel;

    if (!publicChannel) {
      await interaction.editReply("❌ Canal '🎁-premiações' não encontrado.");
      return;
    }

    // Create Embed
    const unixTime = Math.floor(endsAt.getTime() / 1000);
    const embed = new EmbedBuilder()
      .setTitle(`🎉 SORTEIO: ${prizeDisplay.toUpperCase()}`)
      .setDescription(
        `\n${description ? `> *${description}*\n\n` : ""}**Participantes:** 0\n**Ganhadores:** ${winnersCount}\n**Termina em:** <t:${unixTime}:R> (<t:${unixTime}:f>)`,
      )
      .setColor(
        type === "COINS" ? "#3498DB" : type === "XP" ? "#F1C40F" : "#9B59B6",
      ) // Blue for Coins, Gold for XP, Purple for Manual
      .setThumbnail("https://cdn-icons-png.flaticon.com/512/3113/3113054.png") // Confetti
      .setFooter({
        text:
          type !== "MANUAL"
            ? "⚡ Entrega Automática pelo Sistema"
            : "📦 Entrega Manual via Ticket",
      })
      .setTimestamp(endsAt);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("giveaway_join_btn")
        .setLabel("🎉 Quero Ganhar!")
        .setStyle(ButtonStyle.Primary),
    );

    const message = await publicChannel.send({
      content: "📢 **NOVO SORTEIO NO AR!** @everyone",
      embeds: [embed],
      components: [row],
    });

    // Save to DB
    try {
      await db.prisma.giveaway.create({
        data: {
          guildId: interaction.guildId!,
          channelId: publicChannel.id,
          messageId: message.id,
          hostId: interaction.user.id,
          prize: prizeDisplay,
          description: description,
          winnersCount: winnersCount,
          endsAt: endsAt,
          status: "ACTIVE",
          type: type,
          amount: amount,
        },
      });

      await interaction.editReply(
        `✅ Sorteio criado com sucesso em ${publicChannel}!`,
      );
    } catch (e) {
      logger.error(e, "Failed to create giveaway in DB");
      await message.delete().catch(() => {}); // Cleanup on fail
      await interaction.editReply(
        "❌ Erro ao salvar sorteio no banco de dados.",
      );
    }
  }

  // --- JOIN FLOW ---

  private static async handleJoin(interaction: ButtonInteraction) {
    const giveaway = await db.prisma.giveaway.findUnique({
      where: { messageId: interaction.message.id },
      include: { participants: true },
    });

    if (!giveaway || giveaway.status !== "ACTIVE") {
      await interaction.reply({
        content: "🚫 Este sorteio já encerrou ou não existe.",
        flags: 64,
      });
      return;
    }

    // Check if already joined
    const alreadyJoined = giveaway.participants.some(
      (p) => p.userId === interaction.user.id,
    );
    if (alreadyJoined) {
      // Optional: Allow leave? For now just say already joined.
      await interaction.reply({
        content: "✅ Você já está participando deste sorteio!",
        flags: 64,
      });
      return;
    }

    // Add to DB
    try {
      await db.prisma.giveawayParticipant.create({
        data: {
          giveawayId: giveaway.id,
          userId: interaction.user.id,
        },
      });

      // Update Embed Count (Visual Only, to avoid DB spam we could batch update, but for now update every join is fine for low scale)
      const newCount = giveaway.participants.length + 1;
      const oldEmbed = interaction.message.embeds[0];
      if (oldEmbed) {
        // Regex to replace "Participantes: X"
        const newDesc = oldEmbed.description?.replace(
          /\*\*Participantes:\*\* \d+/,
          `**Participantes:** ${newCount}`,
        );

        const newEmbed = EmbedBuilder.from(oldEmbed).setDescription(
          newDesc || "",
        );
        await interaction.message.edit({ embeds: [newEmbed] });
      }

      await interaction.reply({
        content: "🎉 **Confirmado!** Boa sorte, operador.",
        flags: 64,
      });
    } catch (e) {
      logger.error(e, "Error joining giveaway");
      await interaction.reply({
        content: "❌ Erro ao processar sua entrada.",
        flags: 64,
      });
    }
  }

  // --- ENDING LOGIC ---

  static async startMonitoring(client: Client) {
    setInterval(() => this.checkGiveaways(client), 60000); // Check every minute
    logger.info("⏰ Giveaway Monitor Started");
  }

  private static async checkGiveaways(client: Client) {
    const expired = await db.prisma.giveaway.findMany({
      where: {
        status: "ACTIVE",
        endsAt: { lte: new Date() },
      },
      include: { participants: true },
    });

    for (const giveaway of expired) {
      await this.endGiveaway(client, giveaway);
    }
  }

  private static async endGiveaway(client: Client, giveaway: any) {
    try {
      // Fetch Channel and Message
      const channel = (await client.channels.fetch(
        giveaway.channelId,
      )) as TextChannel;
      if (!channel) return;

      const message = await channel.messages
        .fetch(giveaway.messageId)
        .catch(() => null);
      if (!message) return;

      // Pick Winners
      const participants = giveaway.participants.map((p: any) => p.userId);
      const winners: string[] = [];

      if (participants.length === 0) {
        winners.push("Ninguém participou 😢");
      } else {
        for (let i = 0; i < giveaway.winnersCount; i++) {
          if (participants.length === 0) break;
          const randomIndex = Math.floor(Math.random() * participants.length);
          winners.push(participants[randomIndex]);
          participants.splice(randomIndex, 1); // Remove to avoid duplicates
        }
      }

      // Format Winners Text
      const winnersText = winners
        .map((w) => (w.startsWith("Ninguém") ? w : `<@${w}>`))
        .join(", ");

      // Update Embed
      const oldEmbed = message.embeds[0];
      const newEmbed = EmbedBuilder.from(oldEmbed)
        .setTitle(`🎊 SORTEIO ENCERRADO: ${giveaway.prize}`)
        .setDescription(
          `**Ganhador(es):** ${winnersText}\n\nObrigado a todos que participaram!`,
        )
        .setColor("#2ECC71") // Green
        .setFooter({ text: "Sorteio Finalizado" });

      // Disable Button
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("giveaway_ended")
          .setLabel("Sorteio Encerrado")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      );

      await message.edit({
        content: "🎉 **TEMOS VENCEDORES!**",
        embeds: [newEmbed],
        components: [row],
      });

      if (winners.length > 0 && !winners[0].startsWith("Ninguém")) {
        // Process Auto Rewards
        for (const winnerId of winners) {
          if (giveaway.type === "COINS" && giveaway.amount) {
            await db.prisma.userEconomy.upsert({
              where: { userId: winnerId },
              create: { userId: winnerId, balance: giveaway.amount },
              update: { balance: { increment: giveaway.amount } },
            });
          } else if (giveaway.type === "XP" && giveaway.amount) {
            await db.prisma.userXP.upsert({
              where: { userId: winnerId },
              create: { userId: winnerId, xp: giveaway.amount },
              update: { xp: { increment: giveaway.amount } },
            });
          }
        }

        const autoMsg =
          giveaway.type === "COINS"
            ? `\n💰 **${giveaway.amount} BC** foram depositados na sua conta!`
            : giveaway.type === "XP"
              ? `\n⭐ **${giveaway.amount} XP** foram adicionados ao seu perfil!`
              : `\n📦 Abra um ticket para resgatar seu prêmio!`;

        await channel.send(
          `🎉 Parabéns ${winnersText}! Você ganhou **${giveaway.prize}**!${autoMsg}`,
        );
      }

      // Update DB
      await db.prisma.giveaway.update({
        where: { id: giveaway.id },
        data: { status: "ENDED" },
      });
    } catch (e) {
      logger.error(e, `Failed to end giveaway ${giveaway.id}`);
    }
  }

  // --- UTILS ---
  private static parseDuration(str: string): Date | null {
    const match = str.match(/^(\d+)([mhd])$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];
    const date = new Date();

    if (unit === "m") date.setMinutes(date.getMinutes() + value);
    if (unit === "h") date.setHours(date.getHours() + value);
    if (unit === "d") date.setDate(date.getDate() + value);

    return date;
  }
}
