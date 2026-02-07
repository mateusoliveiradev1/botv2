import {
  ButtonInteraction,
  EmbedBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
  User,
  PermissionFlagsBits,
  VoiceChannel,
  CategoryChannel,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags, // Added
} from "discord.js";
import * as fs from "fs";
import * as path from "path";
import logger from "../../core/logger";
import { ScrimManager } from "../scrims/manager";
import { LogManager, LogType, LogLevel } from "../logger/LogManager";

const DATA_PATH = path.join(process.cwd(), "data", "mercenaries.json");

interface MercenaryData {
  userId: string;
  contracts: number;
  reputation: {
    comms: number;
    gunplay: number;
    sense: number;
    synergy: number;
    count: number;
  };
  history: {
    date: string;
    clan: string;
    feedback?: string;
  }[];
}

interface Database {
  mercenaries: Record<string, MercenaryData>;
}

export class MercenaryManager {
  private static DATA_PATH = path.join(
    process.cwd(),
    "data",
    "mercenaries.json",
  );
  private static data: Database = { mercenaries: {} };

  static loadData() {
    if (fs.existsSync(DATA_PATH)) {
      this.data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
    }
  }

  static saveData() {
    fs.writeFileSync(DATA_PATH, JSON.stringify(this.data, null, 2));
  }

  static getMercenary(userId: string): MercenaryData {
    this.loadData();
    if (!this.data.mercenaries[userId]) {
      this.data.mercenaries[userId] = {
        userId,
        contracts: 0,
        reputation: { comms: 0, gunplay: 0, sense: 0, synergy: 0, count: 0 },
        history: [],
      };
    }
    return this.data.mercenaries[userId];
  }

  static createProgressBar(value: number, max: number = 5): string {
    const filled = Math.round(value);
    const empty = max - filled;
    return "🟩".repeat(filled) + "⬜".repeat(empty);
  }

  static async handleInteraction(interaction: ButtonInteraction | any) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    // 1. Buttons
    if (interaction.isButton()) {
      const id = interaction.customId;

      // Apply Logic
      if (id.startsWith("scrim_apply_merc")) {
        await this.handleApplication(interaction);
        return;
      }

      if (id.startsWith("merc_approve_")) {
        await this.handleApproval(interaction);
        return;
      }

      if (id.startsWith("merc_reject_")) {
        await this.handleRejection(interaction);
        return;
      }

      if (id.startsWith("merc_end_")) {
        await this.handleEndOperation(interaction);
        return;
      }

      if (id.startsWith("open_merc_eval_")) {
        await this.handleEvaluationModalOpen(interaction);
        return;
      }

      if (id.startsWith("merc_hire_")) {
        await this.handleHiring(interaction);
        return;
      }

      if (id.startsWith("merc_dismiss_")) {
        await this.handleDismissal(interaction);
        return;
      }

      if (
        id.startsWith("merc_accept_contract_") ||
        id.startsWith("merc_decline_contract_")
      ) {
        await this.handleContractResponse(interaction);
        return;
      }

      if (id.startsWith("merc_agree_")) {
        await this.handleMatchAgreement(interaction);
        return;
      }

      if (id.startsWith("merc_cancel_")) {
        await this.handleMatchCancel(interaction);
        return;
      }

      // Mercenary Join/Leave (Channel)
      if (id === "mercenary_join" || id === "mercenary_leave") {
        const role = interaction.guild?.roles.cache.find(
          (r: any) => r.name === "⛑️ Mercenário",
        );
        const member = interaction.member as GuildMember;

        if (!role) {
          await interaction.reply({
            content: "❌ Erro: Cargo de Mercenário não encontrado.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (id === "mercenary_join") {
          await member.roles.add(role);

          await LogManager.log({
            guild: interaction.guild!,
            type: LogType.MEMBER,
            level: LogLevel.INFO,
            title: "⛑️ Alistamento Mercenário",
            description: `Combatente se colocou à disposição.`,
            executor: interaction.user,
          });

          await interaction.reply({
            content:
              "✅ **Alistado!** Você agora é um Mercenário e será notificado de vagas.",
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await member.roles.remove(role);

          await LogManager.log({
            guild: interaction.guild!,
            type: LogType.MEMBER,
            level: LogLevel.INFO,
            title: "👋 Baixa Mercenária",
            description: `Combatente saiu da lista de disponíveis.`,
            executor: interaction.user,
          });

          await interaction.reply({
            content: "❌ **Dispensado!** Você saiu da lista de Mercenários.",
            flags: MessageFlags.Ephemeral,
          });
        }
        return;
      }
    }

    // 2. Modals
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("merc_eval_submit_")) {
        await this.handleEvaluationModalSubmit(interaction);
        return;
      }
    }
  }

  static async handleApplication(interaction: ButtonInteraction) {
    await interaction.deferReply({ flags: 64 }); // Ephemeral

    // Security Check: Verify Mercenary Role
    const member = interaction.member as GuildMember;
    const mercRole = interaction.guild?.roles.cache.find(
      (r) => r.name === "⛑️ Mercenário",
    );

    if (mercRole && !member.roles.cache.has(mercRole.id)) {
      await interaction.editReply({
        content:
          "🚫 **Acesso Negado:** Você precisa se registrar como **Mercenário** antes de se candidatar.\nUse o comando `/mercenario` ou procure a aba de Registro.",
      });
      return;
    }

    const targetClan = interaction.customId.split("_")[3]; // scrim_apply_merc_CLAN_MSGID
    const clanName = targetClan.replace(/-/g, " "); // Clean name

    // 1. Build Dossier
    const merc = this.getMercenary(interaction.user.id);
    const avg =
      merc.reputation.count > 0
        ? (
            (merc.reputation.comms +
              merc.reputation.gunplay +
              merc.reputation.sense +
              merc.reputation.synergy) /
            4
          ).toFixed(1)
        : "N/A";

    const historyCount = merc.contracts;
    const clanHistory = merc.history.filter((h) =>
      h.clan.includes(clanName),
    ).length;

    // Get Last Feedback
    const lastFeedbackEntry = [...merc.history]
      .reverse()
      .find((h) => h.feedback);
    const lastFeedback = lastFeedbackEntry
      ? `*"${lastFeedbackEntry.feedback}"*`
      : "*Nenhum feedback registrado.*";

    // 2. Find Dossier Channel
    // All dossiers go to the specific private channel for the clan leaders
    let dossierChannelName = "";
    // Clean inputs to avoid case sensitivity issues
    const cleanTarget = targetClan
      .toLowerCase()
      .replace(/-/g, "")
      .replace(/\s/g, ""); // hawkesports

    // We can use the dossier channel if it exists, or fallback to leadership
    // But per plan V5, we use 📄-dossies-operacionais which is unique per category?
    // In constants.ts, we added 📄-dossies-operacionais to EACH clan category.
    // So finding by name will return the first one found unless we filter by parent?
    // Discord.js cache.find returns the first match.
    // We need to find the one INSIDE the correct Category.

    let categoryName = "";
    if (cleanTarget.includes("hawk")) categoryName = "🦅 | QG HAWK ESPORTS";
    else if (cleanTarget.includes("mira")) categoryName = "🎯 | QG MIRA RUIM";

    // Flexible Category Search (REGEX FORCE)
    const cleanHawk = "hawkesports";
    const cleanMira = "miraruim";

    const category = interaction.guild?.channels.cache.find((c) => {
      if (c.type !== 4) return false;
      const cleanName = c.name.replace(/[^a-zA-Z]/g, "").toLowerCase();

      if (targetClan.includes("Hawk") && cleanName.includes(cleanHawk))
        return true;
      if (targetClan.includes("Mira") && cleanName.includes(cleanMira))
        return true;
      return false;
    }) as CategoryChannel;

    let dossierChannel: TextChannel | undefined;

    if (category) {
      // Find channel specifically inside this category
      dossierChannel = category.children.cache.find(
        (c) => c.name === "📄-dossies-operacionais",
      ) as TextChannel;

      // If not found in cache, fetch it (sometimes cache is stale)
      if (!dossierChannel) {
        const channels = await category.guild.channels.fetch();
        dossierChannel = channels.find(
          (c) =>
            c !== null &&
            c.parentId === category.id &&
            c.name === "📄-dossies-operacionais",
        ) as TextChannel;
      }
    } else {
      logger.warn(`Category not found for target: ${categoryName}`);
    }

    if (!dossierChannel) {
      // Fallback: Create Channel on the Fly if it doesn't exist
      // This ensures the system works even if setup wasn't run perfectly
      try {
        if (category) {
          dossierChannel = await interaction.guild?.channels.create({
            name: "📄-dossies-operacionais",
            type: 0, // GuildText
            parent: category.id,
            permissionOverwrites: [
              {
                id: interaction.guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
              }, // Private
              // We need to allow the Leader Role. We don't have it handy easily without lookup.
              // But we can inherit from Category if the category is set up correctly.
              // If not, we rely on the Leader being an Admin or having specific perms.
            ],
          });
          // We should try to find the Leader Role to give access if creating fresh
          let leaderRoleName = "";
          if (categoryName.includes("HAWK")) leaderRoleName = "👑 Líder Hawk";
          else if (categoryName.includes("MIRA"))
            leaderRoleName = "👑 Líder Mira Ruim";

          const leaderRole = interaction.guild?.roles.cache.find(
            (r) => r.name === leaderRoleName,
          );
          if (leaderRole && dossierChannel) {
            await dossierChannel.permissionOverwrites.edit(leaderRole.id, {
              ViewChannel: true,
              SendMessages: true,
            });
          }
        }
      } catch (e) {
        logger.error(e, "Failed to create dossier channel on fly");
      }
    }

    if (!dossierChannel) {
      // Final Fallback to Leadership Channel if creation failed
      if (cleanTarget.includes("hawk"))
        dossierChannelName = "👮-liderança-hawk";
      else if (cleanTarget.includes("mira"))
        dossierChannelName = "👮-liderança-mira";

      dossierChannel = interaction.guild?.channels.cache.find(
        (c) => c.name === dossierChannelName,
      ) as TextChannel;
    }

    if (!dossierChannel) {
      await interaction.editReply({
        content:
          "❌ Erro Crítico: Não foi possível encontrar ou criar o canal de Dossiês.",
      });
      return;
    }

    // 3. Send Application to Leader
    // Retrieve Message ID from customID to link back to the specific SOS (Optional context)
    const sosMessageId = interaction.customId.split("_")[4];

    const embed = new EmbedBuilder()
      .setTitle("📁 DOSSIÊ OPERACIONAL: CANDIDATO")
      .setDescription(
        `O combatente **${interaction.user}** solicitou ingresso na missão.`,
      )
      .setColor("#8A2BE2")
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        {
          name: "📊 Performance Geral",
          value: `⭐ **${avg}** / 5.0\n🏆 **${historyCount}** Missões Cumpridas\n🦅 **${clanHistory}** Operações com este Clã`,
          inline: false,
        },
        {
          name: "🧠 Análise Tática (Média)",
          value: `
🗣️ **Comms:** ${this.createProgressBar(merc.reputation.comms)} (${merc.reputation.comms.toFixed(1)})
🔫 **Gunplay:** ${this.createProgressBar(merc.reputation.gunplay)} (${merc.reputation.gunplay.toFixed(1)})
🧠 **Sense:** ${this.createProgressBar(merc.reputation.sense)} (${merc.reputation.sense.toFixed(1)})
🤝 **Sinergia:** ${this.createProgressBar(merc.reputation.synergy)} (${merc.reputation.synergy.toFixed(1)})
          `.trim(),
          inline: false,
        },
        {
          name: "📝 Último Feedback",
          value: lastFeedback,
          inline: false,
        },
      )
      .setFooter({ text: "Analise os dados antes de abrir negociação." });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`merc_approve_${interaction.user.id}_${targetClan}`)
        .setLabel("✅ Abrir Negociação")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`merc_reject_${interaction.user.id}`)
        .setLabel("❌ Recusar")
        .setStyle(ButtonStyle.Danger),
    );

    await dossierChannel.send({
      content: `@here 🚨 **NOVO CANDIDATO IDENTIFICADO!**`,
      embeds: [embed],
      components: [row],
    });

    await interaction.editReply({
      content: `✅ **Dossiê Enviado!** Seus dados foram encaminhados para a Sala de Decisão da ${clanName}. Aguarde contato.`,
    });
  }

  static async handleApproval(interaction: ButtonInteraction) {
    await interaction.deferReply({ flags: 64 }); // Ephemeral check

    const parts = interaction.customId.split("_");
    const userId = parts[2];
    const clanTag = parts[3]; // Hawk-Esports or similar

    const member = await interaction.guild?.members.fetch(userId);
    if (!member) {
      await interaction.editReply({
        content: "❌ Usuário não encontrado no servidor.",
      });
      return;
    }

    // 1. Create Negotiation Room (Temp Channel)
    // Format: 🤝-negociacao-TAG
    // Permission: Private to Leader + Mercenary
    const channelName = `🤝-negociacao-${member.displayName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;

    // DEBUG: List Categories
    /*
    const allCats = interaction.guild?.channels.cache.filter(c => c.type === 4).map(c => c.name);
    logger.info(`Categories found: ${allCats?.join(', ')}`);
    */

    // Flexible Category Search (REGEX FORCE)
    const cleanHawk = "hawkesports";
    const cleanMira = "miraruim";

    // Debug info to find out what categories exist
    const categories = interaction.guild?.channels.cache.filter(
      (c) => c.type === 4,
    );
    if (categories) {
      categories.forEach((c) => {
        const cleanName = c.name.replace(/[^a-zA-Z]/g, "").toLowerCase();
        logger.info(
          `Checking Cat: ${c.name} -> ${cleanName} (Target: ${cleanHawk} or ${cleanMira})`,
        );
      });
    }

    const category = interaction.guild?.channels.cache.find((c) => {
      if (c.type !== 4) return false;
      const cleanName = c.name.replace(/[^a-zA-Z]/g, "").toLowerCase();

      if (clanTag.includes("Hawk") && cleanName.includes(cleanHawk))
        return true;
      if (clanTag.includes("Mira") && cleanName.includes(cleanMira))
        return true;
      return false;
    }) as CategoryChannel;

    if (category)
      logger.info(`Found Category for Negotiation: ${category.name}`);
    else logger.warn(`Negotiation Category NOT FOUND for ${clanTag}`);

    if (!category) {
      await interaction.editReply({
        content: "❌ Erro: Categoria do Clã não encontrada.",
      });
      return;
    }

    const tempChannel = await interaction.guild?.channels.create({
      name: channelName,
      type: 0, // GuildText
      parent: category.id,
      permissionOverwrites: [
        {
          id: interaction.guild.id, // Everyone
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id, // Leader
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
          ],
        },
        {
          id: member.id, // Mercenary
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
          ],
        },
      ],
    });

    if (!tempChannel) {
      await interaction.editReply({
        content: "❌ Erro ao criar sala de negociação.",
      });
      return;
    }

    // 2. Send Welcome Message
    const embed = new EmbedBuilder()
      .setTitle("🤝 SALA DE NEGOCIAÇÃO")
      .setDescription(
        `Este canal é privado entre **${interaction.user.displayName}** (Líder) e **${member.displayName}** (Candidato).\n\nCombinem os detalhes da missão aqui.\n\n**STATUS DO ACORDO:**\n🟡 Aguardando confirmação de ambas as partes.`,
      )
      .setColor("#FFFF00")
      .addFields(
        { name: "Líder", value: "⏳ Pendente", inline: true },
        { name: "Mercenário", value: "⏳ Pendente", inline: true },
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`merc_agree_${member.id}_${clanTag}_${tempChannel.id}`)
        .setLabel("✅ Aceitar Condições")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`merc_cancel_${tempChannel.id}`)
        .setLabel("❌ Cancelar Negociação")
        .setStyle(ButtonStyle.Danger),
    );

    await tempChannel.send({
      content: `${interaction.user} ${member}`,
      embeds: [embed],
      components: [row],
    });

    // 3. Update Interaction
    await interaction.editReply({
      content: `✅ **Negociação Aberta!** Acesse a sala: ${tempChannel}`,
    });

    // Disable Buttons on Dossier
    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("disabled_1")
        .setLabel(`Em negociação...`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );
    await interaction.message.edit({ components: [disabledRow] });
  }

  static async handleMatchAgreement(interaction: ButtonInteraction) {
    // Logic: Check who clicked. Update Embed. If both agreed, call handleMatchConfirmation.
    await interaction.deferUpdate();

    const parts = interaction.customId.split("_");
    const mercId = parts[2];
    const clanTag = parts[3];
    // const channelId = parts[4]; // Available if needed

    const message = interaction.message;
    const embed = EmbedBuilder.from(message.embeds[0]);

    // Check who clicked
    const isLeader = interaction.user.id !== mercId;
    const isMerc = interaction.user.id === mercId;

    // Update Fields
    // Field 0: Leader, Field 1: Mercenary
    let leaderStatus = embed.data.fields?.[0].value || "⏳ Pendente";
    let mercStatus = embed.data.fields?.[1].value || "⏳ Pendente";

    if (isLeader) {
      leaderStatus = "✅ Aceitou";
    }
    if (isMerc) {
      mercStatus = "✅ Aceitou";
    }

    embed.setFields(
      { name: "Líder", value: leaderStatus, inline: true },
      { name: "Mercenário", value: mercStatus, inline: true },
    );

    // Check if both agreed
    if (leaderStatus.includes("✅") && mercStatus.includes("✅")) {
      embed.setDescription(
        `**STATUS DO ACORDO:**\n🟢 **CONFIRMADO!** Acesso sendo liberado...`,
      );
      embed.setColor("#00FF00");
      await interaction.editReply({ embeds: [embed], components: [] }); // Remove buttons to prevent spam

      // Call Confirmation Logic
      // We need to simulate the old ID structure or just call the logic directly.
      // Let's refactor handleMatchConfirmation to take params instead of interaction parsing, or construct a fake interaction?
      // Better: Extract logic to private method.
      // For now, let's call a new method `finalizeMatch`.
      await this.finalizeMatch(
        interaction,
        mercId,
        clanTag,
        interaction.channelId,
      );
    } else {
      embed.setDescription(
        `**STATUS DO ACORDO:**\n🟡 Aguardando a outra parte...`,
      );
      await interaction.editReply({ embeds: [embed] });
    }
  }

  static async finalizeMatch(
    interaction: ButtonInteraction,
    userId: string,
    clanTag: string,
    channelId: string,
  ) {
    try {
      logger.info(`Finalizing match: ${userId}, ${clanTag}, ${channelId}`);
      const member = await interaction.guild?.members.fetch(userId);
      if (!member) {
        logger.error(`FinalizeMatch: Member ${userId} not found.`);
        // Continue anyway to close channel?
      } else {
        // 1. Grant Voice & Chat Access
        let voiceChannelName = "";
        let chatChannelName = "";

        if (clanTag.includes("Hawk")) {
          voiceChannelName = "🔊 Scrim Alpha Hawk";
          chatChannelName = "💬-chat-hawk";
        } else if (clanTag.includes("Mira")) {
          voiceChannelName = "🔊 Scrim Alpha Mira";
          chatChannelName = "💬-chat-mira-ruim";
        }

        // Grant Voice
        const voiceChannel = interaction.guild?.channels.cache.find(
          (c) => c.name === voiceChannelName,
        ) as VoiceChannel;

        if (voiceChannel) {
          await voiceChannel.setUserLimit(6);
          await voiceChannel.permissionOverwrites.edit(member.id, {
            Connect: true,
            Speak: true,
            ViewChannel: true,
          });
        }

        // Grant Chat
        const chatChannel = interaction.guild?.channels.cache.find(
          (c) => c.name === chatChannelName,
        ) as TextChannel;

        if (chatChannel) {
          await chatChannel.permissionOverwrites.edit(member.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
          });
        }
      }

      // 2. Log History
      try {
        const merc = this.getMercenary(userId);
        merc.contracts += 1;
        merc.history.push({
          date: new Date().toLocaleDateString(),
          clan: clanTag,
        });
        this.saveData();
      } catch (err) {
        logger.error(err, "Failed to save mercenary history");
      }

      // 3. Notify & Schedule Delete
      // Send message in the channel
      if (interaction.channel && interaction.channel.type === 0) {
        await (interaction.channel as TextChannel).send(
          "🚀 **Acesso Liberado!** Sala será destruída em 10 segundos...",
        );
      }

      setTimeout(async () => {
        const channel = interaction.guild?.channels.cache.get(channelId);
        if (channel) {
          await channel
            .delete()
            .catch((e) => logger.error(e, "Failed to delete temp channel"));
        } else {
          logger.warn(
            `FinalizeMatch: Channel ${channelId} not found for deletion.`,
          );
        }
      }, 10000);

      // 4. Send End Operation Panel to Leadership Channel
      // Use REGEX to find channel safely
      // ... (Regex Logic)

      let targetChannelName = "";
      if (clanTag.includes("Hawk")) targetChannelName = "👮-liderança-hawk";
      else if (clanTag.includes("Mira"))
        targetChannelName = "👮-liderança-mira";

      const leaderChannel = interaction.guild?.channels.cache.find(
        (c) => c.name === targetChannelName && c.type === 0,
      ) as TextChannel;

      const endRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`merc_end_${userId}_${clanTag}`)
          .setLabel("🏁 Encerrar Operação & Avaliar")
          .setStyle(ButtonStyle.Primary),
      );

      const endContent = `⏱️ **Operação em Andamento: ${member ? member.displayName : "Mercenário"}**\nQuando terminar, clique abaixo para avaliar e revogar o acesso.`;

      if (leaderChannel) {
        logger.info(
          `Sending end panel to leader channel: ${leaderChannel.name}`,
        );
        await leaderChannel.send({
          content: endContent,
          components: [endRow],
        });
      } else {
        logger.warn(
          `Leader channel not found for ${targetChannelName}. Using fallback.`,
        );
        // Fallback: Send in current channel if leadership channel not found
        // This ensures the button is available SOMEWHERE
        if (interaction.channel && interaction.channel.type === 0) {
          await (interaction.channel as TextChannel).send({
            content: `⚠️ **Aviso:** Canal de Liderança não encontrado. Painel de encerramento enviado aqui por segurança.\n\n${endContent}`,
            components: [endRow],
          });
        }
      }
    } catch (error) {
      logger.error(error, "Critical error in finalizeMatch");
      if (interaction.channel && interaction.channel.type === 0) {
        await (interaction.channel as TextChannel).send(
          "❌ Erro crítico ao finalizar match. Verifique os logs.",
        );
      }
    }
  }

  // Legacy method kept for safety or if we revert, but replaced by handleMatchAgreement logic
  static async handleMatchConfirmation(interaction: ButtonInteraction) {
    // Deprecated in favor of Agreement Flow
    // Redirect to finalizeMatch if somehow called
    const parts = interaction.customId.split("_");
    await this.finalizeMatch(interaction, parts[2], parts[3], parts[4]);
  }

  static async handleMatchCancel(interaction: ButtonInteraction) {
    const channelId = interaction.customId.split("_")[2];
    await interaction.reply({
      content: "❌ Negociação cancelada. Fechando sala...",
    });

    setTimeout(async () => {
      const channel = interaction.guild?.channels.cache.get(channelId);
      if (channel) await channel.delete();
    }, 5000);
  }

  static async handleRejection(interaction: ButtonInteraction) {
    const userId = interaction.customId.split("_")[2];
    const member = await interaction.guild?.members.fetch(userId);

    if (member) {
      try {
        await member.send(
          "❌ **Solicitação Recusada.**\nO Clã optou por outro combatente no momento.",
        );
      } catch (e) {}
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("disabled_2")
        .setLabel(`Recusado por ${interaction.user.username}`)
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true),
    );
    await interaction.message.edit({ components: [row] });
    await interaction.reply({ content: "🚫 Candidato dispensado.", flags: 64 });
  }

  static async handleEndOperation(interaction: ButtonInteraction) {
    await interaction.deferUpdate(); // Update existing message instead of new reply

    const parts = interaction.customId.split("_");
    const userId = parts[2];
    const clanTag = parts[3];

    const member = await interaction.guild?.members.fetch(userId);

    // 1. Revoke Access
    let voiceChannelName = "";
    let chatChannelName = "";

    if (clanTag.includes("Hawk")) {
      voiceChannelName = "🔊 Scrim Alpha Hawk";
      chatChannelName = "💬-chat-hawk";
    } else if (clanTag.includes("Mira")) {
      voiceChannelName = "🔊 Scrim Alpha Mira";
      chatChannelName = "💬-chat-mira-ruim";
    }

    const voiceChannel = interaction.guild?.channels.cache.find(
      (c) => c.name === voiceChannelName,
    ) as VoiceChannel;
    if (voiceChannel && member) {
      await voiceChannel.permissionOverwrites.delete(member.id);
    }

    const chatChannel = interaction.guild?.channels.cache.find(
      (c) => c.name === chatChannelName,
    ) as TextChannel;
    if (chatChannel && member) {
      await chatChannel.permissionOverwrites.delete(member.id);
    }

    // 2. Feedback Form (Leader -> Merc)
    // Send a message with button to Open Modal for detailed rating
    const embed = new EmbedBuilder()
      .setTitle("📝 AVALIAÇÃO DE DESEMPENHO")
      .setDescription(
        `Como foi a atuação de **${member ? member.displayName : "Unknown"}**?`,
      )
      .setColor("#FFFF00");

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`open_merc_eval_${userId}`)
        .setLabel("📝 Avaliar Desempenho")
        .setStyle(ButtonStyle.Primary),
    );

    // Hire Button
    const hireRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`merc_hire_${userId}_${clanTag}`)
        .setLabel("📝 Contratar Definitivamente")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🤝"),
      new ButtonBuilder()
        .setCustomId(`merc_dismiss_${userId}`)
        .setLabel("👋 Dispensar")
        .setStyle(ButtonStyle.Secondary),
    );

    // Edit the ORIGINAL "End Operation" message to become the Evaluation Panel
    await interaction.editReply({
      content: "✅ **Acesso Revogado.** Realize a avaliação abaixo:",
      embeds: [embed],
      components: [row, hireRow],
    });
  }

  static async handleDismissal(interaction: ButtonInteraction) {
    const userId = interaction.customId.split("_")[2];
    const member = await interaction.guild?.members.fetch(userId);

    if (member) {
      try {
        await member.send(
          "👋 **Obrigado pelos serviços prestados.**\nSua missão foi concluída e o acesso ao QG foi revogado. Fique atento a novas oportunidades.",
        );
      } catch (e) {
        // Ignore DM errors
      }
    }

    await interaction.reply({
      content: "✅ **Combatente Dispensado.** O painel será fechado.",
      flags: 64,
    });

    // Disable buttons
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("disabled_dismiss")
        .setLabel("Combatente Dispensado")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );

    await interaction.message.edit({ components: [row] });

    // Clean chat: Delete panel after 5 seconds
    setTimeout(async () => {
      try {
        await interaction.message.delete();
      } catch (e) {
        // Message might already be deleted
      }
    }, 5000);
  }

  static async handleEvaluationModalOpen(interaction: ButtonInteraction) {
    const userId = interaction.customId.split("_")[3];

    const modal = new ModalBuilder()
      .setCustomId(`merc_eval_submit_${userId}`)
      .setTitle("Avaliação de Combatente");

    // Inputs: Comms, Gunplay, Sense, Synergy (0-5) + Feedback
    // Since we are limited to 5 components in a modal, we fit exactly.

    const commsInput = new TextInputBuilder()
      .setCustomId("eval_comms")
      .setLabel("🗣️ Comms (0-5)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Ex: 5")
      .setMaxLength(1)
      .setRequired(true);

    const gunplayInput = new TextInputBuilder()
      .setCustomId("eval_gunplay")
      .setLabel("🔫 Gunplay (0-5)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Ex: 4")
      .setMaxLength(1)
      .setRequired(true);

    const senseInput = new TextInputBuilder()
      .setCustomId("eval_sense")
      .setLabel("🧠 Game Sense (0-5)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Ex: 3")
      .setMaxLength(1)
      .setRequired(true);

    const synergyInput = new TextInputBuilder()
      .setCustomId("eval_synergy")
      .setLabel("🤝 Sinergia (0-5)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Ex: 5")
      .setMaxLength(1)
      .setRequired(true);

    const feedbackInput = new TextInputBuilder()
      .setCustomId("eval_feedback")
      .setLabel("📝 Feedback Escrito (Opcional)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Pontos fortes e fracos...")
      .setMaxLength(500)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(commsInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(gunplayInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(senseInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(synergyInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(feedbackInput),
    );

    await interaction.showModal(modal);
  }

  static async handleEvaluationModalSubmit(interaction: any) {
    // Type is ModalSubmitInteraction but we use any to avoid import bloat if not imported
    const userId = interaction.customId.split("_")[3];

    const comms =
      parseInt(interaction.fields.getTextInputValue("eval_comms")) || 0;
    const gunplay =
      parseInt(interaction.fields.getTextInputValue("eval_gunplay")) || 0;
    const sense =
      parseInt(interaction.fields.getTextInputValue("eval_sense")) || 0;
    const synergy =
      parseInt(interaction.fields.getTextInputValue("eval_synergy")) || 0;
    const feedback = interaction.fields.getTextInputValue("eval_feedback");

    // Validate Range
    if ([comms, gunplay, sense, synergy].some((v) => v < 0 || v > 5)) {
      await interaction.reply({
        content: "❌ As notas devem ser entre 0 e 5.",
        flags: 64,
      });
      return;
    }

    // Update Data
    const merc = this.getMercenary(userId);
    const n = merc.reputation.count;

    // Weighted Average Update
    merc.reputation.comms = (merc.reputation.comms * n + comms) / (n + 1);
    merc.reputation.gunplay = (merc.reputation.gunplay * n + gunplay) / (n + 1);
    merc.reputation.sense = (merc.reputation.sense * n + sense) / (n + 1);
    merc.reputation.synergy = (merc.reputation.synergy * n + synergy) / (n + 1);
    merc.reputation.count += 1;

    // Add to History (Find the last entry or create new log?)
    // We usually rate the last mission. Let's find the last history entry.
    if (merc.history.length > 0) {
      const lastEntry = merc.history[merc.history.length - 1];
      // Simple check: if it was today
      if (lastEntry.date === new Date().toLocaleDateString()) {
        lastEntry.feedback = feedback;
      }
    }

    this.saveData();

    const avg = ((comms + gunplay + sense + synergy) / 4).toFixed(1);

    await interaction.reply({
      content: `✅ **Avaliação Registrada!**\nMédia da Partida: ⭐ **${avg}**\n\n*Feedback salvo no dossiê.*`,
      flags: 64,
    });

    // Update the original message to disable the button
    try {
      if (interaction.message) {
        const oldRows = interaction.message.components;
        const newRows = oldRows.map((row: any) => {
          const newRow = ActionRowBuilder.from(
            row,
          ) as ActionRowBuilder<ButtonBuilder>;

          const updatedComponents = row.components.map((comp: any) => {
            const newComp = ButtonBuilder.from(comp);
            if (comp.customId && comp.customId.includes("open_merc_eval")) {
              newComp.setDisabled(true);
              newComp.setLabel("✅ Avaliado");
            }
            return newComp;
          });

          newRow.setComponents(updatedComponents);
          return newRow;
        });

        await interaction.message.edit({ components: newRows });
      }
    } catch (e) {
      logger.warn("Could not update message buttons after evaluation");
    }
  }

  static async handleHiring(interaction: ButtonInteraction) {
    const parts = interaction.customId.split("_");
    const userId = parts[2];
    const clanTag = parts[3]; // Hawk-Esports

    const member = await interaction.guild?.members.fetch(userId);
    if (!member) return;

    // Send Contract Proposal via DM
    try {
      const embed = new EmbedBuilder()
        .setTitle(`🦅 PROPOSTA DE CONTRATO OFICIAL: ${clanTag}`)
        .setDescription(
          `Olá **${member.displayName}**,\n\nA liderança da **${clanTag}** ficou impressionada com seu desempenho e gostaria de oficializar sua entrada no time principal.\n\nAo aceitar, você deixará de ser Mercenário e se tornará um Membro Oficial, com acesso total ao QG.\n\n**O que você decide?**`,
        )
        .setColor("#FFD700")
        .setThumbnail("https://cdn-icons-png.flaticon.com/512/1041/1041888.png") // Contract icon
        .setFooter({ text: "Esta proposta expira em 24h." });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`merc_accept_contract_${clanTag}`)
          .setLabel("✍️ Assinar Contrato")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`merc_decline_contract_${clanTag}`)
          .setLabel("❌ Recusar Proposta")
          .setStyle(ButtonStyle.Danger),
      );

      await member.send({ embeds: [embed], components: [row] });
      await interaction.reply({
        content: `✅ **Proposta Enviada!** O contrato foi enviado para a DM de ${member}. Aguardando assinatura.`,
        flags: 64,
      });

      // Disable Hire Button to prevent spam
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("disabled_hire")
          .setLabel("Proposta Enviada")
          .setStyle(ButtonStyle.Success)
          .setDisabled(true),
      );
      // We can't easily edit the previous message here without reference, but the ephemeral reply confirms it.
    } catch (error) {
      await interaction.reply({
        content: `❌ Erro: Não foi possível enviar DM para ${member}. Peça para ele liberar as DMs.`,
        flags: 64,
      });
    }
  }

  static async handleContractResponse(interaction: ButtonInteraction) {
    await interaction.deferReply();

    const action = interaction.customId.includes("accept")
      ? "accept"
      : "decline";
    const clanTag = interaction.customId.split("_")[3];
    const member = interaction.member as GuildMember; // This might be null in DM?
    // In DM, interaction.member is null, interaction.user is valid.
    // But to give roles, we need the GuildMember object from the Guild.
    // Since DM interaction doesn't have guild context directly in some versions, we need to find the guild.
    // But wait, buttons in DM work? Yes.
    // We need to fetch the guild first. Hardcoded or stored?
    // We can try to find the mutual guild.

    // Simplified: We assume the bot is in the guild. We need the Guild ID.
    // Since we don't have it in DM interaction, we can iterate client.guilds or store it in ID?
    // Let's rely on finding the guild where the Role exists.

    const guild = interaction.client.guilds.cache.first(); // Risky if multi-guild, but for this bot it's fine.
    if (!guild) return;

    const guildMember = await guild.members.fetch(interaction.user.id);
    if (!guildMember) return;

    if (action === "decline") {
      await interaction.editReply({
        content: "❌ **Proposta Recusada.** A liderança será notificada.",
        components: [],
      });
      // Notify Leader? (Optional)
      return;
    }

    // ACCEPT FLOW
    // Determine Roles
    let clanRoleName = "";
    let clanIcon = "";
    if (clanTag.includes("Hawk")) {
      clanRoleName = "🦅 Hawk Esports";
      clanIcon = "🦅";
    } else if (clanTag.includes("Mira")) {
      clanRoleName = "🎯 Mira Ruim";
      clanIcon = "🎯";
    }

    const clanRole = guild.roles.cache.find((r) => r.name === clanRoleName);
    const mercRole = guild.roles.cache.find((r) => r.name === "⛑️ Mercenário");

    if (clanRole) {
      await guildMember.roles.add(clanRole);
      if (mercRole) await guildMember.roles.remove(mercRole);

      await interaction.editReply({
        content: `🎉 **PARABÉNS!** Você agora é um membro oficial da **${clanRoleName}**! Acesse o QG no servidor.`,
        components: [],
      });

      const merc = this.getMercenary(interaction.user.id);
      const avg =
        merc.reputation.count > 0
          ? (
              (merc.reputation.comms +
                merc.reputation.gunplay +
                merc.reputation.sense +
                merc.reputation.synergy) /
              4
            ).toFixed(1)
          : "N/A";

      // ANNOUNCEMENT (Transfer Market)
      const transferChannel = guild.channels.cache.find(
        (c) => c.name === "📢-transferencias",
      ) as TextChannel;
      if (transferChannel) {
        const announcementEmbed = new EmbedBuilder()
          .setAuthor({
            name: "📰 BLUEZONE TRANSFER MARKET",
            iconURL: "https://cdn-icons-png.flaticon.com/512/3208/3208726.png",
          })
          .setTitle(`🔥 REFORÇO DE PESO CONFIRMADO!`)
          .setDescription(
            `# ${clanIcon} ${guildMember.displayName.toUpperCase()} AGORA É ${clanRoleName.toUpperCase()}!\n\n` +
              `Após demonstrar habilidade excepcional em campo, o combatente garantiu seu lugar no squad principal.\n\n` +
              `> *"${this.getRandomQuote()}"*`,
          )
          .addFields(
            { name: "👤 Jogador", value: `${guildMember}`, inline: true },
            {
              name: "🛡️ Nova Equipe",
              value: `**${clanRoleName}**`,
              inline: true,
            },
            { name: "📜 Contrato", value: "✅ Vitalício", inline: true },
            {
              name: "📊 Performance Recente",
              value: `⭐ **${avg}** (Média Geral)\n🏆 **${merc.contracts}** Missões Cumpridas`,
              inline: false,
            },
          )
          .setColor(clanTag.includes("Hawk") ? "#8A2BE2" : "#FF4500") // Purple or Orange
          .setThumbnail(guildMember.user.displayAvatarURL())
          .setImage(
            "https://media1.tenor.com/m/X9k0k2mF0IUAAAAC/breaking-news.gif",
          )
          .setFooter({
            text: "BlueZone Official Press • Cobertura 24h",
            iconURL: "https://i.imgur.com/AfFp7pu.png",
          })
          .setTimestamp();

        await transferChannel.send({
          content: `🚨 **ATENÇÃO:** Nova movimentação no mercado!`,
          embeds: [announcementEmbed],
        });
      }
    }
  }

  private static getRandomQuote(): string {
    const quotes = [
      "Prometo dar muita bala e honrar o manto!",
      "O lobby vai ficar pequeno agora.",
      "Cheguei para somar e dominar.",
      "A caça começou. Ninguém escapa.",
      "Mira afiada e mente focada. Vamos pra cima!",
      "Mais um para a tropa de elite.",
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
}
