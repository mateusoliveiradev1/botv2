import {
  Guild,
  Role,
  ChannelType,
  PermissionFlagsBits,
  CategoryChannel,
  TextChannel,
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from "discord.js";
import { ROLES, CHANNELS } from "./constants";
import logger from "../../core/logger";
import { EmbedFactory } from "../../utils/embeds";
import { LogManager, LogType, LogLevel } from "../logger/LogManager";
import { MissionManager } from "../missions/manager";
import { RecruitmentManager } from "../recruitment/manager";
import { GiveawayManager } from "../giveaway/manager";
import { MAPS } from "../tactics/maps";
import { WEAPONS } from "../tactics/weapons";

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

    // 6.2. Setup Clan Management (New V1)
    try {
      await this.setupClanManagement();
    } catch (error) {
      logger.error(error, "Error setting up clan management:");
    }

    // 6.3 Setup Recruitment Reception Channels (New)
    try {
      await this.createRecruitmentChannels(rolesMap);
    } catch (error) {
      logger.error(error, "Error setting up recruitment channels:");
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

    // 7.5. Setup Giveaways
    try {
      await this.setupGiveaways();
    } catch (error) {
      logger.error(error, "Error setting up giveaways:");
    }

    // 8. Launch Announcement (New V1)
    try {
      await this.announceLaunch();
    } catch (error) {
      logger.error(error, "Error announcing launch:");
    }

    // 9. Setup Academy (New V2)
    try {
      await this.setupAcademy();
    } catch (error) {
      logger.error(error, "Error setting up academy:");
    }

    // 10. Sync Relay History (Backfill) - New
    try {
        await this.syncRelayHistory();
    } catch (error) {
        logger.error(error, "Error syncing relay history:");
    }

    logger.info("✅ Setup Completed!");
  }

  private async syncRelayHistory() {
      logger.info("📡 Syncing Relay History (Backfill)...");
      
      const relayChannel = this.guild.channels.cache.find(c => c.name.includes('sitrep-relay') && c.isTextBased()) as TextChannel;
      const targetChannel = this.guild.channels.cache.find(c => c.name.includes('sitrep') && !c.name.includes('relay') && c.isTextBased()) as TextChannel;

      if (!relayChannel || !targetChannel) {
          logger.warn("⚠️ Cannot sync relay: Channels not found.");
          return;
      }

      // Fetch last 10 messages
      const messages = await relayChannel.messages.fetch({ limit: 10 });
      // Sort oldest to newest to preserve order
      const sortedMsgs = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      let syncedCount = 0;

      for (const msg of sortedMsgs) {
          // Check if already processed (has Check Mark reaction)
          const hasCheck = msg.reactions.cache.has('✅');
          
          // Also check if the bot itself reacted (to be sure)
          const botReacted = hasCheck && msg.reactions.resolve('✅')?.users.cache.has(this.guild.client.user?.id || '');

          if (!hasCheck && !botReacted) {
              // Prepare Payload (Same logic as Event)
              const payload: any = {};
              
              if (msg.content) {
                  payload.content = `**📡 RELAY [${msg.author.username}]:**\n${msg.content}`;
              }
              if (msg.embeds.length > 0) payload.embeds = msg.embeds;
              if (msg.attachments.size > 0) payload.files = Array.from(msg.attachments.values());

              if (payload.content || payload.embeds || payload.files) {
                  await targetChannel.send(payload);
                  await msg.react('✅');
                  syncedCount++;
                  // Small delay to prevent rate limit
                  await new Promise(r => setTimeout(r, 1000));
              }
          }
      }

      if (syncedCount > 0) {
          logger.info(`✅ Synced ${syncedCount} missed messages from Relay.`);
      } else {
          logger.info("✅ Relay is up to date.");
      }
  }

  private async setupGiveaways() {
    // 1. Find Admin Channel (Created by createChannels via constants.ts)
    const adminChannel = this.findChannel("🎉-controle-sorteios");

    if (adminChannel) {
      await adminChannel.bulkDelete(10).catch(() => {});
      // 2. Send Control Panel
      await GiveawayManager.sendAdminPanel(adminChannel);
      logger.info("✅ Giveaway Panel Sent/Updated");
    } else {
      logger.warn("⚠️ Admin Giveaway Channel not found (Check constants.ts)");
    }
  }

  private async announceLaunch() {
      // Find SITREP Channel (Generic Search + Type Check for Announcement or Text)
      const channel = this.guild.channels.cache.find(c => 
          c.name.includes("sitrep") && 
          !c.name.includes("relay") && // EXCLUDE RELAY
          (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
      ) as TextChannel;

      if (!channel) {
          logger.warn("⚠️ Could not find SITREP channel for launch announcement.");
          return;
      }

      // --- ANNOUNCEMENT 1: SYSTEM V1.0 ---
      const embedV1 = new EmbedBuilder()
          .setTitle("🚀 BLUEZONE SENTINEL: SISTEMA V1.0 (STABLE)")
          .setDescription(
              "Atenção, Operadores! A versão estável do Sistema BlueZone Sentinel está online.\n" +
              "Infraestrutura de banco de dados reforçada e novos módulos de inteligência ativados."
          )
          .setColor("#FFD700") // GOLD
          .setImage("https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg")
          .addFields(
              { name: "🛡️ Segurança & Estabilidade", value: "Novo núcleo de banco de dados (PostgreSQL) com proteção contra falhas de inventário e dados.", inline: false },
              { name: "📡 SITREP Ninja", value: "Sistema de notícias com relay inteligente e filtragem de spam.", inline: false },
              { name: "🦅 Recrutamento V2", value: "Painéis exclusivos para Hawk Esports e Mira Ruim.", inline: false },
              { name: "💻 Central de Comando", value: "Gestão completa de perfil, missões e identidade operacional em <#ID_CENTRAL>.", inline: false }
          )
          .setFooter({ text: "Change Log: v1.0.0 Stable • BlueZone Dev Team" })
          .setTimestamp();

      // --- ANNOUNCEMENT 2: SHOP ONLINE ---
      const embedShop = new EmbedBuilder()
          .setTitle("🛒 BLUEZONE MARKET: OPERAÇÃO COMERCIAL ATIVA")
          .setDescription(
              "O mercado negro foi estabilizado. O Quartermaster informa que novos suprimentos chegaram.\n\n" +
              "💎 **Adquira XP, Títulos e Vantagens Táticas com segurança.**"
          )
          .setColor("#FFA500") // ORANGE
          .setThumbnail("https://cdn-icons-png.flaticon.com/512/1170/1170678.png")
          .addFields(
              { name: "📍 Localização", value: "Acesse o mercado em <#ID_LOJA>.", inline: true },
              { name: "💳 Moeda", value: "Aceitamos Blue Coins (BC) e Créditos de Missão.", inline: true }
          )
          .setFooter({ text: "Economia v1.0 • BlueZone Market" });

      // Dynamic Channel Linking
      const centralChannel = this.guild.channels.cache.find(c => c.name.includes("central-de-comando"));
      const shopChannel = this.guild.channels.cache.find(c => c.name.includes("loja-oficial"));

      if (centralChannel) {
          const desc = embedV1.data.fields;
          if (desc) desc[3].value = desc[3].value.replace("<#ID_CENTRAL>", `<#${centralChannel.id}>`);
      }
      if (shopChannel) {
          const fields = embedShop.data.fields;
          if (fields) fields[0].value = fields[0].value.replace("<#ID_LOJA>", `<#${shopChannel.id}>`);
      }

      // Check for duplicates (Idempotency)
      const recentMessages = await channel.messages.fetch({ limit: 10 });
      const alreadySent = recentMessages.some(m => 
          m.embeds.length > 0 && 
          m.embeds[0].title === "🚀 BLUEZONE SENTINEL: SISTEMA V1.0 (STABLE)"
      );

      if (alreadySent) {
          logger.info("ℹ️ Launch Announcements already sent. Skipping.");
          return;
      }

      // SEND (If not duplicate)
      try {
          await channel.send({ content: "@everyone", embeds: [embedV1] });
          await channel.send({ embeds: [embedShop] }); // No ping for shop, just message
          logger.info("🚀 V1 Launch & Shop Announcements Sent Successfully!");
      } catch (error) {
          logger.error(error, "❌ Failed to send Launch Announcements. Check Bot Permissions.");
      }
  }

  private async promoteLeader(rolesMap: Map<string, Role>) {
    const leaderRole = rolesMap.get("👑 Líder Hawk");
    const ownerRole = rolesMap.get("🌟 General de Exército"); // Updated Icon

    if (!leaderRole && !ownerRole) {
        logger.warn("⚠️ Leader roles not found in rolesMap.");
        return;
    }

    try {
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
    const categoryName = "🔊 | FREQUÊNCIA DE RÁDIO";
    let category = this.guild.channels.cache.find(
      (c) => c.name === categoryName && c.type === ChannelType.GuildCategory,
    ) as CategoryChannel;

    if (!category) {
      const oldCat = this.guild.channels.cache.find(
        (c) =>
          c.name === "🔊 CANAIS DE VOZ" && c.type === ChannelType.GuildCategory,
      ) as CategoryChannel;
      if (oldCat) {
        await oldCat.setName(categoryName);
        category = oldCat;
      } else {
        try {
             category = await this.guild.channels.create({
                name: categoryName,
                type: ChannelType.GuildCategory
             });
        } catch(e) { return; }
      }
    }

    const triggerName = "➕ Criar Sala";
    const channel = this.guild.channels.cache.find(
      (c) => c.name === triggerName && c.parentId === category.id,
    );

    if (!channel) {
      await this.guild.channels.create({
        name: triggerName,
        type: ChannelType.GuildVoice,
        parent: category.id,
        userLimit: 1, 
      });
      logger.info("Created Voice Generator Trigger");
    }
  }

  private async setupIdentityChannel() {
    const channel = this.findChannel("🆔-identidade-operacional");
    if (!channel) return;

    await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
      SendMessages: false,
    });
    logger.info("🔒 Locked channel: 🆔-identidade-operacional");

    await channel.bulkDelete(20).catch(() => {});
    
    const embedHeader = new EmbedBuilder()
        .setTitle("🪪 IDENTIDADE OPERACIONAL")
        .setDescription(
            "**Bem-vindo ao Centro de Gestão de Perfil.**\n\n" +
            "Aqui você define sua **especialização tática**, **loadout preferido** e **preferências de comunicação**.\n" +
            "Suas escolhas moldam sua identidade no servidor e ajudam na organização dos esquadrões."
        )
        .setColor("#2B2D31") 
        .setImage("https://media.tenor.com/On7kvX5Q3n4AAAAC/hud-ui.gif")
        .setFooter({ text: "BlueZone Sentinel • Sistema de Identificação v2.0" });

    const classSelect = new StringSelectMenuBuilder()
        .setCustomId("identity_class_select")
        .setPlaceholder("🛡️ Selecione sua Especialização Tática")
        .addOptions(
            { label: "Sniper", value: "🔭 Sniper", description: "Tirador de elite e combate a longa distância.", emoji: "🔭" },
            { label: "Fragger", value: "🔥 Fragger", description: "Ponta de lança e combate agressivo.", emoji: "🔥" },
            { label: "IGL", value: "🧠 IGL", description: "Líder In-Game e estrategista do squad.", emoji: "🧠" },
            { label: "Support", value: "💊 Support", description: "Médico de combate e gerenciamento de utilitários.", emoji: "💊" },
            { label: "Driver", value: "🏎️ Driver", description: "Piloto designado e especialista em rotações.", emoji: "🏎️" }
        );

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

    await channel.send({ embeds: [embedHeader] });

    const embedControls = new EmbedBuilder()
        .setColor("#F2A900")
        .setDescription("**PAINEL DE CONFIGURAÇÃO**\nUtilize os menus abaixo para atualizar seu perfil.");

    await channel.send({ 
        embeds: [embedControls], 
        components: [rowClasses, rowWeapons, rowNotifs, rowActions] 
    });

    logger.info("✅ Identity Channel Setup Completed (New UI)");
  }

  // DEPRECATED/REMOVED: setupCentralCommand - Now handled by createChannels via constants.ts

  private async setupClanManagement() {
      const clanChannels = ["👮-liderança-hawk", "👮-liderança-mira"];

      for (const channelName of clanChannels) {
          const channel = this.findChannel(channelName);
          if (channel) {
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

  private async createRecruitmentChannels(rolesMap: Map<string, Role>) {
      // Create specific channels for recruitment reception
      const hawkCat = this.guild.channels.cache.find(c => c.name === "🦅 | QG HAWK ESPORTS" && c.type === ChannelType.GuildCategory) as CategoryChannel;
      const miraCat = this.guild.channels.cache.find(c => c.name === "🎯 | QG MIRA RUIM" && c.type === ChannelType.GuildCategory) as CategoryChannel;

      const everyone = this.guild.roles.everyone;
      const hawkLeader = rolesMap.get("👑 Líder Hawk");
      const miraLeader = rolesMap.get("👑 Líder Mira Ruim");

      if (hawkCat && hawkLeader) {
          let ch = this.guild.channels.cache.find(c => c.name === "📄-recrutamento-hawk" && c.parentId === hawkCat.id);
          if (!ch) {
              ch = await this.guild.channels.create({
                  name: "📄-recrutamento-hawk",
                  type: ChannelType.GuildText,
                  parent: hawkCat.id
              });
              await ch.permissionOverwrites.set([
                  { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                  { id: hawkLeader.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
              ]);
          }
      }

      if (miraCat && miraLeader) {
          let ch = this.guild.channels.cache.find(c => c.name === "📄-recrutamento-mira" && c.parentId === miraCat.id);
          if (!ch) {
              ch = await this.guild.channels.create({
                  name: "📄-recrutamento-mira",
                  type: ChannelType.GuildText,
                  parent: miraCat.id
              });
              await ch.permissionOverwrites.set([
                  { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                  { id: miraLeader.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
              ]);
          }
      }
  }

  private async setupLineUpChannels() {
      await this.createLineUpInterface("📝-line-up-hawk", "🦅 ESCALAÇÃO OFICIAL HAWK ESPORTS", "#F2A900");
      await this.createLineUpInterface("📝-line-up-mira-ruim", "🎯 ESCALAÇÃO OFICIAL MIRA RUIM", "#FF0000");
  }

  private async setupTacticsChannels() {
      await this.createTacticsInterface("🧠-taticas-hawk", "🦅 PAINEL TÁTICO HAWK", "#F2A900");
      await this.createTacticsInterface("🧠-taticas-mira-ruim", "🎯 PAINEL TÁTICO MIRA RUIM", "#FF0000");
  }

  private async createTacticsInterface(channelName: string, title: string, color: any) {
      const channel = this.findChannel(channelName);
      if (!channel) return;

      await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
          SendMessages: false,
      });

      await channel.bulkDelete(10).catch(() => {});

      const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription("Selecione o mapa e a cidade para gerar o plano de drop.\n\n🗺️ **Mapas Disponíveis:** Erangel, Miramar")
          .setColor(color)
          .setImage("https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg");

      const mapSelect = new StringSelectMenuBuilder()
          .setCustomId("tactics_map_select")
          .setPlaceholder("🗺️ Selecione o Mapa")
          .addOptions([
              { label: "Erangel", value: "ERANGEL", description: "O clássico soviético", emoji: "🌲" },
              { label: "Miramar", value: "MIRAMAR", description: "O deserto implacável", emoji: "🌵" }
          ]);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(mapSelect);

      await channel.send({ embeds: [embed], components: [row] });
      logger.info(`✅ Tactics Interface Created for ${channelName}`);
  }

  private async createLineUpInterface(channelName: string, title: string, color: any) {
      const channel = this.findChannel(channelName);
      if (!channel) return;

      await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
          SendMessages: false,
      });

      await channel.bulkDelete(10).catch(() => {});
      
      const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(
              "Aguardando sincronização de operações...\n\n*Este painel será atualizado automaticamente quando uma nova operação for agendada.*"
          )
          .setColor(color)
          .setImage("https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg") 
          .setFooter({ text: "Sistema de Gerenciamento de Squad v2.0" });

      await channel.send({ embeds: [embed] });
      logger.info(`✅ Line-Up Interface Created (Passive) for ${channelName}`);
  }

  private async setupMercenaryChannel() {
      const channel = this.findChannel("🆘-complete-de-time");
      if (!channel) return;

      await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
          SendMessages: false,
      });

      await channel.bulkDelete(20).catch(() => {});

      const embed = new EmbedBuilder()
          .setTitle("⛑️ CENTRAL DE MERCENÁRIOS")
          .setDescription(
              "Painel de alistamento para Combatentes Freelancer.\n\n**Como funciona?**\n1. Clique em **✅ Ficar Disponível** para receber o cargo <@&ROLE_ID>.\n2. Você será notificado quando um Clã precisar de completar time.\n3. Clique em **❌ Indisponível** para sair da lista."
          )
          .setColor("#8A2BE2") 
          .setThumbnail("https://cdn-icons-png.flaticon.com/512/2910/2910768.png") 
          .setFooter({ text: "BlueZone Mercenary System" });

      const mercenaryRole = this.guild.roles.cache.find(r => r.name === "🗡️ Mercenário"); // Updated Icon
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

    await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
      SendMessages: false,
    });
    logger.info("🔒 Locked channel: 🏅-conquistas");

    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find((w) => w.name === "Achievements Feed");

    if (!webhook) {
      webhook = await channel.createWebhook({
        name: "Achievements Feed",
        avatar: "https://cdn-icons-png.flaticon.com/512/3112/3112946.png", 
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
        .setColor("#F47FFF") 
        .setThumbnail("https://cdn-icons-png.flaticon.com/512/616/616490.png") 
        .addFields(
            { name: "🎁 Recompensas de Elite", value: "Ao impulsionar o servidor, você recebe:\n\n• **5.000 XP** (Promoção Imediata)\n• **Cartão de Honra** personalizado neste canal\n• **Cargo Exclusivo** de Apoiador\n• Acesso prioritário a salas VIP" }
        )
        .setImage("https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg") 
        .setFooter({ text: "Obrigado por fortalecer nossa comunidade! • BlueZone Sentinel" });
      
      await channel.send({ embeds: [embed] });
      logger.info("✅ Boost Channel Header Created");
    }
  }

  private async createRankingSystem() {
    logger.info("📊 Initializing Ranking System Webhooks...");

    const rankingChannels = [
      { name: "📅-ranking-semanal", ranking_type: "weekly" },
      { name: "📆-ranking-mensal", ranking_type: "monthly" },
      { name: "🏆-ranking-competitivo", ranking_type: "competitive" },
      { name: "⚔️-ranking-clas", ranking_type: "clans" },
      { name: "🏛️-hall-of-fame", ranking_type: "hall_of_fame" },
    ];

    const botAvatarURL = this.guild.client.user?.displayAvatarURL();

    for (const ch of rankingChannels) {
      const channel = this.guild.channels.cache.find(
        (c) => c.name === ch.name,
      ) as TextChannel;

      if (!channel) {
        logger.warn(`⚠️ Ranking channel ${ch.name} not found! Skipping webhook setup.`);
        continue;
      }

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

    const ensureRole = async (
      name: string,
      color: any,
      permissions: bigint[] = [],
      hoist = false,
    ) => {
      // 1. Try to find by Exact Name
      let role = this.guild.roles.cache.find((r) => r.name === name);
      
      // 2. If not found, try to find by Name without Emoji (Renaming Logic)
      if (!role) {
          // Removes emojis and spaces from start
          // e.g., "🦅 Hawk Esports" -> "Hawk Esports"
          const cleanName = name.replace(/^[^\w\s]+/, '').trim(); 
          
          if (cleanName) {
            role = this.guild.roles.cache.find(r => r.name === cleanName || r.name.includes(cleanName));
            
            if (role) {
                // Found old role! Rename it!
                logger.info(`🔄 Renaming Role: ${role.name} -> ${name}`);
                await role.setName(name);
                await role.setColor(color);
                await role.setHoist(hoist);
                if (permissions.length) await role.setPermissions(permissions);
            }
          }
      }

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
          // Update existing role if needed (Name, Hoist, Color)
          if (role.name !== name) await role.setName(name);
          if (role.hoist !== hoist) await role.setHoist(hoist);
          // Optional: Force Color Update
          // await role.setColor(color);
          logger.info(`Updated Role: ${name}`);
      }
      rolesMap.set(name, role as Role);
      return role as Role;
    };

    // Staff
    for (const r of ROLES.STAFF)
      await ensureRole(r.name, r.color, r.permissions, true);
    // Clans
    for (const r of ROLES.CLANS) await ensureRole(r.name, r.color, [], true);
    // Ranks
    for (const r of ROLES.RANKS) await ensureRole(r.name, r.color);
    // Classes
    for (const name of ROLES.CLASSES) await ensureRole(name, "#FFFFFF");
    // Weapons
    for (const name of ROLES.WEAPONS) await ensureRole(name, "#99AAB5");
    // Notifications
    for (const r of ROLES.NOTIFICATIONS) await ensureRole(r.name, r.color);
    // Base
    for (const r of ROLES.BASE) await ensureRole(r.name, r.color);

    // --- SHOP ROLES ---
    for (const name of ROLES.WEAPON_MASTERY) await ensureRole(name, "#99AAB5");
    for (const name of ROLES.MAP_VETERANS) await ensureRole(name, "#2ECC71");
    for (const name of ROLES.TITLES) await ensureRole(name, "#3498DB");
    for (const name of ROLES.BLACK_MARKET) await ensureRole(name, "#9B59B6");

    return rolesMap;
  }

  private async reorderChannels() {
      logger.info("📐 Reordering Channels...");
      
      let positionIndex = 0;
      for (const catConfig of CHANNELS) {
          const category = this.guild.channels.cache.find(
              (c) => c.name === catConfig.name && c.type === ChannelType.GuildCategory
          ) as CategoryChannel; 

          if (category) {
              await category.setPosition(positionIndex);
              logger.info(`   > Set Position ${positionIndex}: ${category.name}`);
              positionIndex++;

              let childIndex = 0;
              for (const childConfig of catConfig.children) {
                  const childChannel = this.guild.channels.cache.find(
                      (c) => c.name === childConfig.name && c.parentId === category.id
                  ) as TextChannel; 
                  
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
          logger.info(`🧹 Found old category '${oldCatName}'. Deleting...`);
          try {
              const children = (category as CategoryChannel).children.cache;
              if (children.size > 0) {
                  for (const [id, child] of children) {
                      await child.delete(); 
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
    const staffRole = rolesMap.get("⚜️ Coronel"); // Updated Icon
    const memberRole = rolesMap.get("🪖 Cabo"); 

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
             if (staffRole) {
                await category.permissionOverwrites.set([
                    { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel] }
                ]);
             }
        } else if (clanRoleName && leaderRoleName) {
             const clanRole = rolesMap.get(clanRoleName);
             const leaderRole = rolesMap.get(leaderRoleName);
             
             if (clanRole && leaderRole) {
                const overwrites: any[] = [
                    { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: clanRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] },
                    { id: leaderRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
                ];

                if (staffRole) {
                    overwrites.push({ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel] });
                }

                await category.permissionOverwrites.set(overwrites);
             }
        }
      } 

      // Create Children
      for (const child of catConfig.children) {
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

        // Staff Only Permissions (Generic)
        if ((child as any).staff_only && staffRole && channel) {
             await (channel as TextChannel).permissionOverwrites.set([
                { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel] }
             ]);
             logger.info(`🔒 Secured Staff Only Channel: ${child.name}`);
        }

        // Read-Only Permissions
        if ((child as any).read_only && channel) {
          await (channel as TextChannel).permissionOverwrites.edit(
            everyone.id,
            {
              SendMessages: false,
            },
          );
        }

        // Leader Only Permissions
        if ((child as any).leader_only && channel && (catConfig as any).clan_role && (catConfig as any).leader_role) {
             const clanRoleName = (catConfig as any).clan_role;
             const leaderRoleName = (catConfig as any).leader_role;
             
             const clanRole = rolesMap.get(clanRoleName);
             const leaderRole = rolesMap.get(leaderRoleName);

             if (clanRole && leaderRole) {
                 await (channel as TextChannel).permissionOverwrites.set([
                     { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                     { id: clanRole.id, deny: [PermissionFlagsBits.ViewChannel] }, 
                     { id: leaderRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                 ]);
                 
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
      await rulesChannel.permissionOverwrites.edit(this.guild.roles.everyone, {
        SendMessages: false,
      });

      await rulesChannel.bulkDelete(10).catch(() => {});

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
        .setColor("#00FF00") 
        .setImage("https://media.tenor.com/On7kvX5Q3n4AAAAC/hud-ui.gif") 
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
      await commandsChannel.permissionOverwrites.edit(
        this.guild.roles.everyone,
        { SendMessages: false },
      );

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

    // 3. Sitrep
    const sitrepChannel = this.findChannel("📢-sitrep");
    if (sitrepChannel) {
      await sitrepChannel.permissionOverwrites.edit(this.guild.roles.everyone, {
        SendMessages: false,
      });

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
          ); 
        await sitrepChannel.send({ embeds: [embed] });
      }
    }

    const missionsChannel = this.findChannel("📅-missões");
    if (missionsChannel) {
      await missionsChannel.permissionOverwrites.edit(
        this.guild.roles.everyone,
        { SendMessages: false },
      );
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
        ) 
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
        .setColor("#2B2D31") 
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
        ); 

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
    
    // Send Recruitment Panel
    await RecruitmentManager.sendPanel(this.guild);
  }

  private findChannel(name: string) {
    return this.guild.channels.cache.find(
      (c) => c.name === name,
    ) as TextChannel;
  }
  
  // REMOVED DUPLICATE setupAcademy FUNCTION FROM HERE

  private async setupAcademyMaps() {
      const channel = this.findChannel("🗺️-analise-mapas");
      if (!channel) return;

      await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
          SendMessages: false
      });
      await channel.bulkDelete(20).catch(() => {});

      const embed = new EmbedBuilder()
          .setTitle("🗺️ DATABASE TÁTICO: MAPAS")
          .setDescription("Acesse informações detalhadas, hotspots e estratégias de rotação para todos os mapas do PUBG.\n\nSelecione um mapa abaixo para visualizar o Dossiê Completo.")
          .setColor("#00FF00")
          .setImage("https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg");

      const select = new StringSelectMenuBuilder()
          .setCustomId("academy_map_select")
          .setPlaceholder("🗺️ Selecione um Mapa")
          .addOptions(Object.values(MAPS).map(map => ({
              label: map.name,
              value: map.name.toUpperCase(),
              description: `${map.size} - ${map.features[0] || 'Standard'}`,
              emoji: "🗺️"
          })));

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

      await channel.send({ embeds: [embed], components: [row] });
      logger.info("✅ Academy Maps Interface Created");
  }

  private async setupAcademyArsenal() {
      const channel = this.findChannel("🔫-arsenal-lab");
      if (!channel) return;

      await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
          SendMessages: false
      });
      await channel.bulkDelete(20).catch(() => {});

      const embed = new EmbedBuilder()
          .setTitle("🔫 LABORATÓRIO DE ARSENAL (META 2025)")
          .setDescription("Análise completa do meta atual. Compare dano, recuo e utilidade das armas.\n\n**Selecione uma categoria para ver a Tier List:**")
          .setColor("#FF0000")
          .setThumbnail("https://cdn-icons-png.flaticon.com/512/866/866292.png");

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("academy_weapon_ar").setLabel("🔫 Rifles de Assalto (AR)").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("academy_weapon_dmr").setLabel("🎯 DMRs").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("academy_weapon_sr").setLabel("🔭 Snipers (SR)").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId("academy_weapon_smg").setLabel("💨 SMGs").setStyle(ButtonStyle.Secondary)
      );

      await channel.send({ embeds: [embed], components: [row] });
      logger.info("✅ Academy Arsenal Interface Created");
  }

  private async setupAcademyGuides() {
      const channel = this.findChannel("🎓-escola-pubg");
      if (!channel) return;

      await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
          SendMessages: false
      });
      await channel.bulkDelete(20).catch(() => {});

      const embed = new EmbedBuilder()
          .setTitle("🎓 ESCOLA DE COMBATE BLUEZONE")
          .setDescription("Bem-vindo à Academia. Aqui formamos soldados de elite.\n\nEscolha um módulo de aula abaixo:")
          .setColor("#0099FF")
          .addFields(
              { name: "🔄 Rotações", value: "Aprenda a prever a safe e se posicionar.", inline: true },
              { name: "🎒 Loot & Economia", value: "O que levar na mochila e o que deixar.", inline: true },
              { name: "🚙 Veículos", value: "Spawns, durabilidade e mecânicas de drive-by.", inline: true }
          );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("guide_rotations").setLabel("🔄 Guia de Rotação").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("guide_looting").setLabel("🎒 Guia de Loot").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("guide_vehicles").setLabel("🚙 Veículos").setStyle(ButtonStyle.Success)
      );

      await channel.send({ embeds: [embed], components: [row] });
      logger.info("✅ Academy Guides Interface Created");
  }

  private async setupProLeague() {
      const channel = this.findChannel("🎓-escola-pubg"); // Using same channel for now, or create new?
      // User asked for "expandir os conteudos". Adding to School channel is cleaner.
      // But maybe a separate message in the same channel.
      
      if (!channel) return;

      const embed = new EmbedBuilder()
          .setTitle("💎 BLUEZONE PRO LEAGUE INTELLIGENCE")
          .setDescription("Acesse dados confidenciais de campeonatos globais (PGC/PGS).\nAnalise o meta game e aprenda com os melhores do mundo.")
          .setColor("#9B59B6") // Purple for Pro
          .setThumbnail("https://cdn-icons-png.flaticon.com/512/3112/3112946.png") // Trophy
          .addFields(
              { name: "📊 Meta Analytics", value: "Estatísticas de armas, pick rates e win conditions.", inline: true },
              { name: "🏆 Pro Strategies", value: "Rotações e drop spots dos times Tier 1.", inline: true },
              { name: "🧪 Mecânicas Avançadas", value: "Dados técnicos de dano, blue zone e física.", inline: true }
          );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("pro_meta").setLabel("📊 Meta Report 2026").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("pro_strats").setLabel("🏆 Estratégias Pro").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("pro_mechanics").setLabel("🧪 Mecânicas Avançadas").setStyle(ButtonStyle.Secondary)
      );

      await channel.send({ embeds: [embed], components: [row] });
      logger.info("✅ Pro League Interface Created");
  }

  private async setupAcademy() {
      await this.setupAcademyMaps();
      await this.setupAcademyArsenal();
      await this.setupAcademyGuides();
      await this.setupProLeague();
  }
}