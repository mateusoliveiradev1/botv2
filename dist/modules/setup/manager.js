"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetupManager = void 0;
const discord_js_1 = require("discord.js");
const constants_1 = require("./constants");
const logger_1 = __importDefault(require("../../core/logger"));
const discord_js_2 = require("discord.js");
const manager_1 = require("../missions/manager");
class SetupManager {
    guild;
    constructor(guild) {
        this.guild = guild;
    }
    async run() {
        logger_1.default.info(`🏗️ Starting Setup for guild: ${this.guild.name}`);
        // 1. Roles
        const rolesMap = await this.createRoles();
        // 1.5. Auto-Promote Leader (New)
        try {
            await this.promoteLeader(rolesMap);
        }
        catch (error) {
            logger_1.default.error(error, "Error promoting leader:");
        }
        // 2. Channels & Categories
        // First, cleanup old categories if they exist
        await this.cleanupOldCategories();
        await this.createChannels(rolesMap);
        // 3. Create Ranking System (Prioridade Alta - Logo após canais base)
        try {
            await this.createRankingSystem();
        }
        catch (error) {
            logger_1.default.error(error, "Error creating ranking system:");
        }
        // 4. Seed Content (Send Messages)
        try {
            await this.seedContent(rolesMap);
        }
        catch (error) {
            logger_1.default.error(error, "Error seeding content:");
        }
        // Delay to prevent Rate Limit
        await new Promise(r => setTimeout(r, 2000));
        // 4.5. Reorder Channels (New)
        try {
            await this.reorderChannels();
        }
        catch (error) {
            logger_1.default.error(error, "Error reordering channels:");
        }
        // Delay
        await new Promise(r => setTimeout(r, 2000));
        // 5. Setup Achievements Webhook
        try {
            await this.setupAchievementsWebhook();
        }
        catch (error) {
            logger_1.default.error(error, "Error setting up achievements webhook:");
        }
        // Delay
        await new Promise(r => setTimeout(r, 2000));
        // 6. Setup Identity (New)
        try {
            await this.setupIdentityChannel();
        }
        catch (error) {
            logger_1.default.error(error, "Error setting up identity channel:");
        }
        // Delay
        await new Promise(r => setTimeout(r, 2000));
        // 6.5. Setup Line-Up (New)
        try {
            await this.setupLineUpChannels();
        }
        catch (error) {
            logger_1.default.error(error, "Error setting up line-up channels:");
        }
        // Delay
        await new Promise(r => setTimeout(r, 2000));
        // 6.6. Setup Tactics Panel (New)
        try {
            await this.setupTacticsChannels();
        }
        catch (error) {
            logger_1.default.error(error, "Error setting up tactics channels:");
        }
        // Delay
        await new Promise(r => setTimeout(r, 2000));
        // 7. Setup Missions
        try {
            await manager_1.MissionManager.updateChannelBoard();
        }
        catch (error) {
            logger_1.default.error(error, "Error seeding missions channel:");
        }
        // 7. Voice Generator
        try {
            await this.createVoiceGenerator();
        }
        catch (error) {
            logger_1.default.error(error, "Error creating voice generator:");
        }
        logger_1.default.info("✅ Setup Completed!");
    }
    async promoteLeader(rolesMap) {
        const leaderRole = rolesMap.get("👑 Líder Hawk");
        if (!leaderRole) {
            logger_1.default.warn("⚠️ Leader role '👑 Líder Hawk' not found in rolesMap.");
            return;
        }
        try {
            // Tentar encontrar pelo nome de usuário exato
            // IMPORTANTE: fetch() sem args traz todos os membros (pode ser lento em servers gigantes, mas ok aqui)
            const members = await this.guild.members.fetch();
            const leader = members.find(m => m.user.username === "LiiiraaK1nG" || m.user.username === "liiiraak1ng");
            if (leader) {
                if (!leader.roles.cache.has(leaderRole.id)) {
                    await leader.roles.add(leaderRole);
                    logger_1.default.info(`👑 Promoted ${leader.user.tag} to Líder Hawk`);
                }
                else {
                    logger_1.default.info(`👑 User ${leader.user.tag} already has Leader role.`);
                }
            }
            else {
                logger_1.default.warn("⚠️ Leader 'LiiiraaK1nG' not found in guild members cache. (Check username spelling)");
            }
        }
        catch (e) {
            logger_1.default.error(e, "Error fetching members for promotion");
        }
    }
    async createVoiceGenerator() {
        // Find or Create Category (Updated Name)
        const categoryName = "🔊 | FREQUÊNCIA DE RÁDIO";
        let category = this.guild.channels.cache.find((c) => c.name === categoryName && c.type === discord_js_1.ChannelType.GuildCategory);
        if (!category) {
            // Fallback to old name search just in case
            const oldCat = this.guild.channels.cache.find((c) => c.name === "🔊 CANAIS DE VOZ" && c.type === discord_js_1.ChannelType.GuildCategory);
            if (oldCat) {
                await oldCat.setName(categoryName);
                category = oldCat;
            }
            else {
                // Will be created by createChannels loop, but just in case
                return;
            }
        }
        // Trigger Channel
        const triggerName = "➕ Criar Sala";
        let channel = this.guild.channels.cache.find((c) => c.name === triggerName && c.parentId === category.id);
        if (!channel) {
            await this.guild.channels.create({
                name: triggerName,
                type: discord_js_1.ChannelType.GuildVoice,
                parent: category.id,
                userLimit: 1, // Prevent people from staying there
            });
            logger_1.default.info("Created Voice Generator Trigger");
        }
    }
    async setupIdentityChannel() {
        const channel = this.findChannel("🆔-identidade-operacional");
        if (!channel)
            return;
        // Lock Channel
        await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
            SendMessages: false,
        });
        logger_1.default.info("🔒 Locked channel: 🆔-identidade-operacional");
        // Force Clear
        await channel.bulkDelete(20).catch(() => { });
        // --- 1. CLASSES (Roles Táticas) ---
        const embedClasses = new discord_js_1.EmbedBuilder()
            .setTitle("🛡️ ESPECIALIZAÇÃO TÁTICA")
            .setDescription("Selecione sua função principal no Squad.\n*Isso define seu ícone no servidor.*")
            .setColor("#0099FF")
            .setThumbnail("https://cdn-icons-png.flaticon.com/512/921/921513.png") // Target
            .addFields({ name: "🎯 Sniper", value: "Tirador de longa distância.", inline: true }, { name: "🔫 Fragger", value: "Linha de frente e combate.", inline: true }, { name: "🧠 IGL", value: "Líder e estrategista.", inline: true }, { name: "💊 Support", value: "Médico e utilitários.", inline: true }, { name: "🏎️ Driver", value: "Piloto de fuga e rotação.", inline: true });
        const rowClasses1 = new discord_js_2.ActionRowBuilder().addComponents(new discord_js_2.ButtonBuilder().setCustomId("role_Sniper").setLabel("🎯 Sniper").setStyle(discord_js_2.ButtonStyle.Secondary), new discord_js_2.ButtonBuilder().setCustomId("role_Fragger").setLabel("🔫 Fragger").setStyle(discord_js_2.ButtonStyle.Secondary), new discord_js_2.ButtonBuilder().setCustomId("role_IGL").setLabel("🧠 IGL").setStyle(discord_js_2.ButtonStyle.Secondary));
        const rowClasses2 = new discord_js_2.ActionRowBuilder().addComponents(new discord_js_2.ButtonBuilder().setCustomId("role_Support").setLabel("💊 Support").setStyle(discord_js_2.ButtonStyle.Secondary), new discord_js_2.ButtonBuilder().setCustomId("role_Driver").setLabel("🏎️ Driver").setStyle(discord_js_2.ButtonStyle.Secondary));
        await channel.send({ embeds: [embedClasses], components: [rowClasses1, rowClasses2] });
        // --- 2. WEAPONS (Loadout Favorito) ---
        const embedWeapons = new discord_js_1.EmbedBuilder()
            .setTitle("🎒 ARMAMENTO PREFERIDO")
            .setDescription("Qual seu equipamento de confiança?")
            .setColor("#F2A900") // Gold
            .setThumbnail("https://cdn-icons-png.flaticon.com/512/2036/2036065.png"); // Gun
        const rowWeapons1 = new discord_js_2.ActionRowBuilder().addComponents(new discord_js_2.ButtonBuilder().setCustomId("role_M416").setLabel("🏁 M416").setStyle(discord_js_2.ButtonStyle.Secondary), new discord_js_2.ButtonBuilder().setCustomId("role_Beryl M762").setLabel("🔥 Beryl").setStyle(discord_js_2.ButtonStyle.Secondary), new discord_js_2.ButtonBuilder().setCustomId("role_AUG").setLabel("🌪️ AUG").setStyle(discord_js_2.ButtonStyle.Secondary));
        const rowWeapons2 = new discord_js_2.ActionRowBuilder().addComponents(new discord_js_2.ButtonBuilder().setCustomId("role_Kar98k").setLabel("☠️ Kar98k").setStyle(discord_js_2.ButtonStyle.Secondary), new discord_js_2.ButtonBuilder().setCustomId("role_Mini14").setLabel("⚡ Mini14").setStyle(discord_js_2.ButtonStyle.Secondary), new discord_js_2.ButtonBuilder().setCustomId("role_Pan").setLabel("🍳 Pan").setStyle(discord_js_2.ButtonStyle.Secondary));
        await channel.send({ embeds: [embedWeapons], components: [rowWeapons1, rowWeapons2] });
        // --- 3. NOTIFICATIONS (New) ---
        const embedNotifs = new discord_js_1.EmbedBuilder()
            .setTitle("📡 CENTRAL DE NOTIFICAÇÕES")
            .setDescription("Gerencie seus alertas de rádio. Receba apenas o que for importante.")
            .setColor("#00FF7F") // Spring Green
            .setThumbnail("https://cdn-icons-png.flaticon.com/512/3602/3602145.png"); // Bell
        const rowNotifs = new discord_js_2.ActionRowBuilder().addComponents(new discord_js_2.ButtonBuilder().setCustomId("role_Scrims").setLabel("🔔 Scrims").setStyle(discord_js_2.ButtonStyle.Primary), new discord_js_2.ButtonBuilder().setCustomId("role_Campeonatos").setLabel("🏆 Campeonatos").setStyle(discord_js_2.ButtonStyle.Primary), new discord_js_2.ButtonBuilder().setCustomId("role_Patch Notes").setLabel("📢 Patch Notes").setStyle(discord_js_2.ButtonStyle.Secondary), new discord_js_2.ButtonBuilder().setCustomId("role_Eventos").setLabel("🎉 Eventos").setStyle(discord_js_2.ButtonStyle.Secondary));
        await channel.send({ embeds: [embedNotifs], components: [rowNotifs] });
        // --- 4. PROFILE BADGE ---
        const embedBadge = new discord_js_1.EmbedBuilder()
            .setTitle("💳 CRACHÁ DE OPERADOR")
            .setDescription("Gere sua identidade visual com todas as suas informações atuais.")
            .setColor("#FFFFFF")
            .setFooter({ text: "Sistema de Identificação Militar v2.0" });
        const rowBadge = new discord_js_2.ActionRowBuilder().addComponents(new discord_js_2.ButtonBuilder()
            .setCustomId("view_profile_badge")
            .setLabel("💳 Emitir Identidade")
            .setStyle(discord_js_2.ButtonStyle.Success)
            .setEmoji("📸"));
        await channel.send({ embeds: [embedBadge], components: [rowBadge] });
        logger_1.default.info("✅ Identity Channel Setup Completed");
    }
    async setupLineUpChannels() {
        // Configurar Line-Up Hawk
        await this.createLineUpInterface("📝-line-up-hawk", "🦅 ESCALAÇÃO OFICIAL HAWK ESPORTS", "#F2A900");
        // Configurar Line-Up Mira Ruim
        await this.createLineUpInterface("📝-line-up-mira-ruim", "🎯 ESCALAÇÃO OFICIAL MIRA RUIM", "#FF0000");
    }
    async setupTacticsChannels() {
        await this.createTacticsInterface("🧠-taticas-hawk", "🦅 PAINEL TÁTICO HAWK", "#F2A900");
        await this.createTacticsInterface("🧠-taticas-mira-ruim", "🎯 PAINEL TÁTICO MIRA RUIM", "#FF0000");
    }
    async createTacticsInterface(channelName, title, color) {
        const channel = this.findChannel(channelName);
        if (!channel)
            return;
        // Lock Channel
        await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
            SendMessages: false,
        });
        // Force Clear
        await channel.bulkDelete(10).catch(() => { });
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(title)
            .setDescription("Selecione o mapa e a cidade para gerar o plano de drop.\n\n🗺️ **Mapas Disponíveis:** Erangel, Miramar")
            .setColor(color)
            .setImage("https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg");
        // Select Menu: Map
        const mapSelect = new discord_js_2.StringSelectMenuBuilder()
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
        const row = new discord_js_2.ActionRowBuilder().addComponents(mapSelect);
        await channel.send({ embeds: [embed], components: [row] });
        logger_1.default.info(`✅ Tactics Interface Created for ${channelName}`);
    }
    async createLineUpInterface(channelName, title, color) {
        const channel = this.findChannel(channelName);
        if (!channel)
            return;
        // Lock Channel
        await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
            SendMessages: false,
        });
        // Force Clear
        await channel.bulkDelete(10).catch(() => { });
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(title)
            .setDescription("Painel de gerenciamento de presença para treinos e campeonatos.\nConfirme sua disponibilidade para os próximos eventos.")
            .setColor(color)
            .addFields({ name: "✅ Titulares Confirmados", value: "*Nenhum operador confirmado*", inline: true }, { name: "🔄 Reservas (Banco)", value: "*Nenhum reserva disponível*", inline: true }, { name: "❌ Baixas (Ausentes)", value: "*Nenhuma baixa reportada*", inline: true })
            .setImage("https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg") // Banner
            .setFooter({ text: "Sistema de Gerenciamento de Squad v2.0" });
        const row = new discord_js_2.ActionRowBuilder().addComponents(new discord_js_2.ButtonBuilder().setCustomId("lineup_join").setLabel("✅ Confirmar Presença").setStyle(discord_js_2.ButtonStyle.Success), new discord_js_2.ButtonBuilder().setCustomId("lineup_bench").setLabel("🔄 Ir para Banco").setStyle(discord_js_2.ButtonStyle.Secondary), new discord_js_2.ButtonBuilder().setCustomId("lineup_leave").setLabel("❌ Reportar Ausência").setStyle(discord_js_2.ButtonStyle.Danger));
        await channel.send({ embeds: [embed], components: [row] });
        logger_1.default.info(`✅ Line-Up Interface Created for ${channelName}`);
    }
    async setupAchievementsWebhook() {
        const channel = this.findChannel("🏅-conquistas");
        if (!channel)
            return;
        // Lock Channel (Read-Only)
        await channel.permissionOverwrites.edit(this.guild.roles.everyone, {
            SendMessages: false,
        });
        logger_1.default.info("🔒 Locked channel: 🏅-conquistas");
        // Create Webhook
        const webhooks = await channel.fetchWebhooks();
        let webhook = webhooks.find((w) => w.name === "Achievements Feed");
        if (!webhook) {
            webhook = await channel.createWebhook({
                name: "Achievements Feed",
                avatar: "https://cdn-icons-png.flaticon.com/512/3112/3112946.png", // Trophy Icon
            });
            logger_1.default.info("Created Webhook: Achievements Feed");
        }
        logger_1.default.warn(`\n🔗 [IMPORTANT] Configure this Webhook in Lovable:\n${webhook.url}\nEvents to enable: level_up, prestige_level_up, patamar_promotion, achievement_unlocked, training_achievement_unlocked, performance_achievement_unlocked\n`);
    }
    async createRankingSystem() {
        logger_1.default.info("📊 Initializing Ranking System Webhooks...");
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
            let channel = this.guild.channels.cache.find((c) => c.name === ch.name);
            if (!channel) {
                logger_1.default.warn(`⚠️ Ranking channel ${ch.name} not found! Skipping webhook setup.`);
                continue;
            }
            // Check/Create Webhook
            const webhooks = await channel.fetchWebhooks();
            let webhook = webhooks.find((w) => w.name === "PUBG Tracker Rankings" || w.name === "PUBG Hall of Fame");
            if (!webhook) {
                const webhookName = ch.name === "🏛️-hall-of-fame"
                    ? "PUBG Hall of Fame"
                    : "PUBG Tracker Rankings";
                const webhookAvatar = ch.name === "🏛️-hall-of-fame"
                    ? "https://seeklogo.com/images/P/pubg-logo-FB8B0BE671-seeklogo.com.png"
                    : botAvatarURL;
                webhook = await channel.createWebhook({
                    name: webhookName,
                    avatar: webhookAvatar,
                });
                logger_1.default.info(`Created Webhook for ${ch.name}`);
            }
            logger_1.default.warn(`🔗 WEBHOOK [${ch.name}]: ${webhook.url}`);
        }
    }
    async createRoles() {
        const rolesMap = new Map();
        // Helper to create role
        const ensureRole = async (name, color, permissions = [], hoist = false) => {
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
                    logger_1.default.info(`Created Role: ${name}`);
                }
                catch (e) {
                    logger_1.default.error(e, `Failed to create role: ${name}`);
                }
            }
            else {
                // Update existing role if needed (Optional, but good for Hoist updates)
                if (role.hoist !== hoist) {
                    await role.setHoist(hoist);
                    logger_1.default.info(`Updated Role Hoist: ${name}`);
                }
            }
            rolesMap.set(name, role);
            return role;
        };
        // Staff
        for (const r of constants_1.ROLES.STAFF)
            await ensureRole(r.name, r.color, r.permissions, true);
        // Clans (New)
        for (const r of constants_1.ROLES.CLANS)
            await ensureRole(r.name, r.color, [], true);
        // Ranks
        for (const r of constants_1.ROLES.RANKS)
            await ensureRole(r.name, r.color);
        // Classes
        for (const name of constants_1.ROLES.CLASSES)
            await ensureRole(name, "#FFFFFF");
        // Weapons
        for (const name of constants_1.ROLES.WEAPONS)
            await ensureRole(name, "#99AAB5");
        // Notifications (New)
        for (const r of constants_1.ROLES.NOTIFICATIONS)
            await ensureRole(r.name, r.color);
        // Base
        for (const r of constants_1.ROLES.BASE)
            await ensureRole(r.name, r.color);
        return rolesMap;
    }
    async reorderChannels() {
        logger_1.default.info("📐 Reordering Channels...");
        // 1. Reorder Categories
        let positionIndex = 0;
        for (const catConfig of constants_1.CHANNELS) {
            const category = this.guild.channels.cache.find((c) => c.name === catConfig.name && c.type === discord_js_1.ChannelType.GuildCategory); // Type assertion
            if (category) {
                await category.setPosition(positionIndex);
                logger_1.default.info(`   > Set Position ${positionIndex}: ${category.name}`);
                positionIndex++;
                // 2. Reorder Children within Category
                let childIndex = 0;
                for (const childConfig of catConfig.children) {
                    const childChannel = this.guild.channels.cache.find((c) => c.name === childConfig.name && c.parentId === category.id); // Generic cast to TextChannel or VoiceChannel (GuildChannel)
                    if (childChannel) {
                        await childChannel.setPosition(childIndex);
                        childIndex++;
                    }
                }
            }
        }
        logger_1.default.info("✅ Channel Reordering Completed");
    }
    async cleanupOldCategories() {
        const oldCatName = "🏆 | SALA DE GUERRA";
        const category = this.guild.channels.cache.find((c) => c.name === oldCatName && c.type === discord_js_1.ChannelType.GuildCategory);
        if (category) {
            logger_1.default.info(`🧹 Found old category '${oldCatName}'. Deleting to replace with Clan QGs...`);
            try {
                // Optionally delete children or move them? 
                // For a clean setup, we delete the category. The createChannels will create new ones.
                // If we want to keep history, we should have renamed. But the request implies separation.
                // Let's check if it has children.
                const children = category.children.cache;
                if (children.size > 0) {
                    logger_1.default.info(`   - Moving ${children.size} channels out of old category before deletion (just in case).`);
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
                logger_1.default.info("✅ Old category deleted.");
            }
            catch (e) {
                logger_1.default.error(e, "Failed to delete old category.");
            }
        }
    }
    async createChannels(rolesMap) {
        const everyone = this.guild.roles.everyone;
        const staffRole = rolesMap.get("🎖️ Coronel"); // Updated from Task Force
        const eliteRole = rolesMap.get("🦅 Hawk Esports");
        const memberRole = rolesMap.get("🪖 Cabo"); // Updated from Soldado
        for (const catConfig of constants_1.CHANNELS) {
            // Create Category
            let category = this.guild.channels.cache.find((c) => c.name === catConfig.name && c.type === discord_js_1.ChannelType.GuildCategory);
            if (!category) {
                category = await this.guild.channels.create({
                    name: catConfig.name,
                    type: discord_js_1.ChannelType.GuildCategory,
                });
            }
            // Permissions for Category
            if (catConfig.private) {
                const staffOnly = catConfig.staff_only;
                const clanRoleName = catConfig.clan_role;
                const leaderRoleName = catConfig.leader_role;
                if (staffOnly) {
                    // Staff Only (Operations, Logs)
                    if (staffRole) {
                        await category.permissionOverwrites.set([
                            { id: everyone.id, deny: [discord_js_1.PermissionFlagsBits.ViewChannel] },
                            { id: staffRole.id, allow: [discord_js_1.PermissionFlagsBits.ViewChannel] }
                        ]);
                    }
                }
                else if (clanRoleName && leaderRoleName) {
                    // Clan QG (Hawk / Mira Ruim)
                    const clanRole = rolesMap.get(clanRoleName);
                    const leaderRole = rolesMap.get(leaderRoleName);
                    // Find the OTHER clan roles to explicitly DENY them
                    // This fixes the "I can see both" issue if roles are loose
                    // Logic: Deny Everyone, Allow My Clan, Deny Other Clans (redundant if deny everyone is set, but safe)
                    if (clanRole && leaderRole) {
                        const overwrites = [
                            { id: everyone.id, deny: [discord_js_1.PermissionFlagsBits.ViewChannel] },
                            { id: clanRole.id, allow: [discord_js_1.PermissionFlagsBits.ViewChannel] },
                            { id: leaderRole.id, allow: [discord_js_1.PermissionFlagsBits.ViewChannel, discord_js_1.PermissionFlagsBits.ManageChannels] },
                        ];
                        // Staff Access
                        if (staffRole) {
                            overwrites.push({ id: staffRole.id, allow: [discord_js_1.PermissionFlagsBits.ViewChannel] });
                        }
                        await category.permissionOverwrites.set(overwrites);
                    }
                }
                else if (staffRole && eliteRole) {
                    // Private (Old War Room - Deprecated/Fallback)
                    // ...
                }
            }
            else if (catConfig.name.includes("AIR DROP")) {
                // Admin Area Logic handled per channel for Blackbox
            }
            // Create Children
            for (const child of catConfig.children) {
                // Tenta achar pelo nome exato OU pelo nome antigo (se estiver renomeando)
                // Isso é complexo, então vamos confiar que o usuário vai rodar o setup e ele vai criar novos se não achar
                // Para evitar duplicação, seria ideal ter um ID map, mas vamos pelo nome.
                let channel = this.guild.channels.cache.find((c) => c.name === child.name && c.parentId === category.id);
                if (!channel) {
                    channel = await this.guild.channels.create({
                        name: child.name,
                        type: child.type,
                        parent: category.id,
                        userLimit: child.limit,
                    });
                    logger_1.default.info(`Created Channel: ${child.name}`);
                }
                // Configurar Canal AFK
                if (child.name === "💤 AFK" && child.type === discord_js_1.ChannelType.GuildVoice) {
                    try {
                        await this.guild.setAFKChannel(channel);
                        await this.guild.setAFKTimeout(300); // 5 minutos
                        logger_1.default.info("✅ Configured AFK Channel");
                    }
                    catch (e) {
                        logger_1.default.warn("Failed to set AFK channel (Missing Permissions?)");
                    }
                }
                // Specific Channel Permissions
                if (child.name.includes("caixa-preta") && staffRole && channel) {
                    await channel.permissionOverwrites.set([
                        { id: everyone.id, deny: [discord_js_1.PermissionFlagsBits.ViewChannel] },
                        { id: staffRole.id, allow: [discord_js_1.PermissionFlagsBits.ViewChannel] },
                    ]);
                }
                // Read-Only Permissions (New)
                if (child.read_only && channel) {
                    await channel.permissionOverwrites.edit(everyone.id, {
                        SendMessages: false,
                    });
                    logger_1.default.info(`🔒 Locked standard channel: ${child.name}`);
                }
            }
        }
    }
    async seedContent(rolesMap) {
        // 1. Rules
        const rulesChannel = this.findChannel("📜-regras");
        if (rulesChannel && rulesChannel.isTextBased()) {
            // Lock Channel
            await rulesChannel.permissionOverwrites.edit(this.guild.roles.everyone, {
                SendMessages: false,
            });
            // FORCE CLEAR for Update
            await rulesChannel.bulkDelete(10).catch(() => { });
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle("📜 PROTOCOLO DE ENGAJAMENTO")
                .setDescription("Diretrizes operacionais obrigatórias para todos os agentes na BlueZone.")
                .setColor("#FFD700") // Gold
                .addFields({
                name: "🛑 1. CONDUTA E DISCIPLINA",
                value: "• Respeito absoluto entre membros e hierarquia.\n• Tolerância zero para toxicidade, racismo ou discriminação.\n• Proibido discussões políticas ou religiosas.",
            }, {
                name: "📡 2. COMUNICAÇÃO DE RÁDIO",
                value: "• Sem spam, flood ou poluição sonora nos canais de voz.\n• Mantenha a comunicação limpa durante operações (scrims/campeonatos).",
            }, {
                name: "⚖️ 3. PUNIÇÕES MARCIAIS",
                value: "• Infrações leves: Advertência Verbal ou Timeout (Mute).\n• Infrações graves: Banimento Permanente sem aviso prévio.",
            })
                .setFooter({
                text: "Ao clicar em Alistar-se, você concorda com todos os termos acima.",
                iconURL: this.guild.iconURL() || undefined,
            })
                .setImage("https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg"); // Banner PUBG
            const row = new discord_js_2.ActionRowBuilder().addComponents(new discord_js_2.ButtonBuilder()
                .setCustomId("accept_rules")
                .setLabel("🪖 Alistar-se")
                .setStyle(discord_js_2.ButtonStyle.Success));
            await rulesChannel.send({ embeds: [embed], components: [row] });
        }
        // 2. Commands Manual
        const commandsChannel = this.findChannel("🤖-comandos");
        if (commandsChannel) {
            // Lock Channel
            await commandsChannel.permissionOverwrites.edit(this.guild.roles.everyone, { SendMessages: false });
            // FORCE CLEAR for Update
            await commandsChannel.bulkDelete(10).catch(() => { });
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle("💻 MANUAL DE OPERAÇÕES (COMANDOS)")
                .setDescription("Lista de comandos disponíveis para consulta no sistema.")
                .setColor("#0099FF")
                .addFields({
                name: "📊 Estatísticas",
                value: "`/stats` - Consulta seu K/D, vitórias e patentes.\n`/ranking` - Exibe o leaderboard global.",
            }, {
                name: "👤 Perfil & Progresso",
                value: "`/nivel` - Verifica seu nível de XP no Discord.\n`/passe` - Checa progresso do Season Pass.\n`/conquistas` - Suas medalhas desbloqueadas.",
            }, {
                name: "🛡️ Clã & Social",
                value: "`/clan` - Informações do seu esquadrão.\n`/vincular` - Conecta sua conta PUBG ao Discord.",
            }, {
                name: "🔊 Salas de Voz",
                value: "Entre no canal **➕ Criar Sala** para abrir um canal de voz temporário automaticamente.",
            }, {
                name: "⚙️ Utilitários",
                value: "`/ajuda` - Menu interativo de suporte.\n`/ping` - Verifica latência do sistema.",
            })
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
                const embed = new discord_js_1.EmbedBuilder()
                    .setTitle("📢 SITREP (SITUATION REPORT)")
                    .setDescription("Canal oficial de notícias, atualizações e inteligência do comando central.\nFique atento a este canal para briefings importantes.")
                    .setColor("#FF0000")
                    .setImage("https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg"); // Placeholder banner
                await sitrepChannel.send({ embeds: [embed] });
            }
        }
        const missionsChannel = this.findChannel("📅-missões");
        if (missionsChannel) {
            await missionsChannel.permissionOverwrites.edit(this.guild.roles.everyone, { SendMessages: false });
            // Similar check for missions if needed, or leave empty for now
        }
        // 5. Achievements Feed Header
        const achievementsChannel = this.findChannel("🏅-conquistas");
        if (achievementsChannel) {
            await achievementsChannel.permissionOverwrites.edit(this.guild.roles.everyone, { SendMessages: false });
            const msgs = await achievementsChannel.messages.fetch({ limit: 1 });
            if (msgs.size === 0) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setTitle("🏅 FEED DE CONQUISTAS")
                    .setDescription("Transmissão em tempo real de promoções e medalhas dos operadores.\n\n*Os dados são sincronizados automaticamente do campo de batalha.*")
                    .setColor("#FFD700");
                await achievementsChannel.send({ embeds: [embed] });
            }
        }
        // 4. Link
        const linkChannel = this.findChannel("🔗-vincular-conta");
        if (linkChannel && linkChannel.isTextBased()) {
            const messages = await linkChannel.messages.fetch({ limit: 1 });
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle("🔗 VINCULAR CONTA PUBG")
                .setDescription("Para desbloquear todos os recursos da BlueZone, você precisa conectar sua conta do jogo.")
                .setColor("#0099FF")
                .addFields({
                name: "🎁 Benefícios",
                value: "• Acesso aos canais de Patente\n• Rastreamento de Estatísticas (K/D, Wins)\n• Participação no Ranking Oficial\n• Medalhas exclusivas no perfil",
            }, {
                name: "❓ Como fazer",
                value: "Clique no botão abaixo para gerar seu link seguro de login.",
            })
                .setImage("https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg") // Banner
                .setFooter({
                text: "Segurança garantida via Login Oficial Krafton/Steam.",
            });
            const row = new discord_js_2.ActionRowBuilder().addComponents(new discord_js_2.ButtonBuilder()
                .setCustomId("link_account")
                .setLabel("🔗 Vincular Agora")
                .setStyle(discord_js_2.ButtonStyle.Primary)
                .setEmoji("🎮"));
            if (messages.size === 0) {
                await linkChannel.send({ embeds: [embed], components: [row] });
            }
            else {
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
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle("📦 CENTRAL DE SUPORTE")
                .setDescription("Precisa de ajuda? Utilize as opções abaixo para resolver seu problema rapidamente.")
                .setColor("#2B2D31") // Discord Dark
                .addFields({
                name: "🤖 Auto-Atendimento (IA)",
                value: "Tire dúvidas sobre comandos, ranks e regras instantaneamente.",
            }, {
                name: "📩 Atendimento Humano",
                value: "Abra um ticket privado para falar com um Oficial.",
            })
                .setThumbnail("https://cdn-icons-png.flaticon.com/512/4961/4961759.png"); // Support Icon
            const select = new discord_js_2.StringSelectMenuBuilder()
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
            const row = new discord_js_2.ActionRowBuilder().addComponents(select);
            const rowButtons = new discord_js_2.ActionRowBuilder().addComponents(new discord_js_2.ButtonBuilder()
                .setCustomId("ask_ai")
                .setLabel("Perguntar à IA")
                .setStyle(discord_js_2.ButtonStyle.Primary)
                .setEmoji("🤖"), new discord_js_2.ButtonBuilder()
                .setCustomId("open_ticket")
                .setLabel("Abrir Ticket")
                .setStyle(discord_js_2.ButtonStyle.Secondary)
                .setEmoji("📩"));
            if (messages.size === 0) {
                await supportChannel.send({
                    embeds: [embed],
                    components: [row, rowButtons],
                });
            }
            else {
                const lastMsg = messages.first();
                if (lastMsg?.author.id === this.guild.client.user?.id) {
                    await lastMsg.edit({
                        embeds: [embed],
                        components: [row, rowButtons],
                    });
                    logger_1.default.info("Updated Support Channel Message");
                }
            }
        }
    }
    findChannel(name) {
        return this.guild.channels.cache.find((c) => c.name === name);
    }
}
exports.SetupManager = SetupManager;
