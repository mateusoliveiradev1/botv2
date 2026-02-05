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
        // --- VOICE CONTROLS ---
        if (interaction.customId.startsWith('voice_')) {
            const member = interaction.member as GuildMember;
            // Check if member is in a voice channel
            if (!member.voice.channel) {
                await interaction.reply({ content: '❌ Você precisa estar em um canal de voz.', flags: MessageFlags.Ephemeral });
                return;
            }

            // Check if member OWNS the channel (has ManageChannel permission)
            // Or if it's their "Squad de [Name]"
            const channel = member.voice.channel;
            const isOwner = channel.permissionsFor(member).has(PermissionFlagsBits.ManageChannels);

            if (!isOwner) {
                await interaction.reply({ content: '⛔ Você não tem permissão para gerenciar esta sala.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (interaction.customId === 'voice_lock') {
                await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: false });
                await interaction.reply({ content: '🔒 **Sala Trancada!** Ninguém mais pode entrar.', flags: MessageFlags.Ephemeral });
            }

            if (interaction.customId === 'voice_unlock') {
                await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: true });
                await interaction.reply({ content: '🔓 **Sala Destrancada!** Entrada liberada.', flags: MessageFlags.Ephemeral });
            }

            if (interaction.customId === 'voice_rename') {
                const modal = new ModalBuilder()
                    .setCustomId('voice_rename_modal')
                    .setTitle('✏️ Renomear Sala');

                const nameInput = new TextInputBuilder()
                    .setCustomId('voice_name_input')
                    .setLabel("Novo Nome")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder(`Squad de ${member.displayName}`)
                    .setMaxLength(30)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput));
                await interaction.showModal(modal);
            }

            if (interaction.customId === 'voice_limit') {
                const modal = new ModalBuilder()
                    .setCustomId('voice_limit_modal')
                    .setTitle('👥 Limite de Usuários');

                const limitInput = new TextInputBuilder()
                    .setCustomId('voice_limit_input')
                    .setLabel("Número (0 = Sem limite)")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("Ex: 4")
                    .setMaxLength(2)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput));
                await interaction.showModal(modal);
            }

            if (interaction.customId === 'voice_kick') {
                const userSelect = new UserSelectMenuBuilder()
                    .setCustomId('voice_kick_select')
                    .setPlaceholder('Selecione quem você quer expulsar')
                    .setMaxValues(1);

                const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);
                
                await interaction.reply({ 
                    content: '🚫 **Selecione o usuário para expulsar da sala:**',
                    components: [row],
                    flags: MessageFlags.Ephemeral 
                });
            }
            return;
        }

        if (interaction.customId === 'tactics_strategy') {
            const strategy = STRATEGIES[Math.floor(Math.random() * STRATEGIES.length)];
            
            // Get original embed
            const originalEmbed = interaction.message.embeds[0];
            if (originalEmbed) {
                const newEmbed = EmbedBuilder.from(originalEmbed);
                
                // Add or Update Strategy Field
                // We check if it already has a strategy field to update it, or add new
                const fields = newEmbed.data.fields || [];
                const strategyFieldIndex = fields.findIndex(f => f.name.includes('ESTRATÉGIA'));
                
                const strategyField = { 
                    name: `${strategy.icon} ESTRATÉGIA: ${strategy.name}`, 
                    value: strategy.description, 
                    inline: false 
                };

                if (strategyFieldIndex >= 0) {
                    fields[strategyFieldIndex] = strategyField;
                } else {
                    fields.push(strategyField);
                }

                newEmbed.setFields(fields);
                // Update border color to match strategy
                newEmbed.setColor(strategy.color as any);

                await interaction.update({ embeds: [newEmbed] });
            } else {
                await interaction.reply({ content: '❌ Erro: Embed original não encontrado.', flags: MessageFlags.Ephemeral });
            }
        }

        if (interaction.customId === 'tactics_timer') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // Defer first
            
            const channel = interaction.channel;
            if (channel && channel.isTextBased()) {
                await TimerManager.startMatch(channel as TextChannel);
                await interaction.editReply({ content: "⏱️ **TIMER ATIVADO!**\nA partida começou. Boa sorte, operadores!" });
            } else {
                await interaction.editReply({ content: "❌ Erro: Canal inválido para timer." });
            }
        }

        // Mission Interaction: Check Progress (New) or Refresh (Update)
        if (interaction.customId === 'check_mission_progress' || interaction.customId === 'refresh_mission_progress') {
            
            // If it's a refresh, we use update(), if it's new check, we use deferReply()
            if (interaction.customId === 'refresh_mission_progress') {
                 await interaction.deferUpdate();
            } else {
                 await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            }
            
            // Auto Claim logic
            const claimed = await MissionManager.claimRewards(interaction.member as GuildMember);
            const embed = await MissionManager.getProgressEmbed(interaction.member as GuildMember);
            
            // Refresh Button
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('refresh_mission_progress')
                    .setLabel('🔄 Atualizar')
                    .setStyle(ButtonStyle.Secondary)
            );

            const payload = { 
                embeds: [embed], 
                components: [row],
                content: claimed.length > 0 
                    ? `🎉 **PARABÉNS!** Você resgatou recompensa(s):\n${claimed.map(c => `• ${c}`).join('\n')}`
                    : undefined
            };

            // If refresh, we edit the original message (which is what deferUpdate allows via editReply usually, or we just editReply)
            // deferUpdate() means we acknowledge the button click but don't send a new message immediately, 
            // allowing us to edit the message the button was on.
            await interaction.editReply(payload);
            return;
        }

        if (interaction.customId === 'human_support') {
            const supportChannel = interaction.guild?.channels.cache.find(c => c.name.includes('suporte'));
            if (supportChannel) {
                await interaction.reply({ 
                    content: `👋 Olá! Nosso time está pronto para te ajudar.\n👉 Clique aqui para ir ao canal de suporte: ${supportChannel}`, 
                    flags: MessageFlags.Ephemeral 
                });
            } else {
                await interaction.reply({ 
                    content: `❌ Canal de suporte não encontrado. Por favor, contate um administrador.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }

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

        if (interaction.customId === 'open_ticket') {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const channel = await TicketManager.createTicket(interaction.guild!, interaction.user);
          
          const embed = new EmbedBuilder()
            .setTitle('✅ Operação Inicializada')
            .setDescription(`Canal de comunicação seguro estabelecido em ${channel}.`)
            .setColor('#00FF00');

          await interaction.editReply({ embeds: [embed] });
        }

        if (interaction.customId === 'claim_ticket') {
          // Check Permissions (Staff/Admin)
          const isStaff = (interaction.member as GuildMember).roles.cache.some(r => ROLES.STAFF.some(s => s.name === r.name));
          
          if (!interaction.memberPermissions?.has('Administrator') && !isStaff) {
             const embed = new EmbedBuilder()
                .setTitle('⛔ Acesso Negado')
                .setDescription('Apenas oficiais autorizados podem assumir chamados.')
                .setColor('#FF0000');
             await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
             return;
          }

          // Update Embed
          const oldEmbed = interaction.message.embeds[0];
          const newEmbed = EmbedBuilder.from(oldEmbed)
            .setColor('#00FF00') // Green
            .spliceFields(1, 1, { name: '📋 Status', value: `🟢 Em Atendimento por ${interaction.user}`, inline: true });

          // Disable Claim Button
          const oldRow = interaction.message.components[0];
          // Rebuild manually to avoid type issues with .from() on complex components
          const newRow = new ActionRowBuilder<ButtonBuilder>();
          
          // Force cast to any to access components safely as we know it's an ActionRow
          (oldRow as any).components.forEach((comp: any) => {
              const builder = ButtonBuilder.from(comp);
              if (comp.customId === 'claim_ticket') {
                  builder.setDisabled(true).setLabel(`Assumido por ${interaction.user.username}`);
              }
              newRow.addComponents(builder);
          });

          await interaction.message.edit({ embeds: [newEmbed], components: [newRow] });
          await interaction.reply({ content: `👮‍♂️ **${interaction.user}** assumiu a responsabilidade por este chamado.` });
        }

        if (interaction.customId === 'close_ticket') {
          // Check Permissions (Only Staff or Ticket Opener can close?)
          // For now, anyone in the channel (Staff or User) can close
          
          const embed = new EmbedBuilder()
            .setTitle('⚠️ Encerrando Atendimento')
            .setDescription('**O ticket foi marcado para fechamento.**\n\n🗑️ Este canal será excluído automaticamente em **5 segundos**.\n📄 Um registro desta conversa será salvo nos arquivos da Staff.')
            .setColor('#FFA500') // Orange Warning
            .setFooter({ text: `Ação solicitada por: ${interaction.user.tag}` });
          
          await interaction.reply({ embeds: [embed] });
          
          // Disable button to prevent double clicks
          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechando...').setStyle(ButtonStyle.Danger).setDisabled(true)
          );
          
          try {
             await interaction.message.edit({ components: [row] });
          } catch (e) { /* Ignore if message deleted */ }

          // 5 Second Delay
          setTimeout(async () => {
             if (interaction.channel) {
                await TicketManager.closeTicket(interaction.channel as TextChannel, interaction.user);
             }
          }, 5000);
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
            }
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
             await interaction.reply({ 
                content: `➖ **${role.name}** removido do seu arsenal.`, 
                flags: MessageFlags.Ephemeral 
             });
          } else {
             await member.roles.add(role);
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
          let confirmed = cleanList(embed.fields[0].value);
          let bench = cleanList(embed.fields[1].value);
          let absent = cleanList(embed.fields[2].value);

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

        if (interaction.customId === 'view_profile_badge') {
            const member = interaction.member as GuildMember;
            const roles = member.roles.cache;
            
            // Get notable roles
            // 1. Military Rank (Staff or Base)
            const staffRoles = ROLES.STAFF.map(r => r.name);
            const baseRoles = ROLES.BASE.map(r => r.name);
            
            // Priority Order: General -> Coronel -> Capitão -> Sargento -> Cabo -> Recruta
            // We search in the predefined order to find the highest rank the user has.
            let militaryRank = 'Recruta';
            
            for (const roleName of [...staffRoles, ...baseRoles]) {
                if (roles.some(r => r.name === roleName)) {
                    militaryRank = roleName;
                    break; // Found highest priority
                }
            }

            // 2. Competitive Rank (Elo)
            // Try to fetch from API first for real-time data
            let compRank = 'Unranked';
            
            try {
                // We use getStats to fetch the current_rank from API
                const stats = await LovableService.getStats(member.id);
                if (stats.success && stats.data && stats.data.current_rank) {
                    compRank = stats.data.current_rank;
                } else {
                    // Fallback to Discord Roles if API fails or user not linked
                    compRank = roles.find(r => ROLES.RANKS.some(rk => rk.name.includes(r.name)))?.name || 'Unranked';
                    
                    // Clean up role name (remove emojis if needed, but usually we keep them for style)
                    // If the role is "🥇 Gold", we keep it.
                }
            } catch (e) {
                // Fallback to Discord Roles on error
                compRank = roles.find(r => ROLES.RANKS.some(rk => rk.name.includes(r.name)))?.name || 'Unranked';
            }

            const classes = roles.filter(r => ROLES.CLASSES.includes(r.name)).map(r => r.name).join(', ') || 'Nenhuma';
            const weapons = roles.filter(r => ROLES.WEAPONS.includes(r.name)).map(r => r.name).join(', ') || 'Nenhuma';
            
            const embed = new EmbedBuilder()
                .setTitle(`💳 IDENTIDADE OPERACIONAL`)
                .setColor(member.displayHexColor)
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: '👤 Operador', value: member.displayName, inline: true },
                    { name: '🎖️ Patente', value: militaryRank, inline: true },
                    { name: '🏆 Elo', value: compRank, inline: true },
                    { name: '📅 Alistamento', value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:d>`, inline: true },
                    { name: '🛡️ Especialização', value: classes, inline: false },
                    { name: '🎒 Armamento', value: weapons, inline: false }
                )
                .setFooter({ text: `ID: ${member.id}` });

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

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
      // --- VOICE KICK ---
      if (interaction.customId === 'voice_kick_select' && interaction.isUserSelectMenu()) {
          const targetUserId = interaction.values[0];
          const member = interaction.member as GuildMember;
          
          if (!member.voice.channel) {
              await interaction.reply({ content: '❌ Você não está em um canal de voz.', flags: MessageFlags.Ephemeral });
              return;
          }

          // Check permissions again just to be safe
          if (!member.voice.channel.permissionsFor(member).has(PermissionFlagsBits.ManageChannels)) {
              await interaction.reply({ content: '⛔ Sem permissão.', flags: MessageFlags.Ephemeral });
              return;
          }

          const targetMember = await interaction.guild?.members.fetch(targetUserId);
          if (!targetMember) return;

          // Check if target is in the same channel
          if (targetMember.voice.channelId !== member.voice.channelId) {
              await interaction.reply({ content: '❌ Esse usuário não está na sua sala.', flags: MessageFlags.Ephemeral });
              return;
          }

          // Prevent kicking self or higher roles (basic safety)
          if (targetMember.id === member.id) {
               await interaction.reply({ content: '❌ Você não pode se expulsar.', flags: MessageFlags.Ephemeral });
               return;
          }

          try {
              await targetMember.voice.setChannel(null, `Expulso por ${member.displayName}`);
              await interaction.reply({ content: `👢 **${targetMember.displayName}** foi removido da sala.`, flags: MessageFlags.Ephemeral });
          } catch (e) {
              await interaction.reply({ content: '❌ Erro ao expulsar usuário (permissões insuficientes?).', flags: MessageFlags.Ephemeral });
          }
      }

      // --- TACTICS SYSTEM ---
      if (interaction.isStringSelectMenu() && interaction.customId === 'tactics_map_select') {
          const mapName = interaction.values[0]; // ERANGEL, MIRAMAR
          
          // Send ephemeral list of cities for that map
          const mapData = MAPS[mapName as keyof typeof MAPS];
          if (mapData) {
              const locations = Object.keys(mapData.locations);
              
              const citySelect = new StringSelectMenuBuilder()
                  .setCustomId(`tactics_city_select_${mapName}`) // Pass map name in ID
                  .setPlaceholder(`📍 Onde vamos cair em ${mapData.name}?`)
                  .addOptions(
                      locations.map(loc => ({
                          label: loc,
                          value: loc,
                          description: `Marcar drop em ${loc}`,
                          emoji: '🎯'
                      }))
                  );

              const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(citySelect);
              
              await interaction.reply({ 
                  content: `🗺️ **Mapa Selecionado:** ${mapData.name}\nAgora escolha o ponto de queda:`,
                  components: [row],
                  flags: MessageFlags.Ephemeral 
              });
          }
      }

      if (interaction.customId.startsWith('tactics_city_select_')) {
          const mapName = interaction.customId.replace('tactics_city_select_', '');
          const cityName = interaction.values[0];
          
          await interaction.deferReply(); // Public reply with the image

          // Determine Clan Logo based on Channel or Role
          // Simple logic: Check channel name
          let logoUrl = interaction.guild?.iconURL({ extension: 'png' }) || 'https://cdn-icons-png.flaticon.com/512/681/681531.png'; // Default
          
          const channel = interaction.channel as TextChannel;
          if (channel.name.includes('hawk')) {
              // Hawk Esports Logo
              logoUrl = 'https://media-gru2-2.cdn.whatsapp.net/v/t61.24694-24/483479360_1049851137196361_1077319835271545121_n.jpg?ccb=11-4&oh=01_Q5Aa3wF-zOPeB927DOtNBOuDmE8m4DdlpJWpPoKsgMNYHvypgw&oe=699127BF&_nc_sid=5e03e0&_nc_cat=105';
          } else if (channel.name.includes('mira-ruim')) {
              // Mira Ruim Logo
              logoUrl = 'https://media-gru2-2.cdn.whatsapp.net/v/t61.24694-24/548597485_1476578836905248_430403589798715050_n.jpg?ccb=11-4&oh=01_Q5Aa3wFvjn6rT02-QaV3446sYXSZP4wyBfbCmYjNJnNyiUlV2w&oe=6990FEDD&_nc_sid=5e03e0&_nc_cat=101';
          }

          const attachment = await TacticsManager.generateDropMap(mapName, cityName, logoUrl);

          if (attachment) {
              const mapData = MAPS[mapName as keyof typeof MAPS];
              const locationData = mapData.locations[cityName];

              // Determine Color based on Danger
              let embedColor = '#00FF00'; // Safe
              if (locationData.danger.includes('EXTREMO') || locationData.danger.includes('SUICÍDIO')) embedColor = '#FF0000';
              else if (locationData.danger.includes('ALTO')) embedColor = '#FFA500';
              else if (locationData.danger.includes('MÉDIO')) embedColor = '#FFFF00';

              const embed = new EmbedBuilder()
                  .setTitle(`📍 DROP CONFIRMADO: ${cityName}`)
                  .setDescription(`**Mapa:** ${mapName}\n\n*Informações táticas carregadas.*`)
                  .addFields(
                      { name: '💰 Loot', value: locationData.loot, inline: true },
                      { name: '🚗 Veículos', value: locationData.vehicles, inline: true },
                      { name: '🔥 Perigo', value: locationData.danger, inline: true },
                      { name: '💡 Dica do Coach', value: `*${locationData.tips}*`, inline: false }
                  )
                  .setColor(embedColor as any)
                  .setThumbnail(logoUrl)
                  .setImage(`attachment://${attachment.name}`);

              const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                  new ButtonBuilder()
                      .setCustomId('tactics_strategy')
                      .setLabel('🎲 Sortear Estratégia')
                      .setStyle(ButtonStyle.Primary),
                  new ButtonBuilder()
                      .setCustomId('tactics_timer')
                      .setLabel('⏱️ Iniciar Timer')
                      .setStyle(ButtonStyle.Success)
              );

              await interaction.editReply({ 
                  content: null,
                  embeds: [embed],
                  files: [attachment],
                  components: [row]
              });
          } else {
              await interaction.editReply({ content: '❌ Erro ao gerar mapa tático.' });
          }
      }

      if (interaction.customId === 'faq_select') {
        const value = interaction.values[0];
        let response = '';
        if (value === 'faq_link') response = '**Como Vincular:**\nUse o comando `/vincular` ou clique no botão no canal #vincular-conta.';
        if (value === 'faq_recruit') response = '**Recrutamento:**\nEstamos buscando players com K/D 2.0+ e Rank Diamond. Abra um ticket para se aplicar.';
        if (value === 'faq_report') response = '**Denúncias:**\nGrave um clipe da infração e abra um ticket enviando o link.';
        
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('ask_ai')
            .setLabel('🤖 Perguntar à IA')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('open_ticket')
            .setLabel('📩 Abrir Ticket')
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ 
          embeds: [EmbedFactory.create('📚 Resposta FAQ', response)], 
          components: [row],
          flags: MessageFlags.Ephemeral 
        });
      }
    }

    if (interaction.isModalSubmit()) {
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
      if (interaction.customId === 'voice_rename_modal') {
          const newName = interaction.fields.getTextInputValue('voice_name_input');
          const member = interaction.member as GuildMember;
          
          if (member.voice.channel && member.voice.channel.permissionsFor(member).has(PermissionFlagsBits.ManageChannels)) {
              await member.voice.channel.setName(`🔊 | ${newName}`);
              await interaction.reply({ content: `✅ Sala renomeada para: **${newName}**`, flags: MessageFlags.Ephemeral });
          }
      }

      if (interaction.customId === 'voice_limit_modal') {
          const limit = parseInt(interaction.fields.getTextInputValue('voice_limit_input'));
          const member = interaction.member as GuildMember;
          
          if (!isNaN(limit) && member.voice.channel && member.voice.channel.permissionsFor(member).has(PermissionFlagsBits.ManageChannels)) {
              await member.voice.channel.setUserLimit(limit);
              await interaction.reply({ content: `✅ Limite ajustado para: **${limit === 0 ? 'Ilimitado' : limit}**`, flags: MessageFlags.Ephemeral });
          }
      }
    }
  },
};

export default event;
