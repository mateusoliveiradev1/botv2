import { Events, Interaction, TextChannel, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, GuildMember, StringSelectMenuBuilder, PermissionFlagsBits, UserSelectMenuBuilder } from 'discord.js';
import { BotEvent } from '../types';
import { faqService } from '../services/faq';
import logger from '../core/logger';
import { TicketManager } from '../modules/tickets/manager';
import { LogManager, LogType, LogLevel } from '../modules/logger/LogManager';
import { EmbedFactory } from '../utils/embeds';
import { LovableService } from '../services/lovable';
import { MissionManager } from '../modules/missions/manager';
import { TacticsManager } from '../modules/tactics/manager';
import { MAPS } from '../modules/tactics/maps';
import { STRATEGIES } from '../modules/tactics/strategies';
import { TimerManager } from '../modules/tactics/timer';
import { ROLES } from '../modules/setup/constants';
import { VoiceManager } from '../modules/voice/manager'; // Added Import

// V1 Managers
import { OnboardingManager } from '../modules/onboarding/manager';
import { RecruitmentManager } from '../modules/recruitment/manager';
import { ProfileManager } from '../modules/profile/manager';
import { ScrimManager } from '../modules/scrims/manager';
import { SupportManager } from '../modules/support/manager';

import { MercenaryManager } from '../modules/mercenary/manager';

const event: BotEvent = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
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
            await interaction.followUp({ content: 'Erro ao executar comando!', flags: MessageFlags.Ephemeral });
          } else {
            await interaction.reply({ content: 'Erro ao executar comando!', flags: MessageFlags.Ephemeral });
          }
        } catch (e) {
          // Ignorar se não der pra responder
        }
      }
    }

    // 2. Buttons
    if (interaction.isButton()) {
      try {
        // --- V1: ONBOARDING ---
        if (interaction.customId === 'onboarding_start') {
            await OnboardingManager.startTutorial(interaction);
            return;
        }
        if (interaction.customId.startsWith('onboarding_step_') || interaction.customId === 'onboarding_finish') {
            await OnboardingManager.handleStep(interaction);
            return;
        }

        // --- V1: RECRUITMENT ---
        if (interaction.customId === 'recruitment_start') {
            await RecruitmentManager.showForm(interaction);
            return;
        }
        if (interaction.customId.startsWith('recruit_approve_') || interaction.customId.startsWith('recruit_reject_')) {
            await RecruitmentManager.handleDecision(interaction);
            return;
        }

        // --- V1: PROFILE ---
        if (interaction.customId === 'view_profile_badge') {
            await ProfileManager.showCard(interaction);
            return;
        }

        // --- V1: SCRIMS ---
        if (interaction.customId === 'scrim_schedule') {
            await ScrimManager.showScheduler(interaction);
            return;
        }
        if (interaction.customId === 'scrim_join' || interaction.customId === 'scrim_leave') {
            await ScrimManager.handlePresence(interaction);
            return;
        }
        if (interaction.customId === 'scrim_sos') {
            await ScrimManager.handleSOS(interaction);
            return;
        }

        if (interaction.customId === 'scrim_apply_merc') {
            // Check if user has Mercenary Role
            const role = interaction.guild?.roles.cache.find(r => r.name === '⛑️ Mercenário');
            const member = interaction.member as GuildMember;
            if (role && !member.roles.cache.has(role.id)) {
                await interaction.reply({ content: '⚠️ **Atenção:** Você precisa se alistar como Mercenário no canal <#ID_MERC_CHANNEL> primeiro.', flags: MessageFlags.Ephemeral });
                return;
            }

            // Determine Target Clan from Channel
            const channel = interaction.channel as TextChannel;
            let target = 'Unknown';
            if (channel.name.includes('hawk')) target = 'Hawk-Esports';
            else if (channel.name.includes('mira')) target = 'Mira-Ruim';

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

        if (interaction.customId.startsWith('scrim_apply_merc') || 
            interaction.customId.startsWith('merc_') || 
            interaction.customId.startsWith('open_merc_eval_') || 
            interaction.customId === 'mercenary_join' || 
            interaction.customId === 'mercenary_leave') {
             await MercenaryManager.handleInteraction(interaction as any);
             return;
        }

        // --- VOICE CONTROLS ---
        if (interaction.customId.startsWith('voice_')) {
            await VoiceManager.handleInteraction(interaction);
            return;
        }

        // --- TACTICS SYSTEM ---
        if (interaction.customId.startsWith('tactics_')) {
            await TacticsManager.handleInteraction(interaction);
            return;
        }

        // --- V1: MISSIONS ---
        if (interaction.customId === 'check_mission_progress' || interaction.customId === 'refresh_mission_progress') {
             await MissionManager.handleInteraction(interaction);
             return;
        }

        // --- SUPPORT / FAQ ---
        // Moved to SupportManager in Select Menu section, keeping buttons here if needed
        // 'ask_ai' is handled below in Modal or generic button


        if (interaction.customId === 'report_bug') {
            const modal = new ModalBuilder()
                .setCustomId('bug_report_modal')
                .setTitle('🐛 Reportar Bug');

            const commandInput = new TextInputBuilder()
                .setCustomId('bug_command')
                .setLabel("Onde ocorreu o erro?")
                .setPlaceholder("Ex: Comando /ranking ou Botão de Ticket")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const descInput = new TextInputBuilder()
                .setCustomId('bug_desc')
                .setLabel("Descrição do Problema")
                .setPlaceholder("Explique o que aconteceu...")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(commandInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(descInput)
            );

            await interaction.showModal(modal);
        }

        // --- V1: TICKETS ---
        if (interaction.customId === 'open_ticket' || interaction.customId === 'claim_ticket' || interaction.customId === 'close_ticket') {
             await TicketManager.handleInteraction(interaction);
             return;
        }
        
        if (interaction.customId === 'link_account') {
          // Redireciona para o comando /vincular logic
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          const response = await LovableService.generateLoginLink(interaction.user.id, interaction.user.username);

          if (response.success && response.data) {
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setLabel('Acessar Terminal Seguro')
                .setStyle(ButtonStyle.Link)
                .setURL(response.data.login_url)
            );

            const embed = new EmbedBuilder()
                .setTitle('🔐 Link de Acesso Gerado')
                .setDescription('Clique no botão abaixo para autenticar sua conta no sistema central.\nEste link expira em 10 minutos.')
                .setColor('#0099FF');

            await interaction.editReply({ 
              embeds: [embed],
              components: [row]
            });
          } else {
            await interaction.editReply({ embeds: [EmbedFactory.error('Falha na geração de credenciais.')] });
          }
        }

        if (interaction.customId === 'accept_rules') {
          const role = interaction.guild?.roles.cache.find(r => r.name === '🪖 Cabo');
          const visitorRole = interaction.guild?.roles.cache.find(r => r.name === '🏳️ Recruta');
          const member = await interaction.guild?.members.fetch(interaction.user.id);
          
          if (role && member) {
            if (member.roles.cache.has(role.id)) {
                const embed = new EmbedBuilder()
                    .setTitle('ℹ️ Status de Serviço')
                    .setDescription('Você já consta como alistado no banco de dados.')
                    .setColor('#FFFF00');
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            } else {
                try {
                    await member.roles.add(role);
                    // Remove Visitor Role if exists
                    if (visitorRole && member.roles.cache.has(visitorRole.id)) {
                        await member.roles.remove(visitorRole);
                    }

                    const embed = new EmbedBuilder()
                        .setTitle('🪖 Alistamento Confirmado')
                        .setDescription('Bem-vindo à força tarefa, Soldado. Verifique os canais de patentes.')
                        .setColor('#00FF00');
                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                } catch (error: any) {
                    logger.error(error, 'Erro ao adicionar cargo de alistamento');
                    await interaction.reply({ 
                        content: '❌ Erro de Permissão: Não consegui te dar o cargo. Peça a um admin para verificar se meu cargo está acima do cargo "🪖 Cabo".', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            }
          } else {
             logger.warn('Role "🪖 Cabo" not found or member not found.');
             await interaction.reply({ content: '❌ Erro de Configuração: Cargo "🪖 Cabo" não encontrado.', flags: MessageFlags.Ephemeral });
          }
        }

        // --- ROLE TOGGLE (Arsenal) ---
        if (interaction.customId.startsWith('role_')) {
          const roleName = interaction.customId.replace('role_', '');
          const role = interaction.guild?.roles.cache.find(r => r.name.includes(roleName));
          const member = await interaction.guild?.members.fetch(interaction.user.id);

          if (!role || !member) {
             await interaction.reply({ content: '❌ Erro: Cargo não encontrado no sistema.', flags: MessageFlags.Ephemeral });
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
                fields: [{ name: "Item Removido", value: role.name, inline: true }]
             });

             await interaction.reply({ 
                content: `➖ **${role.name}** removido do seu arsenal.`, 
                flags: MessageFlags.Ephemeral 
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
                fields: [{ name: "Item Adicionado", value: role.name, inline: true }]
             });

             await interaction.reply({ 
                content: `➕ **${role.name}** equipado com sucesso.`, 
                flags: MessageFlags.Ephemeral 
             });
          }
        }

        if (interaction.customId.startsWith('lineup_')) {
          await interaction.deferUpdate(); // Acknowledge button click without sending new message

          const action = interaction.customId.replace('lineup_', ''); // join, bench, leave
          const member = interaction.member as GuildMember;
          const userTag = member.displayName; // Use Display Name (Nickname)
          
          const embed = interaction.message.embeds[0];
          if (!embed) return;

          // Helper to clean list
          const cleanList = (text: string) => {
             return text.replace('*Nenhum operador confirmado*', '')
                        .replace('*Nenhum reserva disponível*', '')
                        .replace('*Nenhuma baixa reportada*', '')
                        .split('\n')
                        .filter(l => l.trim().length > 0 && !l.includes(userTag)); // Remove user from all lists first
          };

          // Get current lists
          const confirmed = cleanList(embed.fields[0].value);
          const bench = cleanList(embed.fields[1].value);
          const absent = cleanList(embed.fields[2].value);

          // Add user to target list
          if (action === 'join') confirmed.push(`• ${userTag}`);
          if (action === 'bench') bench.push(`• ${userTag}`);
          if (action === 'leave') absent.push(`• ${userTag}`);

          // Format for display
          const format = (list: string[]) => list.length > 0 ? list.join('\n') : (
              action === 'join' && list === confirmed ? '*Nenhum operador confirmado*' :
              action === 'bench' && list === bench ? '*Nenhum reserva disponível*' :
              '*Nenhuma baixa reportada*'
          );

          // Rebuild Embed
          const newEmbed = EmbedBuilder.from(embed).setFields(
              { name: `✅ Titulares Confirmados (${confirmed.length})`, value: format(confirmed) || '*Vazio*', inline: true },
              { name: `🔄 Reservas (Banco) (${bench.length})`, value: format(bench) || '*Vazio*', inline: true },
              { name: `❌ Baixas (Ausentes) (${absent.length})`, value: format(absent) || '*Vazio*', inline: true }
          );

          await interaction.message.edit({ embeds: [newEmbed] });
        }

        // Removed old profile badge logic as it is now handled by ProfileManager
        // if (interaction.customId === 'view_profile_badge') { ... } 


        if (interaction.customId === 'ask_ai') {
        const modal = new ModalBuilder()
            .setCustomId('faq_ai_modal')
            .setTitle('🤖 Perguntar à IA');

        const questionInput = new TextInputBuilder()
            .setCustomId('question_input')
            .setLabel("Qual a sua dúvida?")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Ex: Como vejo minhas métricas? ou Quantos pontos ganha por vitória?")
            .setRequired(true)
            .setMaxLength(300);

        const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(questionInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
    }
      } catch (error: any) {
        // Handle "Unknown interaction" specifically to avoid crashing or loud errors
        if (error.code === 10062) {
          logger.warn(`⚠️ Unknown interaction in button handler: ${interaction.customId}`);
        } else {
          logger.error(error, `Error handling button ${interaction.customId}`);
        }
      }
    }

    // 3. Select Menus (FAQ and Voice)
    if (interaction.isStringSelectMenu() || interaction.isUserSelectMenu()) {
      // --- V1: SUPPORT MANAGER ---
      if (interaction.customId === 'faq_select') {
          await SupportManager.handleSelection(interaction as any);
          return;
      }

      // --- VOICE KICK ---
      if (interaction.customId === 'voice_kick_select' && interaction.isUserSelectMenu()) {
          await VoiceManager.handleInteraction(interaction);
          return;
      }

      // --- TACTICS SYSTEM ---
      if (interaction.customId === 'tactics_map_select' || interaction.customId.startsWith('tactics_city_select_')) {
          await TacticsManager.handleInteraction(interaction);
          return;
      }

      if (interaction.customId === 'tactics_new_drop') {
          // Send ephemeral Map Selection Menu
          const mapSelect = new StringSelectMenuBuilder()
              .setCustomId("tactics_map_select")
              .setPlaceholder("🗺️ Selecione o Mapa")
              .addOptions([
                  { label: "Erangel", value: "ERANGEL", description: "O clássico soviético", emoji: "🌲" },
                  { label: "Miramar", value: "MIRAMAR", description: "O deserto implacável", emoji: "🌵" }
              ]);

          const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(mapSelect);

          await interaction.reply({ 
              content: "🗺️ **Novo Drop:** Selecione o mapa para iniciar:",
              components: [row],
              flags: MessageFlags.Ephemeral
          });
      }

      // REMOVED OLD FAQ_SELECT LOGIC
    }

    if (interaction.isModalSubmit()) {
      // --- V1: RECRUITMENT MODAL ---
      if (interaction.customId === 'recruitment_modal') {
          await RecruitmentManager.processApplication(interaction);
          return;
      }

      // --- V1: SCRIM MODAL ---
      if (interaction.customId.startsWith('scrim_schedule_modal')) {
          await ScrimManager.createEvent(interaction);
          return;
      }

      if (interaction.customId.startsWith('merc_eval_submit_')) {
          await MercenaryManager.handleInteraction(interaction as any);
          return;
      }

      if (interaction.customId === 'bug_report_modal') {
        const command = interaction.fields.getTextInputValue('bug_command');
        const desc = interaction.fields.getTextInputValue('bug_desc');

        // Log to Staff Channel (or Blackbox)
        await LogManager.log({
            guild: interaction.guild!,
            type: LogType.ADMIN,
            level: LogLevel.WARN,
            title: '🐛 Bug Reportado',
            description: `Um usuário encontrou um problema no sistema.`,
            executor: interaction.user,
            fields: [
                { name: 'Local/Comando', value: command, inline: true },
                { name: 'Descrição', value: desc, inline: false }
            ]
        });

        await interaction.reply({ 
            content: '✅ **Obrigado!** Seu report foi enviado para a equipe de desenvolvimento.', 
            flags: MessageFlags.Ephemeral 
        });
      }
      
      if (interaction.customId === 'faq_ai_modal') {
        const question = interaction.fields.getTextInputValue('question_input');
        
        // Simular "pensando"
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const result = await faqService.search(question);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('ask_ai')
                .setLabel('🔄 Nova Pergunta')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('open_ticket')
                .setLabel('📩 Abrir Ticket')
                .setStyle(ButtonStyle.Secondary)
        );

        if (result.found && result.answer) {
            const embed = EmbedFactory.create('🤖 IA BlueZone', result.answer)
                .setFooter({ text: 'Resposta gerada automaticamente. Dúvidas? Abra um ticket.' });

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
        } else {
            const embed = EmbedFactory.error('Sem resposta precisa')
                .setDescription(`🤔 **Humm...** Não tenho certeza sobre isso.\n\nTente reformular a pergunta ou fale com nosso suporte.`);

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
        }
      }
      if (interaction.customId === 'sitrep_modal') {
        const titulo = interaction.fields.getTextInputValue('sitrep_titulo');
        const mensagem = interaction.fields.getTextInputValue('sitrep_mensagem');
        const imagem = interaction.fields.getTextInputValue('sitrep_imagem');
        const mencao = interaction.fields.getTextInputValue('sitrep_mencao');

        const channel = interaction.guild?.channels.cache.find(c => c.name === '📢-sitrep') as TextChannel;

        if (!channel) {
            await interaction.reply({ content: '❌ Canal #sitrep não encontrado.', flags: MessageFlags.Ephemeral });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`📢 COMUNICADO: ${titulo}`)
            .setDescription(mensagem)
            .setColor('#FF0000') // Red for Alert
            .setFooter({ text: `Emitido por: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        if (imagem && imagem.startsWith('http')) {
            embed.setImage(imagem);
        }

        await channel.send({ content: mencao || undefined, embeds: [embed] });
        await interaction.reply({ content: '✅ Comunicado SITREP enviado com sucesso.', flags: MessageFlags.Ephemeral });
      }

      // --- VOICE MODALS ---
      if (interaction.customId === 'voice_rename_modal' || interaction.customId === 'voice_limit_modal') {
          await VoiceManager.handleInteraction(interaction);
          return;
      }
    }
  },
};

export default event;
