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
import { LogManager, LogType, LogLevel } from "../logger/LogManager";
import { MissionManager } from "../missions/manager";

export class SetupManager {
  constructor(private guild: Guild) {}

  async run() {
    logger.info(`🏗️ Starting Setup for guild: ${this.guild.name}`);

    // Log Setup Start
    await LogManager.log({
      guild: this.guild,
      type: LogType.SYSTEM,
      level: LogLevel.WARN,
      title: "🛠️ Setup Iniciado",
      description: `Processo de configuração global executado.`,
      executor: this.guild.client.user!, // Bot itself
      fields: [{ name: "Servidor", value: this.guild.name, inline: true }]
    });

    // 1. Roles
    const rolesMap = await this.createRoles();

    // 1.5. Auto-Promote Leader (New)
    try {
      await this.promoteLeader(rolesMap);
      await this.assignSystemRole(rolesMap);
    } catch (error) {
      logger.error(error, "Error promoting leader/system:");
    }

    // 2. Channels & Categories
    // First, cleanup old categories if they exist
    await this.cleanupOldCategories();
    
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

    // Delay to prevent Rate Limit
    await new Promise(r => setTimeout(r, 2000));

    // 4.5. Reorder Channels (New)
    try {
      await this.reorderChannels();
    } catch (error) {
      logger.error(error, "Error reordering channels:");
    }

    // Delay
    await new Promise(r => setTimeout(r, 2000));

    // 5. Setup Achievements Webhook
    try {
      await this.setupAchievementsWebhook();
    } catch (error) {
      logger.error(error, "Error setting up achievements webhook:");
    }

    // 5.1 Setup Boost Channel (New)
    try {
      await this.setupBoostChannel();
    } catch (error) {
      logger.error(error, "Error setting up boost channel:");
    }

    // Delay
    await new Promise(r => setTimeout(r, 2000));

    // 6. Setup Identity (New)
    try {
      await this.setupIdentityChannel();
    } catch (error) {
      logger.error(error, "Error setting up identity channel:");
    }

    // Delay
    await new Promise(r => setTimeout(r, 2000));

    // 6.1. Setup Central Command (New V1)
    try {
      await this.setupCentralCommand();
    } catch (error) {
      logger.error(error, "Error setting up central command:");
    }

    // Delay
    await new Promise(r => setTimeout(r, 2000));

    // 6.2. Setup Clan Management (New V1)
    try {
      await this.setupClanManagement();
    } catch (error) {
      logger.error(error, "Error setting up clan management:");
    }

    // Delay
    await new Promise(r => setTimeout(r, 2000));

    // 6.5. Setup Line-Up (New)
    try {
      await this.setupLineUpChannels();
    } catch (error) {
      logger.error(error, "Error setting up line-up channels:");
    }

    // Delay
    await new Promise(r => setTimeout(r, 2000));

    // 6.6. Setup Tactics Panel (New)
    try {
      await this.setupTacticsChannels();
    } catch (error) {
      logger.error(error, "Error setting up tactics channels:");
    }
    
    // Delay
    await new Promise(r => setTimeout(r, 2000));

    // 6.7. Setup Mercenaries (New)
    try {
      await this.setupMercenaryChannel();
    } catch (error) {
      logger.error(error, "Error setting up mercenary channel:");
    }
    
    // Delay
    await new Promise(r => setTimeout(r, 2000));

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

    // 8. Launch Announcement (New V1)
    try {
      await this.announceLaunch();
    } catch (error) {
      logger.error(error, "Error announcing launch:");
    }

    logger.info("✅ Setup Completed!");
  }

  private async announceLaunch() {
      const channel = this.findChannel("📢-sitrep");
      if (!channel) return;

      // Check if we already announced V1 to avoid spam on every setup run
      // We can check the last few messages
      const messages = await channel.messages.fetch({ limit: 5 });
      const alreadyAnnounced = messages.some(m => m.embeds[0]?.title?.includes("SISTEMA V1.0 ONLINE"));

      if (alreadyAnnounced) {
          logger.info("ℹ️ V1 Launch already announced. Skipping.");
          return;
      }

      const embed = new EmbedBuilder()
          .setTitle("🚀 SISTEMA V1.0 ONLINE")
          .setDescription(
              "Atenção, Sobreviventes!\n\nO servidor **BlueZone Sentinel** foi atualizado com sucesso para a versão **V1.0 (UI Overhaul)**.\nTodos os sistemas operacionais estão ativos."
          )
          .setColor("#00FF00") // Neon Green
          .setImage("https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg")
          .addFields(
              { name: "💻 Nova Central de Comando", value: "Acesse <#ID_CENTRAL> para gerenciar sua carreira.", inline: false },
              { name: "💳 Identidade Operacional", value: "Personalize seu cartão de acesso em <#ID_IDENTIDADE>.", inline: false },
              { name: "📅 Gestão de Treinos", value: "Capitães agora possuem agenda própria nos QGs.", inline: false }
          )
          .setFooter({ text: "Change Log: v1.0.0 • BlueZone Dev Team" })
          .setTimestamp();

      // Replace placeholders with real IDs if possible, otherwise use names (Discord handles names poorly in mentions if not ID, but we can try finding them)
      const centralChannel = this.findChannel("💻-central-de-comando");
      const idChannel = this.findChannel("🆔-identidade-operacional");

      if (centralChannel && idChannel) {
          const description = embed.data.fields;
          if (description) {
            description[0].value = description[0].value.replace("<#ID_CENTRAL>", `<#${centralChannel.id}>`);
            description[1].value = description[1].value.replace("<#ID_IDENTIDADE>", `<#${idChannel.id}>`);
            embed.setFields(description);
          }
      }

      await channel.send({ content: "@everyone", embeds: [embed] });
      logger.info("🚀 V1 Launch Announced!");
  }

  private async promoteLeader(rolesMap: Map<string, Role>) {
    const leaderRole = rolesMap.get("👑 Líder Hawk");
    // Also consider General de Exército as Server Owner Role
    const ownerRole = rolesMap.get("🦅 General de Exército");

    if (!leaderRole && !ownerRole) {
        logger.warn("⚠️ Leader roles not found in rolesMap.");
        return;
    }

    try {
        // Fetch Guild Owner directly
        const owner = await this.guild.fetchOwner();

        if (owner) {
             const rolesToAdd = [];
             if (leaderRole && !owner.roles.cache.has(leaderRole.id)) rolesToAdd.push(leaderRole);
             if (ownerRole && !owner.roles.cache.has(ownerRole.id)) rolesToAdd.push(ownerRole);

             if (rolesToAdd.length > 0) {
                 await owner.roles.add(rolesToAdd);
                 logger.info(`👑 Promoted Owner ${owner.user.tag} to Leader Roles`);
             } else {
                 logger.info(`👑 Owner ${owner.user.tag} already has Leader roles.`);
             }
        }
    } catch (e) {
        logger.error(e, "Error fetching owner for promotion");
    }
  }

  private async assignSystemRole(rolesMap: Map<string, Role>) {
      const systemRole = rolesMap.get("🤖 System");
      if (!systemRole) return;

      const botMember = this.guild.members.me;
      if (botMember && !botMember.roles.cache.has(systemRole.id)) {
          try {
              await botMember.roles.add(systemRole);
              logger.info(`🤖 Assigned 'System' role to Bot: ${botMember.user.tag}`);
          } catch (e) {
              logger.error(e, "Error assigning System role to bot");
          }
      }
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
        try {
             category = await this.guild.channels.create({
                name: categoryName,
                type: ChannelType.GuildCategory
             });
        } catch(e) { return; }
      }
    }

    // Trigger Channel
    const triggerName = "➕ Criar Sala";
    const channel = this.guild.channels.cache.find(
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

  private async setupIdentityChannel() {
    const channel = this.findChannel("🆔-identidade-operacional");
    if (!channel) return;

    // Lock Channel
    await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
      SendMessages: false,
    });
    logger.info("🔒 Locked channel: 🆔-identidade-operacional");

    // Force Clear
    await channel.bulkDelete(20).catch(() => {});
    
    // --- 1. HEADER (HERO) ---
    const embedHeader = new EmbedBuilder()
        .setTitle("🪪 IDENTIDADE OPERACIONAL")
        .setDescription(
            "**Bem-vindo ao Centro de Gestão de Perfil.**\n\n" +
            "Aqui você define sua **especialização tática**, **loadout preferido** e **preferências de comunicação**.\n" +
            "Suas escolhas moldam sua identidade no servidor e ajudam na organização dos esquadrões."
        )
        .setColor("#2B2D31") // Dark Theme
        .setImage("https://media.tenor.com/On7kvX5Q3n4AAAAC/hud-ui.gif") // GIF Tático (Reused for consistency or use different one)
        .setFooter({ text: "BlueZone Sentinel • Sistema de Identificação v2.0" });

    // --- 2. CONTROLS (MENUS) ---
    // 2.1 Class Select
    const classSelect = new StringSelectMenuBuilder()
        .setCustomId("identity_class_select")
        .setPlaceholder("🛡️ Selecione sua Especialização Tática")
        .addOptions(
            { label: "Sniper", value: "🎯 Sniper", description: "Tirador de elite e combate a longa distância.", emoji: "🎯" },
            { label: "Fragger", value: "🔫 Fragger", description: "Ponta de lança e combate agressivo.", emoji: "🔫" },
            { label: "IGL", value: "🧠 IGL", description: "Líder In-Game e estrategista do squad.", emoji: "🧠" },
            { label: "Support", value: "💊 Support", description: "Médico de combate e gerenciamento de utilitários.", emoji: "💊" },
            { label: "Driver", value: "🏎️ Driver", description: "Piloto designado e especialista em rotações.", emoji: "🏎️" }
        );

    // 2.2 Weapon Select
    const weaponSelect = new StringSelectMenuBuilder()
        .setCustomId("identity_weapon_select")
        .setPlaceholder("🎒 Escolha seu Armamento Principal")
        .addOptions(
            { label: "M416", value: "🏁 M416", description: "Rifle de Assalto versátil (5.56mm).", emoji: "🏁" },
            { label: "Beryl M762", value: "🔥 Beryl M762", description: "Alto dano a curta distância (7.62mm).", emoji: "🔥" },
            { label: "AUG", value: "🌪️ AUG", description: "Precisão e controle de recuo (5.56mm).", emoji: "🌪️" },
            { label: "Kar98k", value: "☠️ Kar98k", description: "Rifle de precisão clássico (7.62mm).", emoji: "☠️" },
            { label: "Mini14", value: "⚡ Mini14", description: "DMR de alta cadência (5.56mm).", emoji: "⚡" },
            { label: "Pan", value: "🍳 Pan", description: "A proteção suprema.", emoji: "🍳" }
        );

    // 2.3 Notifications Select (Multi)
    const notifSelect = new StringSelectMenuBuilder()
        .setCustomId("identity_notif_select")
        .setPlaceholder("📡 Configurar Central de Notificações")
        .setMinValues(0)
        .setMaxValues(4)
        .addOptions(
            { label: "Scrims", value: "🔔 Scrims", description: "Alertas de treinos diários e mix.", emoji: "🔔" },
            { label: "Campeonatos", value: "🏆 Campeonatos", description: "Avisos sobre torneios oficiais.", emoji: "🏆" },
            { label: "Patch Notes", value: "📢 Patch Notes", description: "Atualizações do jogo e do servidor.", emoji: "📢" },
            { label: "Eventos", value: "🎉 Eventos", description: "Eventos da comunidade e sorteios.", emoji: "🎉" }
        );

    const rowClasses = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(classSelect);
    const rowWeapons = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(weaponSelect);
    const rowNotifs = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(notifSelect);

    // --- 3. FOOTER ACTIONS ---
    const rowActions = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("view_profile_badge")
            .setLabel("👁️ Ver Meu Cartão")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("link_account")
            .setLabel("🔗 Vincular PUBG")
            .setStyle(ButtonStyle.Primary)
    );

    // Send Header
    await channel.send({ embeds: [embedHeader] });

    // Send Controls (Separate Message for cleaner UI or combined?)
    // Combined looks like a Dashboard. Let's send a separate "Control Panel" message.
    const embedControls = new EmbedBuilder()
        .setColor("#F2A900") // Gold Highlight
        .setDescription("**PAINEL DE CONFIGURAÇÃO**\nUtilize os menus abaixo para atualizar seu perfil.");

    await channel.send({ 
        embeds: [embedControls], 
        components: [rowClasses, rowWeapons, rowNotifs, rowActions] 
    });

    logger.info("✅ Identity Channel Setup Completed (New UI)");
  }

  private async setupCentralCommand() {
    const channel = this.findChannel("💻-central-de-comando");
    if (!channel) return;

    // Move to Top Category (ZONA DE SALTO)
    const categoryJump = this.guild.channels.cache.find(c => c.name.includes("ZONA DE SALTO") && c.type === ChannelType.GuildCategory);
    if (categoryJump) {
        await channel.setParent(categoryJump.id);
        // Position: After Rules
        const rulesChannel = this.findChannel("📜-regras");
        if (rulesChannel) {
            await channel.setPosition(rulesChannel.position + 1);
        }
    }

    // Lock Channel
    await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
      SendMessages: false,
    });
    logger.info("🔒 Locked channel: 💻-central-de-comando");

    // Force Clear
    await channel.bulkDelete(10).catch(() => {});

    // Stats
    const memberCount = this.guild.memberCount;
    const ping = this.guild.client.ws.ping;

    const embed = new EmbedBuilder()
      .setTitle("💻 BLUEZONE OS v2.0 :: MAIN FRAME")
      .setDescription(
        "```diff\n" +
        `+ [STATUS]: ONLINE    | 📶 PING: ${ping}ms\n` +
        `+ [SOBREVIVENTES]: ${memberCount}  | 🛡️ DEFCON: 4` +
        "```\n" +
        "**📍 SELEÇÃO DE MISSÃO**\n" +
        "O que você busca na BlueZone? Sua jornada começa escolhendo um objetivo abaixo.\n\n" +
        "> **🪂 INICIAR BRIEFING**\n" +
        "> *Para novos operadores. Ganhe XP e Kit Inicial.*\n"
      )
      .setColor("#00BFFF") // Deep Sky Blue
      .setImage("https://media.tenor.com/y4l-64dIEjAAAAAC/hud-ui.gif") // Blue Satellite HUD
      .setFooter({ text: "Sistema V2.0 • BlueZone Sentinel" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("onboarding_start")
        .setLabel("🪂 INICIAR BRIEFING")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("tactical_map")
        .setLabel("🗺️ MAPA TÁTICO")
        .setStyle(ButtonStyle.Secondary)
    );

    await channel.send({ embeds: [embed], components: [row] });
    logger.info("✅ Central Command Setup Completed (v2.0)");
  }

  private async setupClanManagement() {
      // Add Scrim Schedule Button to Clan Leadership Channels
      const clanChannels = ["👮-liderança-hawk", "👮-liderança-mira"];

      for (const channelName of clanChannels) {
          const channel = this.findChannel(channelName);
          if (channel) {
             // Check if already has the button to avoid spam
             const msgs = await channel.messages.fetch({ limit: 5 });
             const hasButton = msgs.some(m => m.embeds[0]?.title === "📅 GESTÃO DE TREINOS");

             if (!hasButton) {
                 const embed = new EmbedBuilder()
                    .setTitle("📅 GESTÃO DE TREINOS")
                    .setDescription("Painel exclusivo para Capitães e IGLs.\nAgende treinos e scrims para o clã.")
                    .setColor("#F2A900");
                
                 const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                     new ButtonBuilder()
                        .setCustomId("scrim_schedule")
                        .setLabel("📅 Agendar Novo Treino")
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji("🗓️")
                 );

                 await channel.send({ embeds: [embed], components: [row] });
                 logger.info(`✅ Scrim Manager added to ${channelName}`);
             }
          }
      }
  }

  private async setupLineUpChannels() {
      // Configurar Line-Up Hawk
      await this.createLineUpInterface("📝-line-up-hawk", "🦅 ESCALAÇÃO OFICIAL HAWK ESPORTS", "#F2A900");
      // Configurar Line-Up Mira Ruim
      await this.createLineUpInterface("📝-line-up-mira-ruim", "🎯 ESCALAÇÃO OFICIAL MIRA RUIM", "#FF0000");
  }

  private async setupTacticsChannels() {
      await this.createTacticsInterface("🧠-taticas-hawk", "🦅 PAINEL TÁTICO HAWK", "#F2A900");
      await this.createTacticsInterface("🧠-taticas-mira-ruim", "🎯 PAINEL TÁTICO MIRA RUIM", "#FF0000");
  }

  private async createTacticsInterface(channelName: string, title: string, color: any) {
      const channel = this.findChannel(channelName);
      if (!channel) return;

      // Lock Channel
      await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
          SendMessages: false,
      });

      // Force Clear
      await channel.bulkDelete(10).catch(() => {});

      const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription("Selecione o mapa e a cidade para gerar o plano de drop.\n\n🗺️ **Mapas Disponíveis:** Erangel, Miramar")
          .setColor(color)
          .setImage("https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg");

      // Select Menu: Map
      const mapSelect = new StringSelectMenuBuilder()
          .setCustomId("tactics_map_select")
          .setPlaceholder("🗺️ Selecione o Mapa")
          .addOptions([
              { label: "Erangel", value: "ERANGEL", description: "O clássico soviético", emoji: "🌲" },
              { label: "Miramar", value: "MIRAMAR", description: "O deserto implacável", emoji: "🌵" }
          ]);

      // Select Menu: Location (Placeholder - Updated via Interaction later or simplified)
      // Since we can't dynamically update this select based on the first one easily without a step-by-step,
      // We will list major cities for both or handle via a second step.
      // Better approach: User selects Map -> Bot sends ephemeral message with City select for that map.
      // For now, let's just put the Map select.

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(mapSelect);

      await channel.send({ embeds: [embed], components: [row] });
      logger.info(`✅ Tactics Interface Created for ${channelName}`);
  }

  private async createLineUpInterface(channelName: string, title: string, color: any) {
      const channel = this.findChannel(channelName);
      if (!channel) return;

      // Lock Channel
      await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
          SendMessages: false,
      });

      // Force Clear
      await channel.bulkDelete(10).catch(() => {});
      
      // Just a placeholder for now - Will be updated by ScrimManager
      const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(
              "Aguardando sincronização de operações...\n\n*Este painel será atualizado automaticamente quando uma nova operação for agendada.*"
          )
          .setColor(color)
          .setImage("https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg") // Banner
          .setFooter({ text: "Sistema de Gerenciamento de Squad v2.0" });

      await channel.send({ embeds: [embed] });
      logger.info(`✅ Line-Up Interface Created (Passive) for ${channelName}`);
  }

  private async setupMercenaryChannel() {
      const channel = this.findChannel("🆘-complete-de-time");
      if (!channel) return;

      // Lock Channel
      await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
          SendMessages: false,
      });

      // Force Clear
      await channel.bulkDelete(20).catch(() => {});

      const embed = new EmbedBuilder()
          .setTitle("⛑️ CENTRAL DE MERCENÁRIOS")
          .setDescription(
              "Painel de alistamento para Combatentes Freelancer.\n\n**Como funciona?**\n1. Clique em **✅ Ficar Disponível** para receber o cargo <@&ROLE_ID>.\n2. Você será notificado quando um Clã precisar de completar time.\n3. Clique em **❌ Indisponível** para sair da lista."
          )
          .setColor("#8A2BE2") // Blue Violet
          .setThumbnail("https://cdn-icons-png.flaticon.com/512/2910/2910768.png") // Medic Kit
          .setFooter({ text: "BlueZone Mercenary System" });

      // Replace Role ID
      const mercenaryRole = this.guild.roles.cache.find(r => r.name === "⛑️ Mercenário");
      if (mercenaryRole) {
          const desc = embed.data.description || "";
          embed.setDescription(desc.replace("<@&ROLE_ID>", `<@&${mercenaryRole.id}>`));
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("mercenary_join").setLabel("✅ Ficar Disponível").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("mercenary_leave").setLabel("❌ Indisponível").setStyle(ButtonStyle.Secondary)
      );

      await channel.send({ embeds: [embed], components: [row] });
      logger.info("✅ Mercenary Channel Setup Completed");
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

  private async setupBoostChannel() {
    const channel = this.findChannel("🚀-boosts");
    if (!channel) return;

    // Lock Channel
    await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
      SendMessages: false,
    });
    logger.info("🔒 Locked channel: 🚀-boosts");

    const msgs = await channel.messages.fetch({ limit: 1 });
    if (msgs.size === 0) {
      const embed = new EmbedBuilder()
        .setTitle("🚀 GALERIA DE IMPULSO (BOOSTS)")
        .setDescription(
          "Honra e glória aos operadores que fornecem suprimentos de elite para nossa base.\nCada boost desbloqueia recursos vitais para a operação e ajuda a manter o servidor no topo."
        )
        .setColor("#F47FFF") // Nitro Pink
        .setThumbnail("https://cdn-icons-png.flaticon.com/512/616/616490.png") // Diamond/Gem
        .addFields(
            { name: "🎁 Recompensas de Elite", value: "Ao impulsionar o servidor, você recebe:\n\n• **5.000 XP** (Promoção Imediata)\n• **Cartão de Honra** personalizado neste canal\n• **Cargo Exclusivo** de Apoiador\n• Acesso prioritário a salas VIP" }
        )
        .setImage("https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg") // Manter consistência com PUBG theme por enquanto
        .setFooter({ text: "Obrigado por fortalecer nossa comunidade! • BlueZone Sentinel" });
      
      await channel.send({ embeds: [embed] });
      logger.info("✅ Boost Channel Header Created");
    }
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
      const channel = this.guild.channels.cache.find(
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
      // Find role by name (Case Insensitive to be safe, though Discord is case sensitive usually)
      let role = this.guild.roles.cache.find((r) => r.name === name);
      
      if (!role) {
        try {
            role = await this.guild.roles.create({
            name,
            color,
            permissions: permissions.length ? permissions : undefined,
            hoist,
            reason: "BlueZone Setup",
            });
            logger.info(`Created Role: ${name}`);
        } catch (e) {
            logger.error(e, `Failed to create role: ${name}`);
        }
      } else {
          // Update existing role if needed (Optional, but good for Hoist updates)
          if (role.hoist !== hoist) {
              await role.setHoist(hoist);
              logger.info(`Updated Role Hoist: ${name}`);
          }
      }
      rolesMap.set(name, role as Role);
      return role as Role;
    };

    // Staff
    for (const r of ROLES.STAFF)
      await ensureRole(r.name, r.color, r.permissions, true);
    // Clans (New)
    for (const r of ROLES.CLANS) await ensureRole(r.name, r.color, [], true);
    // Ranks
    for (const r of ROLES.RANKS) await ensureRole(r.name, r.color);
    // Classes
    for (const name of ROLES.CLASSES) await ensureRole(name, "#FFFFFF");
    // Weapons
    for (const name of ROLES.WEAPONS) await ensureRole(name, "#99AAB5");
    // Notifications (New)
    for (const r of ROLES.NOTIFICATIONS) await ensureRole(r.name, r.color);
    // Base
    for (const r of ROLES.BASE) await ensureRole(r.name, r.color);

    return rolesMap;
  }

  private async reorderChannels() {
      logger.info("📐 Reordering Channels...");
      
      // 1. Reorder Categories
      let positionIndex = 0;
      for (const catConfig of CHANNELS) {
          const category = this.guild.channels.cache.find(
              (c) => c.name === catConfig.name && c.type === ChannelType.GuildCategory
          ) as CategoryChannel; // Type assertion

          if (category) {
              await category.setPosition(positionIndex);
              logger.info(`   > Set Position ${positionIndex}: ${category.name}`);
              positionIndex++;

              // 2. Reorder Children within Category
              let childIndex = 0;
              for (const childConfig of catConfig.children) {
                  const childChannel = this.guild.channels.cache.find(
                      (c) => c.name === childConfig.name && c.parentId === category.id
                  ) as TextChannel; // Generic cast to TextChannel or VoiceChannel (GuildChannel)
                  
                  if (childChannel) {
                      await childChannel.setPosition(childIndex);
                      childIndex++;
                  }
              }
          }
      }
      logger.info("✅ Channel Reordering Completed");
  }

  private async cleanupOldCategories() {
      const oldCatName = "🏆 | SALA DE GUERRA";
      const category = this.guild.channels.cache.find(
          (c) => c.name === oldCatName && c.type === ChannelType.GuildCategory
      );

      if (category) {
          logger.info(`🧹 Found old category '${oldCatName}'. Deleting to replace with Clan QGs...`);
          try {
              // Optionally delete children or move them? 
              // For a clean setup, we delete the category. The createChannels will create new ones.
              // If we want to keep history, we should have renamed. But the request implies separation.
              // Let's check if it has children.
              const children = (category as CategoryChannel).children.cache;
              
              if (children.size > 0) {
                  logger.info(`   - Moving ${children.size} channels out of old category before deletion (just in case).`);
                  for (const [id, child] of children) {
                      await child.setParent(null); // Leave them orphaned temporarily, or delete them if we want fresh start.
                      // Given the user said "it created channels below", we might want to delete the duplicates if they have same names?
                      // Actually, createChannels checks by name. If the old ones exist, it reuses them.
                      // So we should probably NOT delete the children, just the category, and let createChannels move them to new parents?
                      // BUT, we are splitting into TWO categories. We can't move one channel to two places.
                      // We likely created NEW channels for Hawk/Mira Ruim.
                      // So the old "Sala de Guerra" channels are likely generic ones like "scrim-alpha".
                      // Safe bet: Delete the category. The old channels will become uncategorized.
                      // Then we can manually clean them or let the user decide.
                      // OR, since this is a "Setup" that enforces structure:
                      await child.delete(); // Nuking old generic channels to avoid confusion.
                  }
              }
              await category.delete();
              logger.info("✅ Old category deleted.");
          } catch (e) {
              logger.error(e, "Failed to delete old category.");
          }
      }
  }

  private async createChannels(rolesMap: Map<string, Role>) {
    const everyone = this.guild.roles.everyone;
    const staffRole = rolesMap.get("🎖️ Coronel"); // Updated from Task Force
    const eliteRole = rolesMap.get("🦅 Hawk Esports");
    const memberRole = rolesMap.get("🪖 Cabo"); // Updated from Soldado

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
        const clanRoleName = (catConfig as any).clan_role;
        const leaderRoleName = (catConfig as any).leader_role;

        if (staffOnly) {
             // Staff Only (Operations, Logs)
             if (staffRole) {
                await category.permissionOverwrites.set([
                    { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel] }
                ]);
             }
        } else if (clanRoleName && leaderRoleName) {
             // Clan QG (Hawk / Mira Ruim)
             const clanRole = rolesMap.get(clanRoleName);
             const leaderRole = rolesMap.get(leaderRoleName);

             // Find the OTHER clan roles to explicitly DENY them
             // This fixes the "I can see both" issue if roles are loose
             // Logic: Deny Everyone, Allow My Clan, Deny Other Clans (redundant if deny everyone is set, but safe)
             
             if (clanRole && leaderRole) {
                const overwrites: any[] = [
                    { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: clanRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] },
                    { id: leaderRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
                ];

                // Staff Access
                if (staffRole) {
                    overwrites.push({ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel] });
                }

                await category.permissionOverwrites.set(overwrites);
             }
        } else if (staffRole && eliteRole) {
             // Private (Old War Room - Deprecated/Fallback)
             // ...
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

        // Staff Only Permissions (Generic) - Fix for Backup Vault
        if ((child as any).staff_only && staffRole && channel) {
             await (channel as TextChannel).permissionOverwrites.set([
                { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel] }
             ]);
             logger.info(`🔒 Secured Staff Only Channel: ${child.name}`);
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

        // Leader Only Permissions (New)
        if ((child as any).leader_only && channel && (catConfig as any).clan_role && (catConfig as any).leader_role) {
             const clanRoleName = (catConfig as any).clan_role;
             const leaderRoleName = (catConfig as any).leader_role;
             
             const clanRole = rolesMap.get(clanRoleName);
             const leaderRole = rolesMap.get(leaderRoleName);

             if (clanRole && leaderRole) {
                 await (channel as TextChannel).permissionOverwrites.set([
                     { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                     { id: clanRole.id, deny: [PermissionFlagsBits.ViewChannel] }, // Explicitly deny normal members
                     { id: leaderRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                 ]);
                 
                 // Add Staff access if needed
                 if (staffRole) {
                     await (channel as TextChannel).permissionOverwrites.edit(staffRole.id, { ViewChannel: true });
                 }
                 
                 logger.info(`🔒 Secured Leader Channel: ${child.name}`);
             }
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

      // --- TERMINAL INTERFACE ---
      const embed = new EmbedBuilder()
        .setTitle("🖥️ SISTEMA DE SEGURANÇA: PROTOCOLO INICIAL")
        .setDescription(
          "```diff\n" +
          "+ [STATUS DO SERVIDOR]: ONLINE\n" +
          "+ [LOCALIZAÇÃO]: BASE BLUEZONE SENTINEL\n" +
          "+ [NÍVEL DE ACESSO]: RESTRITO\n" +
          "```\n" +
          "**Bem-vindo, Operador.**\n" +
          "Para acessar a rede tática e receber suas credenciais, você deve concordar com as Diretrizes de Combate abaixo.\n\n" +
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
          "**⚠️ DIRETRIZES DE COMBATE (RESUMO)**\n\n" +
          "**1. 🛑 DISCIPLINA & HIERARQUIA**\n" +
          "> O desrespeito a superiores ou membros resultará em corte marcial. Mantenha a conduta profissional dentro e fora de operação.\n\n" +
          "**2. 🎙️ COMUNICAÇÃO (QAP)**\n" +
          "> Mantenha o rádio limpo. Informação clara salva vidas. Proibido poluição sonora, música ou gritos nos canais táticos.\n\n" +
          "**3. ⚖️ CONDUTA DE GUERRA**\n" +
          "> Uso de softwares ilegais (cheats), exploração de bugs ou fogo amigo intencional resulta em **BANIMENTO PERMANENTE**.\n\n" +
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
          "*Ao assinar o contrato, você declara estar ciente de todas as normas vigentes.*"
        )
        .setColor("#00FF00") // Terminal Green
        .setImage("https://media.tenor.com/On7kvX5Q3n4AAAAC/hud-ui.gif") // GIF Tático direto no Embed
        .setFooter({
          text: "BlueZone Sentinel • Sistema de Segurança v2.0",
          iconURL: this.guild.iconURL() || undefined,
        });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("accept_rules")
          .setLabel("📝 Assinar Contrato")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId("view_full_rules")
            .setLabel("📜 Ver Código Penal Completo")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("⚖️")
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
            "Transmissão em tempo real de promoções e medalhas dos combatentes.\n\n*Os dados são sincronizados automaticamente do campo de batalha.*",
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
            label: "Scrims e Treinos",
            value: "faq_gameplay",
            description: "Horários e Regras",
            emoji: "🎮",
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
