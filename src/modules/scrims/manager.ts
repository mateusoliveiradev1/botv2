import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  TextChannel,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
} from "discord.js";
import { LogManager, LogType, LogLevel } from "../logger/LogManager";

export class ScrimManager {
  static async showScheduler(interaction: ButtonInteraction) {
    // 1. Infer Target Clan from Channel
    const channel = interaction.channel as TextChannel;
    let defaultTarget;

    if (channel.name.includes("hawk")) defaultTarget = "Hawk Esports";
    else if (channel.name.includes("mira")) defaultTarget = "Mira Ruim";
    else defaultTarget = "Ambos"; // Fallback

    const modal = new ModalBuilder()
      .setCustomId(`scrim_schedule_modal_${defaultTarget}`) // Pass target in ID to retrieve later
      .setTitle(`📅 Agendar Treino (${defaultTarget})`);

    const dateInput = new TextInputBuilder()
      .setCustomId("scrim_date")
      .setLabel("Data do Evento")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("DD/MM/AAAA (Ex: 25/10/2026)")
      .setRequired(true)
      .setMaxLength(10);

    const timeInput = new TextInputBuilder()
      .setCustomId("scrim_time")
      .setLabel("Horário de Início (Brasília)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("HH:MM (Ex: 20:00)")
      .setRequired(true)
      .setMaxLength(5);

    const typeInput = new TextInputBuilder()
      .setCustomId("scrim_type")
      .setLabel("Tipo de Evento")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Ex: Treino, Camp, 4x4, Mix")
      .setRequired(true);

    const obsInput = new TextInputBuilder()
      .setCustomId("scrim_obs")
      .setLabel("Observações / Modo")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Ex: Mapas: E/M/E/M | Senha no PV | FPP Squad")
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(dateInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(typeInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(obsInput),
    );

    await interaction.showModal(modal);
  }

  static async syncLineUp(
    guild: any,
    target: string,
    sourceEmbed: EmbedBuilder,
  ) {
    // Map target to channel name
    let channelName = "";
    if (target.includes("Hawk")) channelName = "📝-line-up-hawk";
    else if (target.includes("Mira")) channelName = "📝-line-up-mira-ruim";
    else return; // "Ambos" not supported for single lineup or handles both manually? Let's skip 'Ambos' complex logic for now or handle per-loop.

    const channel = guild.channels.cache.find(
      (c: any) => c.name === channelName,
    ) as TextChannel;
    if (!channel) return;

    // Create a cleaner version of the embed for the dashboard
    const dashboardEmbed = new EmbedBuilder()
      .setTitle(sourceEmbed.data.title || "Status de Operação")
      .setDescription(sourceEmbed.data.description || "")
      .setColor(sourceEmbed.data.color || null)
      .setThumbnail(sourceEmbed.data.thumbnail?.url || null)
      .setImage(
        "https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg",
      )
      .setFooter({ text: "🔄 Sincronizado automaticamente com a Agenda" })
      .setTimestamp();

    // Copy fields but maybe rearrange if needed? For now, 1:1 copy is fine as the source is already good.
    if (sourceEmbed.data.fields) {
      dashboardEmbed.setFields(sourceEmbed.data.fields);
    }

    // Upsert logic: Check if the last message is ours and matches this event?
    // For simplicity, we can just delete last and send new, or edit if exists.
    // Let's try to find a message with the same TITLE.
    const messages = await channel.messages.fetch({ limit: 5 });
    const existingMsg = messages.find(
      (m) =>
        m.embeds[0]?.title === sourceEmbed.data.title &&
        m.author.id === guild.client.user.id,
    );

    if (existingMsg) {
      await existingMsg.edit({ embeds: [dashboardEmbed] });
    } else {
      // Maybe clear old unrelated messages?
      // await channel.bulkDelete(5).catch(() => {});
      // Keep history? User said "automatico", implies current state.
      // Let's clear to keep it as a "Dashboard"
      await channel.bulkDelete(10).catch(() => {});
      await channel.send({ embeds: [dashboardEmbed] });
    }
  }

  static async createEvent(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: 64 }); // Defer to prevent timeout (Unknown Interaction)

    // Retrieve Target from Custom ID
    const target = interaction.customId.split("_")[3] || "Ambos"; // scrim_schedule_modal_TARGET

    const date = interaction.fields.getTextInputValue("scrim_date");
    const time = interaction.fields.getTextInputValue("scrim_time");
    const type = interaction.fields.getTextInputValue("scrim_type");
    const obs = interaction.fields.getTextInputValue("scrim_obs");

    const channels: TextChannel[] = [];
    let roleMention = "";

    // Calculate Deadline (1 Hour Before)
    let deadlineText = "1 hora antes do início";
    let timestampText = "";
    try {
      const [day, month, year] = date.split("/").map(Number);
      const [hour, minute] = time.split(":").map(Number);

      // Handle year if provided or default to current
      const finalYear = year || new Date().getFullYear();

      // CORREÇÃO DE FUSO HORÁRIO (Brasília UTC-3)
      // O servidor roda em UTC. Se o usuário digita 20:00 (BRT), isso equivale a 23:00 UTC.
      // Precisamos somar 3 horas para que o objeto Date reflita o momento correto globalmente.
      // O Date.UTC lida automaticamente com virada de dia/mês/ano (ex: 22h + 3h = 01h do dia seguinte).
      const scrimDate = new Date(Date.UTC(finalYear, month - 1, day, hour + 3, minute));

      const deadlineDate = new Date(scrimDate);
      deadlineDate.setHours(deadlineDate.getHours() - 1);

      deadlineText = `${deadlineDate.getHours().toString().padStart(2, "0")}:${deadlineDate.getMinutes().toString().padStart(2, "0")}`;

      // Discord Timestamp Format: <t:UNIX:R> (Relative time)
      const unixTime = Math.floor(scrimDate.getTime() / 1000);
      timestampText = ` <t:${unixTime}:R>`;

      // Create Scheduled Event
      const endDate = new Date(scrimDate);
      endDate.setHours(endDate.getHours() + 3);

      const locationText = target.includes("Hawk")
        ? "QG Hawk Esports (Voz)"
        : target.includes("Mira")
          ? "QG Mira Ruim (Voz)"
          : "Canais de Voz";

      try {
        await interaction.guild?.scheduledEvents.create({
          name: `[Scrim] ${type}`,
          scheduledStartTime: scrimDate,
          scheduledEndTime: endDate,
          privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
          entityType: GuildScheduledEventEntityType.External,
          entityMetadata: { location: locationText },
          description: obs.substring(0, 1000), // Max 1000 chars
          image: "https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg", // Capa Oficial PUBG
        });
      } catch (e) {
        console.error("Failed to create Scheduled Event:", e);
      }
    } catch (e) {
      // Ignore date parsing error
    }

    // Determinar canais e menções com base no Target inferido
    if (target.includes("Hawk") || target === "Ambos") {
      const c = interaction.guild?.channels.cache.find(
        (c) => c.name === "📅-agenda-hawk",
      ) as TextChannel;
      if (c) channels.push(c);
      const role = interaction.guild?.roles.cache.find(
        (r) => r.name === "🦅 Hawk Esports",
      );
      if (role) roleMention += `${role} `;
    }
    if (target.includes("Mira") || target === "Ambos") {
      const c = interaction.guild?.channels.cache.find(
        (c) => c.name === "📅-agenda-mira",
      ) as TextChannel;
      if (c) channels.push(c);
      const role = interaction.guild?.roles.cache.find(
        (r) => r.name === "🎯 Mira Ruim",
      );
      if (role) roleMention += `${role} `;
    }

    if (channels.length === 0) {
      // Log Event Creation
    await LogManager.log({
      guild: interaction.guild!,
      type: LogType.SYSTEM,
      level: LogLevel.INFO,
      title: "📅 Novo Treino Agendado",
      description: `Operação agendada no QG ${target}.`,
      executor: interaction.user,
      fields: [
          { name: "Tipo", value: type, inline: true },
          { name: "Data/Hora", value: `${date} - ${time}`, inline: true },
          { name: "Obs", value: obs, inline: false }
      ]
    });

    await interaction.editReply({
        content: "❌ Erro: Nenhum canal de agenda encontrado.",
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📅 AGENDA DE OPERAÇÃO: ${type.toUpperCase()}`)
      .setDescription(
        `**Organizador:** ${interaction.user}\n\n⚠️ **ATENÇÃO:** O check-in é obrigatório. O não comparecimento sem aviso prévio resultará em sanções administrativas.`,
      )
      .setColor("#00FF00") // Green for Active
      .setThumbnail("https://cdn-icons-png.flaticon.com/512/2693/2693507.png") // Calendar Icon
      .addFields(
        { name: "🗓️ Data Operacional", value: `**${date}**`, inline: true },
        {
          name: "⏰ Horário de Início",
          value: `**${time}** (Brasília)\n${timestampText}`,
          inline: true,
        },
        {
          name: "⛔ Deadline (Saída)",
          value: `**${deadlineText}** (Limite Check-out)`,
          inline: true,
        },
        { name: "📝 Briefing / Informações", value: `*${obs}*`, inline: false },
        {
          name: "✅ TITULARES (Squad Alpha) [0/4]",
          value: "*Aguardando confirmações...*",
          inline: false,
        },
        {
          name: "🔄 RESERVAS (Banco)",
          value: "*Nenhum reserva*",
          inline: false,
        },
        {
          name: "❌ BAIXAS (Ausentes)",
          value: "*Nenhuma baixa reportada*",
          inline: false,
        },
      )
      .setFooter({
        text: `Sistema de Gestão de Scrims • Check-out permitido até ${deadlineText}`,
      })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("scrim_join")
        .setLabel("Check-in")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅"),
      new ButtonBuilder()
        .setCustomId("scrim_leave")
        .setLabel("Check-out")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("✖️"),
    );

    // Add SOS Button if less than 4 players (handled in interaction, but we can add the button statically here and disable/enable or just leave enabled)
    // Let's add it always, but it will only work if slots are open. Or we can hide it?
    // Better to have it always visible so leaders know it exists.
    // But maybe only visible to leaders? We can't do that with buttons on a public message easily.
    // We will add it as a Secondary button.
    // NOTE: The "Candidatar-se" button here in the MAIN agenda is optional if we rely on SOS.
    // But the user asked for "click here to present yourself".
    // If we want it in the main embed too, we need to pass the target in the ID.
    // Since we are inside a loop that knows the channel, let's infer target from channel name in the loop?
    // No, createEvent builds one row for all.
    // Let's use a generic ID 'scrim_apply_merc_GENERIC' and handle it by checking channel name in interactionCreate/MercenaryManager.
    // OR better: Just rely on SOS button logic which is specific.
    // But let's keep the button here too, but without specific target ID, and let the handler infer from channel.

    row.addComponents(
      new ButtonBuilder()
        .setCustomId("scrim_sos")
        .setLabel("🆘 Solicitar Complete")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("📢"),
      // Removed 'scrim_apply_merc' from here because it's confusing if the user is not a mercenary yet.
      // The SOS flow is better: Leader clicks SOS -> Message in Mercenary Channel -> Mercenary clicks Apply there.
      // This keeps the Agenda clean for members.
    );

    for (const channel of channels) {
      const msg = await channel.send({
        content: `🔔 **ATENÇÃO COMBATENTES!**\n${roleMention}`,
        embeds: [embed],
        components: [row],
      });

      // Generate Link to this message
      const messageLink = `https://discord.com/channels/${interaction.guildId}/${channel.id}/${msg.id}`;

      // SITREP Announcement (Only once per event creation logic, or per channel? Logic implies one event per target)
      // If target is "Ambos", we might spam Sitrep. Let's send one generic or specific.
      // Better: Send one SITREP with links if multiple, or just one if single.
      // For simplicity, we send one SITREP per channel created (Hawk/Mira).

      const sitrepChannel = interaction.guild?.channels.cache.find(
        (c) => c.name === "📢-sitrep",
      ) as TextChannel;
      if (sitrepChannel) {
        const sitrepEmbed = new EmbedBuilder()
          .setTitle(`📢 NOVA OPERAÇÃO: ${type.toUpperCase()}`)
          .setDescription(
            `Um novo evento foi agendado no QG **${target}**.\n\n🗓️ **Data:** ${date} às ${time}\n📍 **Local:** ${channel}\n\n⚠️ **AÇÃO NECESSÁRIA:**\nTodos os combatentes devem confirmar presença imediatamente.`,
          )
          .setColor("#FFD700") // Gold
          .setThumbnail(interaction.guild?.iconURL() || null)
          .addFields({
            name: "🔗 Acesso Rápido",
            value: `📍 Canal: ${channel}\n🚀 [Ir direto para a mensagem](${messageLink})`,
            inline: false,
          })
          .setFooter({ text: `Comando Central • ${interaction.user.username}` })
          .setTimestamp();

        await sitrepChannel.send({ content: "@here", embeds: [sitrepEmbed] });
      }

      // Sync to Line-Up Channel
      if (target !== "Ambos") {
        await ScrimManager.syncLineUp(interaction.guild, target, embed);
      } else {
        // If "Ambos", we need to sync to BOTH.
        // Channel iteration logic above handles sending to multiple agenda channels.
        // We should sync to the specific clan line-up based on the channel name loop?
        // Actually, "Ambos" target creates one embed.
        // Let's just sync to both for safety if target is "Ambos"
        if (channel.name.includes("hawk"))
          await ScrimManager.syncLineUp(
            interaction.guild,
            "Hawk Esports",
            embed,
          );
        if (channel.name.includes("mira"))
          await ScrimManager.syncLineUp(interaction.guild, "Mira Ruim", embed);
      }
    }

    await interaction.editReply({
      content: `✅ **Evento Criado!** Verifique o canal de agenda e o SITREP.`,
    });
  }

  static async handleSOS(interaction: ButtonInteraction) {
    const embed = interaction.message.embeds[0];
    const titularesField = embed.fields[4];
    const cleanList = (text: string) =>
      text
        .replace("*Aguardando confirmações...*", "")
        .split("\n")
        .filter((s) => s.trim().length > 0);
    const titulares = cleanList(titularesField.value);

    if (titulares.length >= 4) {
      await interaction.reply({
        content:
          "🚫 **Squad Completo!** Não é possível solicitar reforços quando o time já está cheio.",
        flags: 64,
      });
      return;
    }

    const missing = 4 - titulares.length;
    const time = embed.fields[1].value; // "**20:00** (Brasília)"
    const cleanTime = time.replace(/\*\*/g, "").split(" ")[0]; // "20:00"

    // Find Mercenary Channel
    const mercChannel = interaction.guild?.channels.cache.find(
      (c) => c.name === "🆘-complete-de-time",
    ) as TextChannel;
    const mercRole = interaction.guild?.roles.cache.find(
      (r) => r.name === "⛑️ Mercenário",
    );

    if (!mercChannel || !mercRole) {
      await interaction.reply({
        content: "❌ Canal ou Cargo de Mercenários não configurado.",
        flags: 64,
      });
      return;
    }

    const messageLink = `https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${interaction.message.id}`;

    // Determine Clan Name from Embed Title or Channel
    let clanName = "O Clã";
    if (
      interaction.channel &&
      (interaction.channel as TextChannel).name.includes("hawk")
    )
      clanName = "🦅 Hawk Esports";
    if (
      interaction.channel &&
      (interaction.channel as TextChannel).name.includes("mira")
    )
      clanName = "🎯 Mira Ruim";

    const sosEmbed = new EmbedBuilder()
      .setTitle("🚨 SOLICITAÇÃO DE REFORÇO IMEDIATO")
      .setDescription(
        `**${clanName}** precisa de **${missing} Combatente(s)** para missão às **${cleanTime}**!`,
      )
      .setColor("#FF4500") // Orange Red
      .addFields({
        name: "🔗 Link da Missão",
        value: `📍 Canal: ${interaction.channel}\n🚀 [Clique aqui para se apresentar](${messageLink})`,
        inline: false,
      })
      .setFooter({ text: `Solicitado por ${interaction.user.username}` })
      .setTimestamp();

    // 2. Add Candidate Button
    // We need a button that allows the user to apply for this specific mission directly from the SOS channel.
    // The ID should contain the target clan.
    let targetClan = "Unknown";
    if (clanName.includes("Hawk")) targetClan = "Hawk-Esports";
    if (clanName.includes("Mira")) targetClan = "Mira-Ruim";

    const sosRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`scrim_apply_merc_${targetClan}_${interaction.message.id}`)
        .setLabel("🙋‍♂️ Candidatar-se Agora")
        .setStyle(ButtonStyle.Success),
    );

    // Log SOS
    await LogManager.log({
      guild: interaction.guild!,
      type: LogType.SYSTEM, // Corrected from WARN to SYSTEM
      level: LogLevel.WARN,
      title: "🚨 SOS Disparado",
      description: `Pedido de reforço imediato.`,
      executor: interaction.user,
      fields: [
          { name: "Clã", value: clanName, inline: true },
          { name: "Vagas", value: `${missing}`, inline: true }
      ]
    });

    await mercChannel.send({
      content: `${mercRole} 🆘`,
      embeds: [sosEmbed],
      components: [sosRow],
    });

    await interaction.reply({
      content: `✅ **SOS Enviado!** O alerta foi disparado para os Mercenários disponíveis.`,
      flags: 64,
    });
  }

  static async handlePresence(interaction: ButtonInteraction) {
    const action = interaction.customId === "scrim_join" ? "join" : "leave";
    const userTag =
      interaction.member instanceof Object &&
      "displayName" in interaction.member
        ? interaction.member.displayName
        : interaction.user.username;

    const embed = interaction.message.embeds[0];
    // Parse current lists
    // 0: Data, 1: Time, 2: Deadline, 3: Info, 4: Titulares, 5: Reservas, 6: Baixas
    const titularesField = embed.fields[4];
    const reservasField = embed.fields[5];
    const baixasField = embed.fields[6];

    const cleanList = (text: string) =>
      text
        .replace("*Aguardando confirmações...*", "")
        .replace("*Nenhum reserva*", "")
        .replace("*Nenhuma baixa reportada*", "")
        .split("\n")
        .filter((s) => s.trim().length > 0);

    let titulares = cleanList(titularesField.value);
    let reservas = cleanList(reservasField.value);
    let baixas = cleanList(baixasField.value);

    // Check Time Restriction for Leaving Titulares
    if (action === "leave") {
      const isTitular = titulares.some((s) => s.includes(userTag));
      if (isTitular) {
        try {
          const dateStr = embed.fields[0].value.replace(/\*\*/g, "");
          const timeStr = embed.fields[1].value.replace(/\*\*/g, "").split(" ")[0];

          const [day, month] = dateStr.split("/").map(Number);
          const [hour, minute] = timeStr.split(":").map(Number);

          const currentYear = new Date().getFullYear();
          const scrimDate = new Date(currentYear, month - 1, day, hour, minute);

          // Deadline is 1 hour before scrim
          const deadline = new Date(scrimDate);
          deadline.setHours(deadline.getHours() - 1);

          const now = new Date();

          // Compare timestamps
          if (now > deadline) {
            await interaction.reply({
              content: `🚫 **Check-out Bloqueado!**\nVocê só pode sair da lista de titulares até 1 hora antes do treino.\n**Deadline:** ${deadline.getHours().toString().padStart(2, "0")}:${deadline.getMinutes().toString().padStart(2, "0")}\n\n*Contate o Capitão ou IGL se for uma emergência.*`,
              flags: 64,
            });
            return;
          }
        } catch (e) {
          // Ignore parsing errors, allow action if date is weird
        }
      }
    }

    // Remove user from all lists
    titulares = titulares.filter((s) => !s.includes(userTag));
    reservas = reservas.filter((s) => !s.includes(userTag));
    baixas = baixas.filter((s) => !s.includes(userTag));

    // Log Presence Change
    // Only log joins/leaves if we want deep tracking. For "Perfect" logs, yes.
    // But avoid spamming the log channel?
    // Let's log only LEAVES within deadline or important actions.
    // Or log everything as INFO.
    await LogManager.log({
      guild: interaction.guild!,
      type: LogType.MEMBER,
      level: action === "join" ? LogLevel.INFO : LogLevel.WARN,
      title: action === "join" ? "✅ Check-in Realizado" : "❌ Check-out Realizado",
      description: `Alteração na lista de presença.`,
      executor: interaction.user, // The user who clicked (or member if interaction.member is used)
      fields: [
          { name: "Operador", value: userTag, inline: true },
          { name: "Status", value: action === "join" ? "Confirmado" : "Saiu", inline: true }
      ]
    });

    if (action === "join") {
      // Check limits
      if (titulares.length < 4) {
        titulares.push(`• ${userTag}`);
      } else {
        reservas.push(`• ${userTag}`);
      }
    } else {
      baixas.push(`• ${userTag}`);
    }

    const newEmbed = EmbedBuilder.from(embed);
    const fields = newEmbed.data.fields!;

    fields[4].name = `✅ TITULARES (Check-in) [${titulares.length}/4]`;
    fields[4].value =
      titulares.length > 0
        ? titulares.join("\n")
        : "*Aguardando confirmações...*";

    fields[5].value =
      reservas.length > 0 ? reservas.join("\n") : "*Nenhum reserva*";

    fields[6].value =
      baixas.length > 0 ? baixas.join("\n") : "*Nenhuma baixa reportada*";

    newEmbed.setFields(fields);

    await interaction.update({ embeds: [newEmbed] });

    // Sync to Line-Up Channel
    // We need to infer target from the channel name this message is in
    const channel = interaction.channel as TextChannel;
    let target = "";
    if (channel.name.includes("hawk")) target = "Hawk Esports";
    else if (channel.name.includes("mira")) target = "Mira Ruim";

    if (target) {
      await ScrimManager.syncLineUp(interaction.guild, target, newEmbed);
    }
  }
}
