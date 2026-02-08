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
  MessageFlags,
} from "discord.js";
import { db } from "../../core/DatabaseManager";
import logger from "../../core/logger";
import { LogManager, LogType, LogLevel } from "../logger/LogManager";

export class MercenaryManager {
  static async getMercenary(userId: string) {
    // Ensure User exists (Write with lock)
    await db.write(async (prisma) => {
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, username: "Unknown" },
      });
    });

    const profile = await db.write(async (prisma) => {
      return await prisma.mercenaryProfile.upsert({
        where: { userId },
        include: { history: true },
        update: {},
        create: {
          userId,
          contracts: 0,
          repComms: 0,
          repGunplay: 0,
          repSense: 0,
          repSynergy: 0,
          repCount: 0,
        },
      });
    });
    return {
      userId: profile.userId,
      contracts: profile.contracts,
      reputation: {
        comms: profile.repComms,
        gunplay: profile.repGunplay,
        sense: profile.repSense,
        synergy: profile.repSynergy,
        count: profile.repCount,
      },
      history: profile.history.map(
        (h: { date: Date; clanName: string; feedback: string | null }) => ({
          date: h.date.toLocaleDateString("pt-BR"),
          clan: h.clanName,
          feedback: h.feedback,
        }),
      ),
    };
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
    const merc = await this.getMercenary(interaction.user.id);
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
    const clanHistory = merc.history.filter((h: { clan: string }) =>
      h.clan.includes(clanName),
    ).length;

    // Get Last Feedback
    const lastFeedbackEntry = [...merc.history]
      .reverse()
      .find((h: { feedback?: string | null }) => h.feedback);
    const lastFeedback = lastFeedbackEntry
      ? `*"${lastFeedbackEntry.feedback}"*`
      : "*Nenhum feedback registrado.*";

    // 2. Find Dossier Channel
    let dossierChannelName = "";
    const cleanTarget = targetClan
      .toLowerCase()
      .replace(/-/g, "")
      .replace(/\s/g, ""); // hawkesports

    let categoryName = "";
    if (cleanTarget.includes("hawk")) categoryName = "🦅 | QG HAWK ESPORTS";
    else if (cleanTarget.includes("mira")) categoryName = "🎯 | QG MIRA RUIM";

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
      dossierChannel = category.children.cache.find(
        (c) => c.name === "📄-dossies-operacionais",
      ) as TextChannel;

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
              },
            ],
          });
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
    await interaction.deferReply({ flags: 64 });

    const parts = interaction.customId.split("_");
    const userId = parts[2];
    const clanTag = parts[3];

    const member = await interaction.guild?.members.fetch(userId);
    if (!member) {
      await interaction.editReply({
        content: "❌ Usuário não encontrado no servidor.",
      });
      return;
    }

    const channelName = `🤝-negociacao-${member.displayName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;

    const cleanHawk = "hawkesports";
    const cleanMira = "miraruim";

    const category = interaction.guild?.channels.cache.find((c) => {
      if (c.type !== 4) return false;
      const cleanName = c.name.replace(/[^a-zA-Z]/g, "").toLowerCase();

      if (clanTag.includes("Hawk") && cleanName.includes(cleanHawk))
        return true;
      if (clanTag.includes("Mira") && cleanName.includes(cleanMira))
        return true;
      return false;
    }) as CategoryChannel;

    if (!category) {
      await interaction.editReply({
        content: "❌ Erro: Categoria do Clã não encontrada.",
      });
      return;
    }

    const tempChannel = await interaction.guild?.channels.create({
      name: channelName,
      type: 0,
      parent: category.id,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
          ],
        },
        {
          id: member.id,
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

    await interaction.editReply({
      content: `✅ **Negociação Aberta!** Acesse a sala: ${tempChannel}`,
    });

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
    await interaction.deferUpdate();

    const parts = interaction.customId.split("_");
    const mercId = parts[2];
    const clanTag = parts[3];

    const message = interaction.message;
    const embed = EmbedBuilder.from(message.embeds[0]);

    const isLeader = interaction.user.id !== mercId;
    const isMerc = interaction.user.id === mercId;

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

    if (leaderStatus.includes("✅") && mercStatus.includes("✅")) {
      embed.setDescription(
        `**STATUS DO ACORDO:**\n🟢 **CONFIRMADO!** Acesso sendo liberado...`,
      );
      embed.setColor("#00FF00");
      await interaction.editReply({ embeds: [embed], components: [] });

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
      if (member) {
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

        if (voiceChannel) {
          await voiceChannel.setUserLimit(6);
          await voiceChannel.permissionOverwrites.edit(member.id, {
            Connect: true,
            Speak: true,
            ViewChannel: true,
          });
        }

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

      // Update DB History
      try {
        await db.write(async (prisma) => {
          await prisma.mercenaryProfile.update({
            where: { userId },
            data: { contracts: { increment: 1 } },
          });

          await prisma.mercenaryContract.create({
            data: {
              mercenaryId: userId,
              clanName: clanTag,
              date: new Date(),
            },
          });
        });
      } catch (err) {
        logger.error(err, "Failed to save mercenary history to DB");
      }

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
        }
      }, 10000);

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
        await leaderChannel.send({
          content: endContent,
          components: [endRow],
        });
      } else {
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
      } catch (e) {
        // Ignore DM error
      }
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
    await interaction.deferUpdate();

    const parts = interaction.customId.split("_");
    const userId = parts[2];
    const clanTag = parts[3];

    const member = await interaction.guild?.members.fetch(userId);

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
        // Ignore DM error
      }
    }

    await interaction.reply({
      content: "✅ **Combatente Dispensado.** O painel será fechado.",
      flags: 64,
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("disabled_dismiss")
        .setLabel("Combatente Dispensado")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );

    await interaction.message.edit({ components: [row] });

    setTimeout(async () => {
      try {
        await interaction.message.delete();
      } catch (e) {
        // Ignore delete error
      }
    }, 5000);
  }

  static async handleEvaluationModalOpen(interaction: ButtonInteraction) {
    const userId = interaction.customId.split("_")[3];

    const modal = new ModalBuilder()
      .setCustomId(`merc_eval_submit_${userId}`)
      .setTitle("Avaliação de Combatente");

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

    if ([comms, gunplay, sense, synergy].some((v) => v < 0 || v > 5)) {
      await interaction.reply({
        content: "❌ As notas devem ser entre 0 e 5.",
        flags: 64,
      });
      return;
    }

    // Update DB
    const merc = await this.getMercenary(userId);
    const n = merc.reputation.count;

    const newComms = (merc.reputation.comms * n + comms) / (n + 1);
    const newGunplay = (merc.reputation.gunplay * n + gunplay) / (n + 1);
    const newSense = (merc.reputation.sense * n + sense) / (n + 1);
    const newSynergy = (merc.reputation.synergy * n + synergy) / (n + 1);

    await db.write(async (prisma) => {
      await prisma.mercenaryProfile.update({
        where: { userId },
        data: {
          repComms: newComms,
          repGunplay: newGunplay,
          repSense: newSense,
          repSynergy: newSynergy,
          repCount: { increment: 1 },
        },
      });
    });

    // Update last contract feedback
    await db.write(async (prisma) => {
      const lastContract = await prisma.mercenaryContract.findFirst({
        where: { mercenaryId: userId },
        orderBy: { date: "desc" },
      });

      if (lastContract && feedback) {
        await prisma.mercenaryContract.update({
          where: { id: lastContract.id },
          data: { feedback },
        });
      }
    });

    const avg = ((comms + gunplay + sense + synergy) / 4).toFixed(1);

    await interaction.reply({
      content: `✅ **Avaliação Registrada!**\nMédia da Partida: ⭐ **${avg}**\n\n*Feedback salvo no dossiê.*`,
      flags: 64,
    });

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
    const clanTag = parts[3];

    const member = await interaction.guild?.members.fetch(userId);
    if (!member) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle(`🦅 PROPOSTA DE CONTRATO OFICIAL: ${clanTag}`)
        .setDescription(
          `Olá **${member.displayName}**,\n\nA liderança da **${clanTag}** ficou impressionada com seu desempenho e gostaria de oficializar sua entrada no time principal.\n\nAo aceitar, você deixará de ser Mercenário e se tornará um Membro Oficial, com acesso total ao QG.\n\n**O que você decide?**`,
        )
        .setColor("#FFD700")
        .setThumbnail("https://cdn-icons-png.flaticon.com/512/1041/1041888.png")
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

      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("disabled_hire")
          .setLabel("Proposta Enviada")
          .setStyle(ButtonStyle.Success)
          .setDisabled(true),
      );
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

    const guild = interaction.client.guilds.cache.first();
    if (!guild) return;

    const guildMember = await guild.members.fetch(interaction.user.id);
    if (!guildMember) return;

    if (action === "decline") {
      await interaction.editReply({
        content: "❌ **Proposta Recusada.** A liderança será notificada.",
        components: [],
      });
      return;
    }

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

      const merc = await this.getMercenary(interaction.user.id);
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
          .setColor(clanTag.includes("Hawk") ? "#8A2BE2" : "#FF4500")
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
