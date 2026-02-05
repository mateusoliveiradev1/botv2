import {
  Guild,
  Role,
  ChannelType,
  PermissionFlagsBits,
  CategoryChannel,
  TextChannel,
  EmbedBuilder,
  Colors,
} from "discord.js";
import { ROLES, CHANNELS } from "./constants";
import logger from "../../core/logger";
import { EmbedFactory } from "../../utils/embeds";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from "discord.js";
import { MissionManager } from "../missions/manager";

export class SetupManager {
  constructor(private guild: Guild) {}

  async run() {
    logger.info(`🏗️ Starting Setup for guild: ${this.guild.name}`);

    // 1. Roles
    const rolesMap = await this.createRoles();

    // 2. Channels & Categories
    await this.createChannels(rolesMap);

    // 3. Create Ranking System (Prioridade Alta - Logo após canais base)
    try {
      await this.createRankingSystem();
    } catch (error) {
      logger.error(error, "Error creating ranking system:");
    }

    // 4. Seed Content (Send Messages)
    try {
      await this.seedContent(rolesMap);
    } catch (error) {
      logger.error(error, "Error seeding content:");
    }

    // 5. Setup Achievements Webhook
    try {
      await this.setupAchievementsWebhook();
    } catch (error) {
      logger.error(error, "Error setting up achievements webhook:");
    }

    // 6. Setup Arsenal (New)
    try {
      await this.setupArsenalChannel();
    } catch (error) {
      logger.error(error, "Error setting up arsenal channel:");
    }

    // 7. Setup Missions
    try {
      await MissionManager.updateChannelBoard();
    } catch (error) {
      logger.error(error, "Error seeding missions channel:");
    }

    // 7. Voice Generator
    try {
      await this.createVoiceGenerator();
    } catch (error) {
      logger.error(error, "Error creating voice generator:");
    }

    logger.info("✅ Setup Completed!");
  }

  private async createVoiceGenerator() {
    // Find or Create Category (Updated Name)
    const categoryName = "🔊 | FREQUÊNCIA DE RÁDIO";
    let category = this.guild.channels.cache.find(
      (c) => c.name === categoryName && c.type === ChannelType.GuildCategory,
    ) as CategoryChannel;

    if (!category) {
      // Fallback to old name search just in case
      const oldCat = this.guild.channels.cache.find(
        (c) =>
          c.name === "🔊 CANAIS DE VOZ" && c.type === ChannelType.GuildCategory,
      ) as CategoryChannel;
      if (oldCat) {
        await oldCat.setName(categoryName);
        category = oldCat;
      } else {
        // Will be created by createChannels loop, but just in case
        return;
      }
    }

    // Trigger Channel
    const triggerName = "➕ Criar Sala";
    let channel = this.guild.channels.cache.find(
      (c) => c.name === triggerName && c.parentId === category.id,
    );

    if (!channel) {
      await this.guild.channels.create({
        name: triggerName,
        type: ChannelType.GuildVoice,
        parent: category.id,
        userLimit: 1, // Prevent people from staying there
      });
      logger.info("Created Voice Generator Trigger");
    }
  }

  private async setupArsenalChannel() {
    const channel = this.findChannel("🔫-arsenal");
    if (!channel) return;

    // Lock Channel
    await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
      SendMessages: false,
    });
    logger.info("🔒 Locked channel: 🔫-arsenal");

    // Force Clear
    await channel.bulkDelete(10).catch(() => {});

    // --- 1. CLASSES (Roles Táticas) ---
    const embedClasses = new EmbedBuilder()
      .setTitle("🛡️ ESPECIALIZAÇÃO TÁTICA")
      .setDescription(
        "Selecione sua função principal no Squad.\n*Você pode escolher múltiplas funções.*",
      )
      .setColor("#0099FF")
      .addFields(
        { name: "🎯 Sniper", value: "Tirador de longa distância.", inline: true },
        { name: "🔫 Fragger", value: "Linha de frente e combate.", inline: true },
        { name: "🧠 IGL", value: "Líder e estrategista.", inline: true },
        { name: "💊 Support", value: "Médico e utilitários.", inline: true },
        { name: "🏎️ Driver", value: "Piloto de fuga e rotação.", inline: true },
      );

    const rowClasses1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("role_Sniper").setLabel("🎯 Sniper").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("role_Fragger").setLabel("🔫 Fragger").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("role_IGL").setLabel("🧠 IGL").setStyle(ButtonStyle.Secondary),
    );
    const rowClasses2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("role_Support").setLabel("💊 Support").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("role_Driver").setLabel("🏎️ Driver").setStyle(ButtonStyle.Secondary),
    );

    await channel.send({ embeds: [embedClasses], components: [rowClasses1, rowClasses2] });

    // --- 2. WEAPONS (Loadout Favorito) ---
    const embedWeapons = new EmbedBuilder()
      .setTitle("🎒 ARMAMENTO PREFERIDO")
      .setDescription(
        "Qual seu equipamento de confiança? Personalize seu perfil.",
      )
      .setColor("#F2A900") // Gold
      .setFooter({ text: "Clique para Equipar/Desequipar" });

    // Dividir armas em linhas para não estourar limite (5 por linha)
    // WEAPONS: ['🏁 M416', '🔥 Beryl M762', '🌪️ AUG', '☠️ Kar98k', '⚡ Mini14', '🍳 Pan']
    
    const rowWeapons1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("role_M416").setLabel("🏁 M416").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("role_Beryl M762").setLabel("🔥 Beryl").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("role_AUG").setLabel("🌪️ AUG").setStyle(ButtonStyle.Secondary),
    );

    const rowWeapons2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("role_Kar98k").setLabel("☠️ Kar98k").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("role_Mini14").setLabel("⚡ Mini14").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("role_Pan").setLabel("🍳 Pan").setStyle(ButtonStyle.Secondary),
    );

    await channel.send({ embeds: [embedWeapons], components: [rowWeapons1, rowWeapons2] });
    logger.info("✅ Arsenal Channel Setup Completed");
  }

  private async setupAchievementsWebhook() {
    const channel = this.findChannel("🏅-conquistas");
    if (!channel) return;

    // Lock Channel (Read-Only)
    await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
      SendMessages: false,
    });
    logger.info("🔒 Locked channel: 🏅-conquistas");

    // Create Webhook
    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find((w) => w.name === "Achievements Feed");

    if (!webhook) {
      webhook = await channel.createWebhook({
        name: "Achievements Feed",
        avatar: "https://cdn-icons-png.flaticon.com/512/3112/3112946.png", // Trophy Icon
      });
      logger.info("Created Webhook: Achievements Feed");
    }

    logger.warn(
      `\n🔗 [IMPORTANT] Configure this Webhook in Lovable:\n${webhook.url}\nEvents to enable: level_up, prestige_level_up, patamar_promotion, achievement_unlocked, training_achievement_unlocked, performance_achievement_unlocked\n`,
    );
  }

  private async createRankingSystem() {
    logger.info("📊 Initializing Ranking System Webhooks...");

    // 2. Ranking Channels & Webhooks (Now using channels created by createChannels)
    const rankingChannels = [
      { name: "📅-ranking-semanal", ranking_type: "weekly" },
      { name: "📆-ranking-mensal", ranking_type: "monthly" },
      { name: "🏆-ranking-competitivo", ranking_type: "competitive" },
      { name: "⚔️-ranking-clas", ranking_type: "clans" },
      { name: "🏛️-hall-of-fame", ranking_type: "hall_of_fame" },
    ];

    const botAvatarURL = this.guild.client.user?.displayAvatarURL();

    for (const ch of rankingChannels) {
      // Find the channel (already created by createChannels)
      let channel = this.guild.channels.cache.find(
        (c) => c.name === ch.name,
      ) as TextChannel;

      if (!channel) {
        logger.warn(`⚠️ Ranking channel ${ch.name} not found! Skipping webhook setup.`);
        continue;
      }

      // Check/Create Webhook
      const webhooks = await channel.fetchWebhooks();
      let webhook = webhooks.find(
        (w) =>
          w.name === "PUBG Tracker Rankings" || w.name === "PUBG Hall of Fame",
      );

      if (!webhook) {
        const webhookName =
          ch.name === "🏛️-hall-of-fame"
            ? "PUBG Hall of Fame"
            : "PUBG Tracker Rankings";
        const webhookAvatar =
          ch.name === "🏛️-hall-of-fame"
            ? "https://seeklogo.com/images/P/pubg-logo-FB8B0BE671-seeklogo.com.png"
            : botAvatarURL;

        webhook = await channel.createWebhook({
          name: webhookName,
          avatar: webhookAvatar,
        });
        logger.info(`Created Webhook for ${ch.name}`);
      }

      logger.warn(`🔗 WEBHOOK [${ch.name}]: ${webhook.url}`);
    }
  }

  private async createRoles() {
    const rolesMap = new Map<string, Role>();

    // Helper to create role
    const ensureRole = async (
      name: string,
      color: any,
      permissions: bigint[] = [],
      hoist = false,
    ) => {
      let role = this.guild.roles.cache.find((r) => r.name === name);
      if (!role) {
        role = await this.guild.roles.create({
          name,
          color,
          permissions: permissions.length ? permissions : undefined,
          hoist,
          reason: "BlueZone Setup",
        });
        logger.info(`Created Role: ${name}`);
      }
      rolesMap.set(name, role);
      return role;
    };

    // Staff
    for (const r of ROLES.STAFF)
      await ensureRole(r.name, r.color, r.permissions, true);
    // Elite
    for (const r of ROLES.ELITE) await ensureRole(r.name, r.color, [], true);
    // Ranks
    for (const r of ROLES.RANKS) await ensureRole(r.name, r.color);
    // Classes
    for (const name of ROLES.CLASSES) await ensureRole(name, "#FFFFFF");
    // Weapons
    for (const name of ROLES.WEAPONS) await ensureRole(name, "#99AAB5");
    // Base
    for (const r of ROLES.BASE) await ensureRole(r.name, r.color);

    return rolesMap;
  }

  private async createChannels(rolesMap: Map<string, Role>) {
    const everyone = this.guild.roles.everyone;
    const staffRole = rolesMap.get("🛡️ Task Force Officer");
    const eliteRole = rolesMap.get("🦅 Hawk Esports");
    const memberRole = rolesMap.get("🎖️ Soldado");

    for (const catConfig of CHANNELS) {
      // Create Category
      let category = this.guild.channels.cache.find(
        (c) =>
          c.name === catConfig.name && c.type === ChannelType.GuildCategory,
      ) as CategoryChannel;

      if (!category) {
        category = await this.guild.channels.create({
          name: catConfig.name,
          type: ChannelType.GuildCategory,
        });
      }

      // Permissions for Category
      if (catConfig.private) {
        const staffOnly = (catConfig as any).staff_only;

        if (staffOnly) {
             // Staff Only (Operations, Logs) - No Elite Access
             if (staffRole) {
                await category.permissionOverwrites.set([
                    { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel] }
                ]);
             }
        } else if (staffRole && eliteRole) {
             // Private (War Room) - Staff + Elite
             await category.permissionOverwrites.set([
                { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel] },
                { id: eliteRole.id, allow: [PermissionFlagsBits.ViewChannel] }
             ]);
        }
      } else if (catConfig.name.includes("AIR DROP")) {
        // Admin Area Logic handled per channel for Blackbox
      }

      // Create Children
      for (const child of catConfig.children) {
        // Tenta achar pelo nome exato OU pelo nome antigo (se estiver renomeando)
        // Isso é complexo, então vamos confiar que o usuário vai rodar o setup e ele vai criar novos se não achar
        // Para evitar duplicação, seria ideal ter um ID map, mas vamos pelo nome.

        let channel = this.guild.channels.cache.find(
          (c) => c.name === child.name && c.parentId === category.id,
        );

        if (!channel) {
          channel = await this.guild.channels.create({
            name: child.name,
            type: child.type as any,
            parent: category.id,
            userLimit: (child as any).limit,
          });
          logger.info(`Created Channel: ${child.name}`);
        }

        // Configurar Canal AFK
        if (child.name === "💤 AFK" && child.type === ChannelType.GuildVoice) {
          try {
            await this.guild.setAFKChannel(channel as any);
            await this.guild.setAFKTimeout(300); // 5 minutos
            logger.info("✅ Configured AFK Channel");
          } catch (e) {
            logger.warn("Failed to set AFK channel (Missing Permissions?)");
          }
        }

        // Specific Channel Permissions
        if (child.name.includes("caixa-preta") && staffRole && channel) {
          await (channel as TextChannel).permissionOverwrites.set([
            { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel] },
          ]);
        }

        // Read-Only Permissions (New)
        if ((child as any).read_only && channel) {
          await (channel as TextChannel).permissionOverwrites.edit(
            everyone.id,
            {
              SendMessages: false,
            },
          );
          logger.info(`🔒 Locked standard channel: ${child.name}`);
        }
      }
    }
  }

  private async seedContent(rolesMap: Map<string, Role>) {
    // 1. Rules
    const rulesChannel = this.findChannel("📜-regras");
    if (rulesChannel && rulesChannel.isTextBased()) {
      // Lock Channel
      await rulesChannel.permissionOverwrites.edit(this.guild.roles.everyone, {
        SendMessages: false,
      });

      // FORCE CLEAR for Update
      await rulesChannel.bulkDelete(10).catch(() => {});

      const embed = new EmbedBuilder()
        .setTitle("📜 PROTOCOLO DE ENGAJAMENTO")
        .setDescription(
          "Diretrizes operacionais obrigatórias para todos os agentes na BlueZone.",
        )
        .setColor("#FFD700") // Gold
        .addFields(
          {
            name: "🛑 1. CONDUTA E DISCIPLINA",
            value:
              "• Respeito absoluto entre membros e hierarquia.\n• Tolerância zero para toxicidade, racismo ou discriminação.\n• Proibido discussões políticas ou religiosas.",
          },
          {
            name: "📡 2. COMUNICAÇÃO DE RÁDIO",
            value:
              "• Sem spam, flood ou poluição sonora nos canais de voz.\n• Mantenha a comunicação limpa durante operações (scrims/campeonatos).",
          },
          {
            name: "⚖️ 3. PUNIÇÕES MARCIAIS",
            value:
              "• Infrações leves: Advertência Verbal ou Timeout (Mute).\n• Infrações graves: Banimento Permanente sem aviso prévio.",
          },
        )
        .setFooter({
          text: "Ao clicar em Alistar-se, você concorda com todos os termos acima.",
          iconURL: this.guild.iconURL() || undefined,
        })
        .setImage(
          "https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg",
        ); // Banner PUBG

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("accept_rules")
          .setLabel("🪖 Alistar-se")
          .setStyle(ButtonStyle.Success),
      );
      await rulesChannel.send({ embeds: [embed], components: [row] });
    }

    // 2. Commands Manual
    const commandsChannel = this.findChannel("🤖-comandos");
    if (commandsChannel) {
      // Lock Channel
      await commandsChannel.permissionOverwrites.edit(
        this.guild.roles.everyone,
        { SendMessages: false },
      );

      // FORCE CLEAR for Update
      await commandsChannel.bulkDelete(10).catch(() => {});

      const embed = new EmbedBuilder()
        .setTitle("💻 MANUAL DE OPERAÇÕES (COMANDOS)")
        .setDescription(
          "Lista de comandos disponíveis para consulta no sistema.",
        )
        .setColor("#0099FF")
        .addFields(
          {
            name: "📊 Estatísticas",
            value:
              "`/stats` - Consulta seu K/D, vitórias e patentes.\n`/ranking` - Exibe o leaderboard global.",
          },
          {
            name: "👤 Perfil & Progresso",
            value:
              "`/nivel` - Verifica seu nível de XP no Discord.\n`/passe` - Checa progresso do Season Pass.\n`/conquistas` - Suas medalhas desbloqueadas.",
          },
          {
            name: "🛡️ Clã & Social",
            value:
              "`/clan` - Informações do seu esquadrão.\n`/vincular` - Conecta sua conta PUBG ao Discord.",
          },
          {
            name: "🔊 Salas de Voz",
            value:
              "Entre no canal **➕ Criar Sala** para abrir um canal de voz temporário automaticamente.",
          },
          {
            name: "⚙️ Utilitários",
            value:
              "`/ajuda` - Menu interativo de suporte.\n`/ping` - Verifica latência do sistema.",
          },
        )
        .setFooter({
          text: "Nota: Comandos de dados pessoais são visíveis apenas para você (Efêmeros).",
        });

      await commandsChannel.send({ embeds: [embed] });
    }

    // 3. Lock Sitrep & Missoes (and Seed Content)
    const sitrepChannel = this.findChannel("📢-sitrep");
    if (sitrepChannel) {
      await sitrepChannel.permissionOverwrites.edit(this.guild.roles.everyone, {
        SendMessages: false,
      });

      // Check if empty to avoid spamming the header
      const msgs = await sitrepChannel.messages.fetch({ limit: 1 });
      if (msgs.size === 0) {
        const embed = new EmbedBuilder()
          .setTitle("📢 SITREP (SITUATION REPORT)")
          .setDescription(
            "Canal oficial de notícias, atualizações e inteligência do comando central.\nFique atento a este canal para briefings importantes.",
          )
          .setColor("#FF0000")
          .setImage(
            "https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg",
          ); // Placeholder banner
        await sitrepChannel.send({ embeds: [embed] });
      }
    }

    const missionsChannel = this.findChannel("📅-missões");
    if (missionsChannel) {
      await missionsChannel.permissionOverwrites.edit(
        this.guild.roles.everyone,
        { SendMessages: false },
      );
      // Similar check for missions if needed, or leave empty for now
    }

    // 5. Achievements Feed Header
    const achievementsChannel = this.findChannel("🏅-conquistas");
    if (achievementsChannel) {
      await achievementsChannel.permissionOverwrites.edit(
        this.guild.roles.everyone,
        { SendMessages: false },
      );

      const msgs = await achievementsChannel.messages.fetch({ limit: 1 });
      if (msgs.size === 0) {
        const embed = new EmbedBuilder()
          .setTitle("🏅 FEED DE CONQUISTAS")
          .setDescription(
            "Transmissão em tempo real de promoções e medalhas dos operadores.\n\n*Os dados são sincronizados automaticamente do campo de batalha.*",
          )
          .setColor("#FFD700");
        await achievementsChannel.send({ embeds: [embed] });
      }
    }

    // 4. Link
    const linkChannel = this.findChannel("🔗-vincular-conta");
    if (linkChannel && linkChannel.isTextBased()) {
      const messages = await linkChannel.messages.fetch({ limit: 1 });

      const embed = new EmbedBuilder()
        .setTitle("🔗 VINCULAR CONTA PUBG")
        .setDescription(
          "Para desbloquear todos os recursos da BlueZone, você precisa conectar sua conta do jogo.",
        )
        .setColor("#0099FF")
        .addFields(
          {
            name: "🎁 Benefícios",
            value:
              "• Acesso aos canais de Patente\n• Rastreamento de Estatísticas (K/D, Wins)\n• Participação no Ranking Oficial\n• Medalhas exclusivas no perfil",
          },
          {
            name: "❓ Como fazer",
            value:
              "Clique no botão abaixo para gerar seu link seguro de login.",
          },
        )
        .setImage(
          "https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg",
        ) // Banner
        .setFooter({
          text: "Segurança garantida via Login Oficial Krafton/Steam.",
        });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("link_account")
          .setLabel("🔗 Vincular Agora")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🎮"),
      );

      if (messages.size === 0) {
        await linkChannel.send({ embeds: [embed], components: [row] });
      } else {
        const lastMsg = messages.first();
        if (lastMsg?.author.id === this.guild.client.user?.id) {
          await lastMsg.edit({ embeds: [embed], components: [row] });
        }
      }
    }

    // 3. Support
    const supportChannel = this.findChannel("📦-suporte");
    if (supportChannel && supportChannel.isTextBased()) {
      const messages = await supportChannel.messages.fetch({ limit: 1 });

      const embed = new EmbedBuilder()
        .setTitle("📦 CENTRAL DE SUPORTE")
        .setDescription(
          "Precisa de ajuda? Utilize as opções abaixo para resolver seu problema rapidamente.",
        )
        .setColor("#2B2D31") // Discord Dark
        .addFields(
          {
            name: "🤖 Auto-Atendimento (IA)",
            value:
              "Tire dúvidas sobre comandos, ranks e regras instantaneamente.",
          },
          {
            name: "📩 Atendimento Humano",
            value: "Abra um ticket privado para falar com um Oficial.",
          },
        )
        .setThumbnail(
          "https://cdn-icons-png.flaticon.com/512/4961/4961759.png",
        ); // Support Icon

      const select = new StringSelectMenuBuilder()
        .setCustomId("faq_select")
        .setPlaceholder("📚 Dúvidas Frequentes (Selecione)")
        .addOptions([
          {
            label: "Problemas de Vínculo",
            value: "faq_link",
            description: "Erro ao conectar conta",
            emoji: "🔗",
          },
          {
            label: "Recrutamento Hawk",
            value: "faq_recruit",
            description: "Como entrar pro time",
            emoji: "🦅",
          },
          {
            label: "Denúncias",
            value: "faq_report",
            description: "Reportar jogador",
            emoji: "🚨",
          },
          {
            label: "Como ver Ranking",
            value: "faq_ranking",
            description: "Onde vejo o leaderboard?",
            emoji: "🏆",
          },
          {
            label: "Como subir de Elo",
            value: "faq_elo",
            description: "Sistema de Pontuação (RP)",
            emoji: "📈",
          },
        ]);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        select,
      );

      const rowButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ask_ai")
          .setLabel("Perguntar à IA")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🤖"),
        new ButtonBuilder()
          .setCustomId("open_ticket")
          .setLabel("Abrir Ticket")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("📩"),
      );

      if (messages.size === 0) {
        await supportChannel.send({
          embeds: [embed],
          components: [row, rowButtons],
        });
      } else {
        const lastMsg = messages.first();
        if (lastMsg?.author.id === this.guild.client.user?.id) {
          await lastMsg.edit({
            embeds: [embed],
            components: [row, rowButtons],
          });
          logger.info("Updated Support Channel Message");
        }
      }
    }
  }

  private findChannel(name: string) {
    return this.guild.channels.cache.find(
      (c) => c.name === name,
    ) as TextChannel;
  }
}
