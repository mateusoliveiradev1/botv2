import { Events, Interaction, TextChannel, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, GuildMember } from 'discord.js';
import { BotEvent } from '../types';
import { faqService } from '../services/faq';
import logger from '../core/logger';
import { TicketManager } from '../modules/tickets/manager';
import { LogManager, LogType, LogLevel } from '../modules/logger/LogManager';
import { EmbedFactory } from '../utils/embeds';
import { LovableService } from '../services/lovable';
import { MissionManager } from '../modules/missions/manager';

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
          if (!interaction.memberPermissions?.has('Administrator') && !(interaction.member as GuildMember).roles.cache.some(r => r.name === '🛡️ Task Force Officer')) {
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
          const role = interaction.guild?.roles.cache.find(r => r.name === '🎖️ Soldado');
          const visitorRole = interaction.guild?.roles.cache.find(r => r.name === '🏳️ Visitante');
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

    // 3. Select Menus (FAQ)
    if (interaction.isStringSelectMenu()) {
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
    }
  },
};

export default event;
