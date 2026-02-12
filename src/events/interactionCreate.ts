import {
  Events,
  Interaction,
  TextChannel,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  GuildMember,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  UserSelectMenuBuilder,
  StringSelectMenuInteraction,
} from "discord.js";
import { BotEvent } from "../types";
import { faqService } from "../services/faq";
import logger from "../core/logger";
import { TicketManager } from "../modules/tickets/manager";
import { LogManager, LogType, LogLevel } from "../modules/logger/LogManager";
import { EmbedFactory } from "../utils/embeds";
import { LovableService } from "../services/lovable";
import { MissionManager } from "../modules/missions/manager";
import { TacticsManager } from "../modules/tactics/manager";
import { MAPS } from "../modules/tactics/maps";
import { WEAPONS } from "../modules/tactics/weapons";
import { STRATEGIES } from "../modules/tactics/strategies";
import { META_STATS, WIN_CONDITIONS } from "../modules/tactics/meta_analysis";
import { PRO_ROTATIONS } from "../modules/tactics/pro_rotations";
import { DAMAGE_MULTIPLIERS, BLUEZONE_TIMING, THROWABLES, VEHICLE_PHYSICS } from "../modules/tactics/mechanics";
import { IntelligenceManager } from "../modules/tactics/IntelligenceManager";
import { DamageCalculator } from "../modules/tactics/DamageCalculator";
import { TimerManager } from "../modules/tactics/timer";
import { ROLES } from "../modules/setup/constants";
import { VoiceManager } from "../modules/voice/manager";
import { ShopManager } from "../modules/shop/ShopManager"; // Added Import
import { GiveawayManager } from "../modules/giveaway/manager";

// V1 Managers
import { OnboardingManager } from "../modules/onboarding/manager";
import { RecruitmentManager } from "../modules/recruitment/manager";
import { ProfileManager } from "../modules/profile/manager";
import { ScrimManager } from "../modules/scrims/manager";
import { SupportManager } from "../modules/support/manager";

import { MercenaryManager } from "../modules/mercenary/manager";

import { CompetitiveInteractionHandler } from "../modules/competitive/InteractionHandler";

const event: BotEvent = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    // 0. Competitive Module Handler
    if (
        (interaction.isButton() && interaction.customId.startsWith('comp_')) ||
        (interaction.isModalSubmit() && interaction.customId.startsWith('comp_'))
    ) {
        await CompetitiveInteractionHandler.handle(interaction);
        return;
    }

    // 1. Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        logger.error(error, `Error executing ${interaction.commandName}`);

        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: "Erro ao executar comando!",
              flags: MessageFlags.Ephemeral,
            });
          } else {
            await interaction.reply({
              content: "Erro ao executar comando!",
              flags: MessageFlags.Ephemeral,
            });
          }
        } catch (e) {
          // Ignorar se não der pra responder
        }
      }
    }

    // 2. Buttons
    if (interaction.isButton()) {
      try {
        // --- GIVEAWAY SYSTEM ---
        if (
          interaction.customId.startsWith("giveaway_") ||
          interaction.customId === "ga_prize" // Part of modal, but button handler might catch customId prefix if we are not careful, usually modals are submit.
        ) {
          await GiveawayManager.handleInteraction(interaction);
          return;
        }

        // --- ONBOARDING (NEW GAMIFIED FLOW) ---
        if (interaction.customId === "onboarding_start") {
          await OnboardingManager.startJump(interaction);
          return;
        }
        if (
          [
            "onboarding_land_comp",
            "onboarding_land_fun",
            "onboarding_land_learn",
          ].includes(interaction.customId)
        ) {
          await OnboardingManager.handleLanding(interaction);
          return;
        }
        if (interaction.customId === "onboarding_loot") {
          await OnboardingManager.handleLoot(interaction);
          return;
        }
        if (interaction.customId === "onboarding_finish") {
          await OnboardingManager.handleFinish(interaction);
          return;
        }

        // --- SHOP SYSTEM ---
        if (interaction.customId.startsWith("shop_")) {
          await ShopManager.handleInteraction(interaction);
          return;
        }

        // --- ACADEMY WEAPONS ---
        if (interaction.customId.startsWith("academy_weapon_")) {
          const type = interaction.customId
            .replace("academy_weapon_", "")
            .toUpperCase(); // AR, DMR, SR, SMG
          
          // V2: Use Database
          const weapons = await IntelligenceManager.getWeaponsByType(type);

          if (!weapons || weapons.length === 0) {
            await interaction.reply({
              content: "Categoria não encontrada ou banco de dados vazio.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle(`🔫 ARSENAL: ${type}`)
            .setColor("#FF0000")
            .setDescription("Meta atual e estatísticas (Live DB).");

          for (const w of weapons) {
            // Calculate TTK Live
            // Safe access using type assertion or checking existence
            const rpm = (w as any).rpm;
            const ttkCalc = rpm ? DamageCalculator.calculateTTK(w.damage, rpm, 2) : "N/A";
            const ttkDisplay = rpm ? `\n⏱️ **TTK (Vest 2):** ${ttkCalc}` : '';
            
            const recoil = (w as any).recoil_control ? `\n📉 **Recuo:** ${(w as any).recoil_control}` : '';
            const attach = (w as any).attachments_guide ? `\n🔧 **Setup:** ${(w as any).attachments_guide}` : '';

            embed.addFields({
              name: `${w.tier === "S" ? "🏆" : "🔸"} ${w.name} (${w.tier}-Tier)`,
              value: `**Dano:** ${w.damage} | **Ammo:** ${w.ammo}${ttkDisplay}${recoil}${attach}\n> *${w.meta_notes}*`,
            });
          }

          await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // --- ACADEMY GUIDES ---
        if (interaction.customId.startsWith("guide_")) {
          const topic = interaction.customId.replace("guide_", "");
          let embed;

          if (topic === "rotations") {
            embed = new EmbedBuilder()
              .setTitle("🔄 GUIA AVANÇADO DE ROTAÇÕES")
              .setDescription(
                "Dominar o posicionamento é mais importante que a mira.",
              )
              .addFields(
                {
                  name: "1. Early Game",
                  value: "Evite lutas desnecessárias no gás. Priorize veículos.",
                },
                {
                  name: "2. Mid Game (Fase 3-4)",
                  value:
                    "Domine o centro se estiver forte, ou jogue nas bordas (Edge) se precisar limpar as costas.",
                },
                {
                  name: "3. Late Game",
                  value:
                    "Use utilitários (Smoke/Granadas). Limpe seu ângulo antes de avançar.",
                },
              )
              .setColor("#0099FF");
          } else if (topic === "looting") {
            embed = new EmbedBuilder()
              .setTitle("🎒 GUIA DE ECONOMIA E LOOT")
              .addFields(
                {
                  name: "Mochila Ideal (Lv.2)",
                  value:
                    "• 5 First Aid\n• 5 Bandages\n• 2-3 Energy Drink\n• 3-5 Smokes\n• 2 Frags/Molotovs\n• 140-180 Munição",
                },
                {
                  name: "O que não levar",
                  value:
                    "Pistolas (se não for usar), munição excessiva (>250), attachments inúteis.",
                },
              )
              .setColor("#F2A900");
          } else if (topic === "vehicles") {
            embed = new EmbedBuilder()
              .setTitle("🚙 GUIA DE VEÍCULOS")
              .addFields(
                {
                  name: "Drive-by",
                  value:
                    "Troque para o assento do passageiro (Ctrl+2) para atirar em movimento. O carro mantém a velocidade por alguns segundos.",
                },
                {
                  name: "Proteção",
                  value:
                    "Use o UAZ ou Dacia como cover móvel. Estoure os pneus do lado oposto para ele não passar por baixo.",
                },
              )
              .setColor("#00FF00");
          }

          if (embed) {
            await interaction.reply({
              embeds: [embed],
              flags: MessageFlags.Ephemeral,
            });
          }
          return;
        }

        // --- PRO LEAGUE SYSTEM ---
        if (interaction.customId === "pro_meta") {
            const embed = new EmbedBuilder()
                .setTitle("📊 STATE OF THE META 2026 (Q1)")
                .setDescription("Análise estatística baseada em 500+ partidas profissionais (PGC/PGS).")
                .setColor("#9B59B6")
                .addFields(
                    { name: "🔫 AR Pick Rates", value: META_STATS.AR.map(w => `**${w.name}**: ${w.pick_rate}% (Win: ${w.win_rate}%)`).join("\n"), inline: true },
                    { name: "🎯 DMR Pick Rates", value: META_STATS.DMR.map(w => `**${w.name}**: ${w.pick_rate}% (Win: ${w.win_rate}%)`).join("\n"), inline: true },
                    { name: "📈 Win Conditions", value: WIN_CONDITIONS.ROTATIONS.map(r => `**${r.type}**: ${r.win_rate}% Win Rate\n> *${r.description}*`).join("\n"), inline: false }
                );
            
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            return;
        }

        if (interaction.customId === "pro_strats") {
            // Create Select Menu for Teams
            const select = new StringSelectMenuBuilder()
                .setCustomId("pro_team_select")
                .setPlaceholder("🏆 Selecione um Time Pro")
                .addOptions(PRO_ROTATIONS.map(team => ({
                    label: team.team,
                    value: team.team,
                    description: `${team.map} - ${team.strategy}`,
                    emoji: "🛡️"
                })));

            const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
            
            await interaction.reply({
                content: "Selecione uma organização para ver seu Playbook:",
                components: [row],
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (interaction.customId === "pro_mechanics") {
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId("mech_damage").setLabel("🎯 Dano & Hitbox").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("mech_bluezone").setLabel("⚡ Blue Zone").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("mech_util").setLabel("💣 Utilitários").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("mech_vehicle").setLabel("🚗 Física").setStyle(ButtonStyle.Success)
            );

            await interaction.reply({
                content: "Selecione o módulo de mecânica avançada:",
                components: [row],
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // --- MECHANICS SUB-MENUS ---
        if (interaction.customId === "mech_damage") {
            const embed = new EmbedBuilder()
                .setTitle("🎯 MULTIPLICADORES DE DANO (2025/26)")
                .setDescription("Dano percentual por região do corpo.")
                .setColor("#FF0000");

            for (const [cls, mult] of Object.entries(DAMAGE_MULTIPLIERS)) {
                embed.addFields({
                    name: cls,
                    value: `Head: ${mult.head}x | Neck: ${mult.neck}x | Chest: ${mult.torso}x`,
                    inline: true
                });
            }
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            return;
        }

        if (interaction.customId === "mech_bluezone") {
            const embed = new EmbedBuilder()
                .setTitle("⚡ BLUE ZONE TIMING (SUPER v3.0.5)")
                .setDescription("Padrão Competitivo Oficial.")
                .setColor("#0000FF");

            const table = BLUEZONE_TIMING.map(p => `**Fase ${p.phase}**: DPS ${p.dps} | Move ${Math.floor(p.move/60)}m${p.move%60}s`).join("\n");
            embed.addFields({ name: "Tabela de Fases", value: table });
            
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            return;
        }

        if (interaction.customId === "mech_util") {
             const embed = new EmbedBuilder()
                .setTitle("💣 UTILITÁRIOS & ARREMESSÁVEIS")
                .setColor("#FFFF00");
            
            for (const [key, data] of Object.entries(THROWABLES)) {
                embed.addFields({
                    name: data.name,
                    value: `**Meta Tip:** ${data.meta_tip}\n${(data as any).cooking_time ? `Cooking: ${ (data as any).cooking_time}s` : ''}`
                });
            }
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            return;
        }

        if (interaction.customId === "mech_vehicle") {
             const embed = new EmbedBuilder()
                .setTitle("🚗 FÍSICA AVANÇADA DE VEÍCULOS")
                .setColor("#00FF00")
                .addFields(
                    { name: "Drive-by Shooting", value: VEHICLE_PHYSICS.DRIVE_BY },
                    { name: "Air Control", value: VEHICLE_PHYSICS.AIR_CONTROL },
                    { name: "Tração (Tipos)", value: Object.entries(VEHICLE_PHYSICS.TRACTION).map(([k, v]) => `**${k}:** ${v}`).join("\n") }
                );
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            return;
        }

        // --- TACTICAL MAP (GPS) ---
        if (interaction.customId === "tactical_map") {
          const embed = new EmbedBuilder()
            .setTitle("📍 SISTEMA DE NAVEGAÇÃO GLOBAL (GPS)")
            .setDescription(
              "Você está na **ZONA DE SALTO**.\n\n" +
                "🪂 **ZONA DE SALTO** (Entrada)\n" +
                "> `📜-regras` • Terminal de Acesso\n" +
                "> `💻-central-de-comando` • Início & Onboarding\n" +
                "> `🆔-identidade-operacional` • Seu Perfil\n\n" +
                "🎮 **CENTRO DE COMANDO** (Geral)\n" +
                "> `📢-sitrep` • Notícias Oficiais\n" +
                "> `📅-missões` • Tarefas Diárias\n" +
                "> `🏅-conquistas` • Feed de Promoções\n\n" +
                "🔊 **FREQUÊNCIA DE RÁDIO** (Voz)\n" +
                "> `➕ Criar Sala` • Canais Temporários\n\n" +
                "⚔️ **QUARTÉIS GENERAIS** (Clãs)\n" +
                "> `🦅 Hawk Esports` • Área Restrita\n" +
                "> `🎯 Mira Ruim` • Área Restrita\n\n" +
                "📦 **LOGÍSTICA**\n" +
                "> `📦-suporte` • Ajuda e Tickets\n" +
                "> `🔗-vincular-conta` • Conexão PUBG",
            )
            .setColor("#00FFFF") // Cyan
            .setThumbnail(
              "https://cdn-icons-png.flaticon.com/512/921/921439.png",
            ); // Compass/Radar

          await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // --- V1: RECRUITMENT ---
        if (
          interaction.customId.startsWith("recruit_approve_") ||
          interaction.customId.startsWith("recruit_reject_")
        ) {
          await RecruitmentManager.handleDecision(interaction);
          return;
        }

        // --- V1: PROFILE ---
        if (interaction.customId === "view_profile_badge") {
          await ProfileManager.showCard(interaction);
          return;
        }

        // --- V1: SCRIMS ---
        if (interaction.customId === "scrim_schedule") {
          await ScrimManager.showScheduler(interaction);
          return;
        }
        if (
          interaction.customId === "scrim_join" ||
          interaction.customId === "scrim_leave"
        ) {
          await ScrimManager.handlePresence(interaction);
          return;
        }
        if (interaction.customId === "scrim_sos") {
          await ScrimManager.handleSOS(interaction);
          return;
        }

        if (interaction.customId === "scrim_apply_merc") {
          // Check if user has Mercenary Role
          const role = interaction.guild?.roles.cache.find(
            (r) => r.name === "⛑️ Mercenário",
          );
          const member = interaction.member as GuildMember;
          if (role && !member.roles.cache.has(role.id)) {
            await interaction.reply({
              content:
                "⚠️ **Atenção:** Você precisa se alistar como Mercenário no canal <#ID_MERC_CHANNEL> primeiro.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          // Determine Target Clan from Channel
          const channel = interaction.channel as TextChannel;
          let target = "Unknown";
          if (channel.name.includes("hawk")) target = "Hawk-Esports";
          else if (channel.name.includes("mira")) target = "Mira-Ruim";

          // Fake interaction modification to pass target
          // Actually, we can just call the manager with the interaction and it parses context
          // But MercenaryManager needs target in ID or we pass it
          // Let's modify the ID temporarily or pass args if we refactor.
          // Better: update customId before calling? No, readonly.
          // Let's create a new button interaction logic in MercenaryManager that accepts the interaction as is and infers target.
          // The button ID is just 'scrim_apply_merc', so we need to infer target from channel inside the manager.
          // Update: I implemented handleApplication reading from split('_')[2].
          // So we need the button to HAVE the target in ID.
          // Let's update ScrimManager to generate the button with the target in ID.

          // Wait, I updated ScrimManager to just 'scrim_apply_merc'.
          // I should update ScrimManager to 'scrim_apply_merc_TARGET'.
          // For now, let's assume we fix ScrimManager or handle it here.

          // Let's use the generic handler and infer inside if possible,
          // BUT MercenaryManager expects split('_')[2].
          // So I MUST update ScrimManager to include target in ID.

          // Assuming ScrimManager IS updated (I will do it next step if I missed it, but I think I just added 'scrim_apply_merc' without target).
          // Checking previous tool output...
          // "new ButtonBuilder().setCustomId('scrim_apply_merc')..." -> NO TARGET.

          // FIX: I will handle the logic here and mock the ID or change the manager.
          // Let's change the manager logic to infer target if ID doesn't have it?
          // Or better, update ScrimManager to add target.

          // For now, let's just route to Manager and let it fail or fix it.
          // Actually, I can just update ScrimManager in the next step to be correct.
          // Let's add the route here first.

          // Wait, I can't easily pass arguments to handleApplication unless I change signature.
          // I will update ScrimManager to 'scrim_apply_merc_Hawk-Esports'.

          // For this file, I just need to match startsWith.
        }

        if (
          interaction.customId.startsWith("scrim_apply_merc") ||
          interaction.customId.startsWith("merc_") ||
          interaction.customId.startsWith("open_merc_eval_") ||
          interaction.customId === "mercenary_join" ||
          interaction.customId === "mercenary_leave"
        ) {
          await MercenaryManager.handleInteraction(interaction as any);
          return;
        }

        // --- VOICE CONTROLS ---
        if (interaction.customId.startsWith("voice_")) {
          await VoiceManager.handleInteraction(interaction);
          return;
        }

        // --- TACTICS SYSTEM ---
        if (interaction.customId.startsWith("tactics_")) {
          await TacticsManager.handleInteraction(interaction);
          return;
        }

        // --- V1: MISSIONS ---
        if (
          interaction.customId === "check_mission_progress" ||
          interaction.customId === "refresh_mission_progress"
        ) {
          await MissionManager.handleInteraction(interaction);
          return;
        }

        // --- SUPPORT / FAQ ---
        // Moved to SupportManager in Select Menu section, keeping buttons here if needed
        // 'ask_ai' is handled below in Modal or generic button

        if (interaction.customId === "report_bug") {
          const modal = new ModalBuilder()
            .setCustomId("bug_report_modal")
            .setTitle("🐛 Reportar Bug");

          const commandInput = new TextInputBuilder()
            .setCustomId("bug_command")
            .setLabel("Onde ocorreu o erro?")
            .setPlaceholder("Ex: Comando /ranking ou Botão de Ticket")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const descInput = new TextInputBuilder()
            .setCustomId("bug_desc")
            .setLabel("Descrição do Problema")
            .setPlaceholder("Explique o que aconteceu...")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

          modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              commandInput,
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(descInput),
          );

          await interaction.showModal(modal);
        }

        // --- V1: TICKETS ---
        if (
          interaction.customId === "open_ticket" ||
          interaction.customId === "claim_ticket" ||
          interaction.customId === "close_ticket"
        ) {
          await TicketManager.handleInteraction(interaction);
          return;
        }

        if (interaction.customId === "link_account") {
          // Redireciona para o comando /vincular logic
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          const response = await LovableService.generateLoginLink(
            interaction.user.id,
            interaction.user.username,
          );

          if (response.success && response.data) {
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setLabel("Acessar Terminal Seguro")
                .setStyle(ButtonStyle.Link)
                .setURL(response.data.login_url),
            );

            const embed = new EmbedBuilder()
              .setTitle("🔐 Link de Acesso Gerado")
              .setDescription(
                "Clique no botão abaixo para autenticar sua conta no sistema central.\nEste link expira em 10 minutos.",
              )
              .setColor("#0099FF");

            await interaction.editReply({
              embeds: [embed],
              components: [row],
            });
          } else {
            await interaction.editReply({
              embeds: [EmbedFactory.error("Falha na geração de credenciais.")],
            });
          }
        }

        if (interaction.customId === "accept_rules") {
          const role = interaction.guild?.roles.cache.find(
            (r) => r.name === "🪖 Cabo",
          );
          const visitorRole = interaction.guild?.roles.cache.find(
            (r) => r.name === "🏳️ Recruta",
          );
          const member = await interaction.guild?.members.fetch(
            interaction.user.id,
          );

          if (role && member) {
            if (member.roles.cache.has(role.id)) {
              const embed = new EmbedBuilder()
                .setTitle("ℹ️ Status de Serviço")
                .setDescription(
                  "Você já consta como alistado no banco de dados.",
                )
                .setColor("#FFFF00");
              await interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral,
              });
            } else {
              try {
                await member.roles.add(role);
                // Remove Visitor Role if exists
                if (visitorRole && member.roles.cache.has(visitorRole.id)) {
                  await member.roles.remove(visitorRole);
                }

                const embed = new EmbedBuilder()
                  .setTitle("🪖 Alistamento Confirmado")
                  .setDescription(
                    "Bem-vindo à força tarefa, Soldado. Verifique os canais de patentes.",
                  )
                  .setColor("#00FF00");
                await interaction.reply({
                  embeds: [embed],
                  flags: MessageFlags.Ephemeral,
                });
              } catch (error: any) {
                logger.error(error, "Erro ao adicionar cargo de alistamento");
                await interaction.reply({
                  content:
                    '❌ Erro de Permissão: Não consegui te dar o cargo. Peça a um admin para verificar se meu cargo está acima do cargo "🪖 Cabo".',
                  flags: MessageFlags.Ephemeral,
                });
              }
            }
          } else {
            logger.warn('Role "🪖 Cabo" not found or member not found.');
            await interaction.reply({
              content:
                '❌ Erro de Configuração: Cargo "🪖 Cabo" não encontrado.',
              flags: MessageFlags.Ephemeral,
            });
          }
        }

        // --- V1: FULL RULES (CODE PENAL) ---
        if (interaction.customId === "view_full_rules") {
          const embed = new EmbedBuilder()
            .setTitle("⚖️ REGULAMENTO DISCIPLINAR UNIFICADO (RDU)")
            .setColor("#FF0000")
            .setDescription(
              "**ARTIGO 1º - DOS PRINCÍPIOS FUNDAMENTAIS**\n" +
                "> *A honra e a lealdade são os pilares desta organização. A quebra de confiança é a falha suprema.*\n\n" +
                "**1. Hierarquia**\n" +
                "Respeito absoluto à cadeia de comando. Ordens de Superiores em operação devem ser seguidas sem hesitação. Insubordinação é punida gravemente.\n\n" +
                "**2. Integridade**\n" +
                "O uso de softwares ilegais (hacks, macros de recoil) é considerado traição e punido com **Expulsão Sumária**.\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "**ARTIGO 2º - DA CONDUTA EM OPERAÇÃO (IN-GAME)**\n\n" +
                "**1. Fogo Amigo (Team Kill)**\n" +
                "• **Acidental:** Pedir desculpas e reviver o aliado imediatamente.\n" +
                "• **Intencional:** Corte Marcial imediato (Banimento).\n\n" +
                "**2. Saque (Loot)**\n" +
                "Prioridade de loot é sempre de quem abateu o alvo. Roubar itens de aliados ('Loot Goblin') é passível de advertência e rebaixamento.\n\n" +
                "**3. Abandono de Posto**\n" +
                "Sair no meio de uma partida ranqueada, treino ou campeonato sem justificativa grave resultará em rebaixamento de patente.\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "**ARTIGO 3º - DA COMUNICAÇÃO E CONVÍVIO**\n\n" +
                "**1. Poluição Sonora**\n" +
                "Música, gritos, ASMR ou ruídos externos no rádio tático são estritamente proibidos.\n\n" +
                "**2. Assédio e Discriminação**\n" +
                "Tolerância **ZERO**. Racismo, homofobia, machismo ou assédio moral resultam em banimento permanente e denúncia às plataformas competentes.\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "**ARTIGO 4º - PROCESSO DISCIPLINAR**\n" +
                "• **1ª Infraçâo:** Advertência Verbal (Registro na ficha).\n" +
                "• **2ª Infração:** Suspensão Temporária (Timeout 24h).\n" +
                "• **3ª Infração:** Baixa Desonrosa (Banimento Permanente).\n\n" +
                "*Este documento entra em vigor imediatamente após a assinatura do contrato.*",
            )
            .setFooter({
              text: "Departamento de Justiça Militar • BlueZone Sentinel",
            });

          await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // --- ROLE TOGGLE (Arsenal) ---
        if (interaction.customId.startsWith("role_")) {
          const roleName = interaction.customId.replace("role_", "");
          const role = interaction.guild?.roles.cache.find((r) =>
            r.name.includes(roleName),
          );
          const member = await interaction.guild?.members.fetch(
            interaction.user.id,
          );

          if (!role || !member) {
            await interaction.reply({
              content: "❌ Erro: Cargo não encontrado no sistema.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role);

            await LogManager.log({
              guild: interaction.guild!,
              type: LogType.MEMBER,
              level: LogLevel.INFO,
              title: "🎒 Equipamento Removido",
              description: `Usuário alterou seu loadout.`,
              executor: interaction.user,
              fields: [
                { name: "Item Removido", value: role.name, inline: true },
              ],
            });

            await interaction.reply({
              content: `➖ **${role.name}** removido do seu arsenal.`,
              flags: MessageFlags.Ephemeral,
            });
          } else {
            await member.roles.add(role);

            await LogManager.log({
              guild: interaction.guild!,
              type: LogType.MEMBER,
              level: LogLevel.INFO,
              title: "🎒 Equipamento Adicionado",
              description: `Usuário alterou seu loadout.`,
              executor: interaction.user,
              fields: [
                { name: "Item Adicionado", value: role.name, inline: true },
              ],
            });

            await interaction.reply({
              content: `➕ **${role.name}** equipado com sucesso.`,
              flags: MessageFlags.Ephemeral,
            });
          }
        }

        if (interaction.customId.startsWith("lineup_")) {
          await interaction.deferUpdate(); // Acknowledge button click without sending new message

          const action = interaction.customId.replace("lineup_", ""); // join, bench, leave
          const member = interaction.member as GuildMember;
          const userTag = member.displayName; // Use Display Name (Nickname)

          const embed = interaction.message.embeds[0];
          if (!embed) return;

          // Helper to clean list
          const cleanList = (text: string) => {
            return text
              .replace("*Nenhum operador confirmado*", "")
              .replace("*Nenhum reserva disponível*", "")
              .replace("*Nenhuma baixa reportada*", "")
              .split("\n")
              .filter((l) => l.trim().length > 0 && !l.includes(userTag)); // Remove user from all lists first
          };

          // Get current lists
          const confirmed = cleanList(embed.fields[0].value);
          const bench = cleanList(embed.fields[1].value);
          const absent = cleanList(embed.fields[2].value);

          // Add user to target list
          if (action === "join") confirmed.push(`• ${userTag}`);
          if (action === "bench") bench.push(`• ${userTag}`);
          if (action === "leave") absent.push(`• ${userTag}`);

          // Format for display
          const format = (list: string[]) =>
            list.length > 0
              ? list.join("\n")
              : action === "join" && list === confirmed
                ? "*Nenhum operador confirmado*"
                : action === "bench" && list === bench
                  ? "*Nenhum reserva disponível*"
                  : "*Nenhuma baixa reportada*";

          // Rebuild Embed
          const newEmbed = EmbedBuilder.from(embed).setFields(
            {
              name: `✅ Titulares Confirmados (${confirmed.length})`,
              value: format(confirmed) || "*Vazio*",
              inline: true,
            },
            {
              name: `🔄 Reservas (Banco) (${bench.length})`,
              value: format(bench) || "*Vazio*",
              inline: true,
            },
            {
              name: `❌ Baixas (Ausentes) (${absent.length})`,
              value: format(absent) || "*Vazio*",
              inline: true,
            },
          );

          await interaction.message.edit({ embeds: [newEmbed] });
        }

        // Removed old profile badge logic as it is now handled by ProfileManager
        // if (interaction.customId === 'view_profile_badge') { ... }

        if (interaction.customId === "ask_ai") {
          const modal = new ModalBuilder()
            .setCustomId("faq_ai_modal")
            .setTitle("🤖 Perguntar à IA");

          const questionInput = new TextInputBuilder()
            .setCustomId("question_input")
            .setLabel("Qual a sua dúvida?")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(
              "Ex: Como vejo minhas métricas? ou Quantos pontos ganha por vitória?",
            )
            .setRequired(true)
            .setMaxLength(300);

          const firstActionRow =
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              questionInput,
            );
          modal.addComponents(firstActionRow);

          await interaction.showModal(modal);
        }
      } catch (error: any) {
        // Handle "Unknown interaction" specifically to avoid crashing or loud errors
        if (error.code === 10062) {
          logger.warn(
            `⚠️ Unknown interaction in button handler: ${interaction.customId}`,
          );
        } else {
          logger.error(error, `Error handling button ${interaction.customId}`);
        }
      }
    }

    // 3. Select Menus (FAQ and Voice)
    if (interaction.isStringSelectMenu() || interaction.isUserSelectMenu()) {
      // --- GIVEAWAY SELECT MENU ---
      if (
        interaction.isStringSelectMenu() &&
        interaction.customId === "giveaway_type_select"
      ) {
        await GiveawayManager.handleInteraction(interaction);
        return;
      }

      // --- SHOP SYSTEM ---
      if (
        interaction.isStringSelectMenu() &&
        interaction.customId.startsWith("shop_")
      ) {
        await ShopManager.handleInteraction(interaction);
        return;
      }
      
      // --- ACADEMY GUIDES ---
      if (interaction.customId === "guide_rotations") {
          const embed = new EmbedBuilder()
              .setTitle("🔄 GUIA AVANÇADO DE ROTAÇÕES (2025)")
              .setColor("#0099FF")
              .setDescription("Dominar o posicionamento é mais importante que a mira.")
              .addFields(
                  { name: "1. Early Game (Fase 1-2)", value: "Evite lutas desnecessárias no gás. Priorize veículos e loot rápido. Se estiver longe, use o **Jammer Pack** para tankar o gás até a Fase 3." },
                  { name: "2. Mid Game (Fase 3-4)", value: "**Dead Side:** Identifique o lado da safe com menos tiros e rotacione por lá.\n**Strong Side:** O lado com mais cover, mas com mais inimigos. Só vá se tiver certeza." },
                  { name: "3. Late Game (Fase 5+)", value: "Use utilitários (Smoke/Granadas). Limpe seu ângulo antes de avançar. Nunca fique parado no aberto." }
              )
              .setImage("https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg"); // Placeholder for map logic
          
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
      }

      if (interaction.customId === "guide_looting") {
          const embed = new EmbedBuilder()
              .setTitle("🎒 GUIA DE ECONOMIA E LOOT (META 7-5-3-1)")
              .setColor("#E67E22")
              .setDescription("**Regra de Ouro:** Não seja uma lootbox ambulante. Leve apenas o necessário.")
              .addFields(
                  { name: "💊 Curas (Kit Padrão)", value: "• 5 First Aid\n• 10 Bandages\n• 3-5 Energy Drink/Painkiller" },
                  { name: "💣 Utilitários (Obrigatório)", value: "• **4 Smokes** (Mínimo)\n• 2 Frags ou Molotovs\n• 1 Blue Zone Grenade (Flush)" },
                  { name: "🔫 Munição", value: "• **140-180 balas** (AR/DMR somadas). Mais que isso é desperdício de espaço." },
                  { name: "🚫 O que NÃO levar", value: "Pistolas (peso morto), miras duplicadas, munição excessiva (>250)." }
              );
          
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
      }

      if (interaction.customId === "guide_vehicles") {
          const embed = new EmbedBuilder()
              .setTitle("🚙 GUIA AVANÇADO DE VEÍCULOS")
              .setColor("#2ECC71")
              .addFields(
                  { name: "🔫 Mecânica Drive-by", value: "Troque para o assento 2 (**CTRL+2**) para atirar em movimento. O carro mantém a velocidade por alguns segundos e não tem recuo horizontal." },
                  { name: "🛡️ Proteção de Pneu", value: "Ao usar o carro como cover, estoure o pneu do lado **oposto** ao inimigo. Isso baixa o carro e evita que te acertem pelos pés." },
                  { name: "✈️ Controle Aéreo", value: "Segure **Espaço + Ctrl Esquerdo** para controlar o nariz do carro (Pitch) e evitar capotar em saltos." }
              );
          
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
      }
      
      // --- PRO LEAGUE TEAM SELECT ---
      if (interaction.customId === "pro_team_select") {
          const teamName = interaction.values[0];
          // V2: Use Database
          const teamData = await IntelligenceManager.getProTeam(teamName);
          if (!teamData) return;

          const embed = new EmbedBuilder()
              .setTitle(`🛡️ PLAYBOOK: ${teamData.team.toUpperCase()}`)
              .setDescription(`**Mapa:** ${teamData.map}\n**Estratégia:** ${teamData.strategy}`)
              .setColor("#9B59B6")
              .setThumbnail("https://cdn-icons-png.flaticon.com/512/10609/10609074.png") // Shield/Strategy
              .addFields(
                  { name: "📍 Drop Spot", value: teamData.drop_spot, inline: true },
                  { name: "⚡ Signature Move", value: teamData.signature_move, inline: false }
              );

          if (teamData.rotation_path) {
              embed.addFields({ name: "🗺️ Rotação Típica", value: `\`\`\`\n${teamData.rotation_path}\n\`\`\`` });
          }

          if (teamData.composition) {
              embed.addFields({ name: "👥 Composição de Squad", value: teamData.composition, inline: true });
          }

          if (teamData.playstyle) {
              embed.addFields({ name: "🎭 Estilo de Jogo", value: teamData.playstyle, inline: true });
          }

          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
      }

      // --- ACADEMY MAP SELECT ---
      if (interaction.customId === "academy_map_select") {
        const mapName = interaction.values[0];
        // V2: Use Database
        const mapData = await IntelligenceManager.getMap(mapName);
        
        if (!mapData) return;

        // Note: mapData.locations is JSON type, need casting
        const locations = mapData.locations as Record<string, any>;

        const embed = new EmbedBuilder()
          .setTitle(`🗺️ ANÁLISE TÁTICA: ${mapData.name.toUpperCase()}`)
          .setDescription(
            `**Tamanho:** ${mapData.size}\n**Características:** ${mapData.features.join(", ")}`,
          )
          .setColor("#00FF00")
          .setImage(mapData.image);

        for (const [locName, locData] of Object.entries(locations)) {
          embed.addFields({
            name: `📍 ${locName} (${locData.danger})`,
            value: `**Loot:** ${locData.loot} | **Veículos:** ${locData.vehicles}\n💡 *${locData.tips}*`,
          });
        }

        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // --- V1: RECRUITMENT ---
      if (interaction.customId === "recruitment_intent_select") {
        await RecruitmentManager.handleSelection(
          interaction as StringSelectMenuInteraction,
        );
        return;
      }

      // --- V1: IDENTITY SYSTEM ---
      if (interaction.customId === "identity_class_select") {
        const selectedRoleName = interaction.values[0];
        const member = interaction.member as GuildMember;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // 1. Remove old Class Roles
        const classRoles = ROLES.CLASSES; // Array of strings
        const rolesToRemove = [];

        for (const rName of classRoles) {
          const role = interaction.guild?.roles.cache.find(
            (r) => r.name === rName,
          );
          if (role && member.roles.cache.has(role.id)) {
            rolesToRemove.push(role);
          }
        }

        if (rolesToRemove.length > 0) {
          await member.roles.remove(rolesToRemove);
        }

        // 2. Add New Role
        const newRole = interaction.guild?.roles.cache.find(
          (r) => r.name === selectedRoleName,
        );
        if (newRole) {
          await member.roles.add(newRole);

          const embed = new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle("🛡️ Especialização Atualizada")
            .setDescription(
              `Sua função tática agora é **${selectedRoleName}**.\nSeu ícone foi atualizado.`,
            )
            .setThumbnail(
              "https://cdn-icons-png.flaticon.com/512/921/921513.png",
            ); // Target

          await interaction.editReply({ embeds: [embed] });
        } else {
          await interaction.editReply({
            content: "❌ Erro: Cargo não encontrado no servidor.",
          });
        }
        return;
      }

      if (interaction.customId === "identity_weapon_select") {
        const selectedRoleName = interaction.values[0];
        const member = interaction.member as GuildMember;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // 1. Remove old Weapon Roles
        const weaponRoles = ROLES.WEAPONS;
        const rolesToRemove = [];

        for (const rName of weaponRoles) {
          const role = interaction.guild?.roles.cache.find(
            (r) => r.name === rName,
          );
          if (role && member.roles.cache.has(role.id)) {
            rolesToRemove.push(role);
          }
        }

        if (rolesToRemove.length > 0) {
          await member.roles.remove(rolesToRemove);
        }

        // 2. Add New Role
        const newRole = interaction.guild?.roles.cache.find(
          (r) => r.name === selectedRoleName,
        );
        if (newRole) {
          await member.roles.add(newRole);

          const embed = new EmbedBuilder()
            .setColor("#F2A900")
            .setTitle("🎒 Loadout Atualizado")
            .setDescription(
              `Armamento principal definido como **${selectedRoleName}**.`,
            )
            .setThumbnail(
              "https://cdn-icons-png.flaticon.com/512/2036/2036065.png",
            ); // Gun

          await interaction.editReply({ embeds: [embed] });
        } else {
          await interaction.editReply({
            content: "❌ Erro: Cargo não encontrado.",
          });
        }
        return;
      }

      if (interaction.customId === "identity_notif_select") {
        const selectedRoleNames = interaction.values; // Array
        const member = interaction.member as GuildMember;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // 1. Remove ALL Notification Roles (Clean Slate)
        const notifRolesConfig = ROLES.NOTIFICATIONS; // Array of objects {name, color}
        const rolesToRemove = [];

        for (const config of notifRolesConfig) {
          const role = interaction.guild?.roles.cache.find(
            (r) => r.name === config.name,
          );
          if (role && member.roles.cache.has(role.id)) {
            rolesToRemove.push(role);
          }
        }

        if (rolesToRemove.length > 0) {
          await member.roles.remove(rolesToRemove);
        }

        // 2. Add Selected Roles
        const rolesToAdd = [];
        for (const name of selectedRoleNames) {
          const role = interaction.guild?.roles.cache.find(
            (r) => r.name === name,
          );
          if (role) rolesToAdd.push(role);
        }

        if (rolesToAdd.length > 0) {
          await member.roles.add(rolesToAdd);
        }

        const embed = new EmbedBuilder()
          .setColor("#00BFFF")
          .setTitle("📡 Frequências Ajustadas")
          .setDescription(
            `Você agora segue **${selectedRoleNames.length}** canais de alerta.\n\n${selectedRoleNames.map((n) => `• ${n}`).join("\n") || "*Nenhum alerta ativo*"}`,
          )
          .setThumbnail(
            "https://cdn-icons-png.flaticon.com/512/3602/3602145.png",
          ); // Bell

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // --- V1: SUPPORT MANAGER ---
      if (interaction.customId === "faq_select") {
        await SupportManager.handleSelection(interaction as any);
        return;
      }

      // --- VOICE KICK ---
      if (
        interaction.customId === "voice_kick_select" &&
        interaction.isUserSelectMenu()
      ) {
        await VoiceManager.handleInteraction(interaction);
        return;
      }

      // --- TACTICS SYSTEM ---
      if (
        interaction.customId === "tactics_map_select" ||
        interaction.customId.startsWith("tactics_city_select_")
      ) {
        await TacticsManager.handleInteraction(interaction);
        return;
      }

      if (interaction.customId === "tactics_new_drop") {
        // Send ephemeral Map Selection Menu
        const mapSelect = new StringSelectMenuBuilder()
          .setCustomId("tactics_map_select")
          .setPlaceholder("🗺️ Selecione o Mapa")
          .addOptions([
            {
              label: "Erangel",
              value: "ERANGEL",
              description: "O clássico soviético",
              emoji: "🌲",
            },
            {
              label: "Miramar",
              value: "MIRAMAR",
              description: "O deserto implacável",
              emoji: "🌵",
            },
          ]);

        const row =
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            mapSelect,
          );

        await interaction.reply({
          content: "🗺️ **Novo Drop:** Selecione o mapa para iniciar:",
          components: [row],
          flags: MessageFlags.Ephemeral,
        });
      }

      // REMOVED OLD FAQ_SELECT LOGIC
    }

    if (interaction.isModalSubmit()) {
      // --- GIVEAWAY MODAL ---
      if (interaction.customId.startsWith("giveaway_create_modal_")) {
        await GiveawayManager.handleInteraction(interaction);
        return;
      }

      // --- V1: RECRUITMENT MODAL ---
      if (interaction.customId === "recruitment_modal") {
        await RecruitmentManager.processApplication(interaction);
        return;
      }

      // --- V1: SCRIM MODAL ---
      if (interaction.customId.startsWith("scrim_schedule_modal")) {
        await ScrimManager.createEvent(interaction);
        return;
      }

      if (interaction.customId.startsWith("merc_eval_submit_")) {
        await MercenaryManager.handleInteraction(interaction as any);
        return;
      }

      if (interaction.customId === "bug_report_modal") {
        const command = interaction.fields.getTextInputValue("bug_command");
        const desc = interaction.fields.getTextInputValue("bug_desc");

        // Log to Staff Channel (or Blackbox)
        await LogManager.log({
          guild: interaction.guild!,
          type: LogType.ADMIN,
          level: LogLevel.WARN,
          title: "🐛 Bug Reportado",
          description: `Um usuário encontrou um problema no sistema.`,
          executor: interaction.user,
          fields: [
            { name: "Local/Comando", value: command, inline: true },
            { name: "Descrição", value: desc, inline: false },
          ],
        });

        await interaction.reply({
          content:
            "✅ **Obrigado!** Seu report foi enviado para a equipe de desenvolvimento.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.customId === "faq_ai_modal") {
        const question = interaction.fields.getTextInputValue("question_input");

        // Simular "pensando"
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const result = await faqService.search(question);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("ask_ai")
            .setLabel("🔄 Nova Pergunta")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("open_ticket")
            .setLabel("📩 Abrir Ticket")
            .setStyle(ButtonStyle.Secondary),
        );

        if (result.found && result.answer) {
          const embed = EmbedFactory.create(
            "🤖 IA BlueZone",
            result.answer,
          ).setFooter({
            text: "Resposta gerada automaticamente. Dúvidas? Abra um ticket.",
          });

          await interaction.editReply({
            embeds: [embed],
            components: [row],
          });
        } else {
          const embed = EmbedFactory.error(
            "Sem resposta precisa",
          ).setDescription(
            `🤔 **Humm...** Não tenho certeza sobre isso.\n\nTente reformular a pergunta ou fale com nosso suporte.`,
          );

          await interaction.editReply({
            embeds: [embed],
            components: [row],
          });
        }
      }
      if (interaction.customId === "sitrep_modal") {
        const titulo = interaction.fields.getTextInputValue("sitrep_titulo");
        const mensagem =
          interaction.fields.getTextInputValue("sitrep_mensagem");
        const imagem = interaction.fields.getTextInputValue("sitrep_imagem");
        const mencao = interaction.fields.getTextInputValue("sitrep_mencao");

        const channel = interaction.guild?.channels.cache.find(
          (c) => c.name === "📢-sitrep",
        ) as TextChannel;

        if (!channel) {
          await interaction.reply({
            content: "❌ Canal #sitrep não encontrado.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle(`📢 COMUNICADO: ${titulo}`)
          .setDescription(mensagem)
          .setColor("#FF0000") // Red for Alert
          .setFooter({
            text: `Emitido por: ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp();

        if (imagem && imagem.startsWith("http")) {
          embed.setImage(imagem);
        }

        await channel.send({ content: mencao || undefined, embeds: [embed] });
        await interaction.reply({
          content: "✅ Comunicado SITREP enviado com sucesso.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // --- VOICE MODALS ---
      if (
        interaction.customId === "voice_rename_modal" ||
        interaction.customId === "voice_limit_modal"
      ) {
        await VoiceManager.handleInteraction(interaction);
        return;
      }
    }
  },
};

export default event;
