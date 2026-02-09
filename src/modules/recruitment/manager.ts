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
    Guild,
    Colors
} from 'discord.js';
import { EmbedFactory } from '../../utils/embeds';
import logger from '../../core/logger';
import { LovableService } from '../../services/lovable';

export class RecruitmentManager {
    /**
     * Sends the Recruitment Panel to the public channel
     */
    static async sendPanel(guild: Guild) {
        const channel = guild.channels.cache.find(c => c.name === '🪖-recrutamento') as TextChannel;
        if (!channel) return;

        // Clear old messages
        await channel.bulkDelete(10).catch(() => {});

        const embed = new EmbedBuilder()
            .setTitle('🪖 CENTRO DE RECRUTAMENTO E SELEÇÃO')
            .setDescription(
                "Quer fazer parte da elite? Os clãs **🦅 Hawk Esports** e **🎯 Mira Ruim** estão buscando novos operadores.\n\n" +
                "**📋 REQUISITOS MÍNIMOS:**\n" +
                "• **Conta Vinculada** (Dados reais verificados)\n" +
                "• K/D Competitivo e Rank Ativo\n" +
                "• Disponibilidade para treinos noturnos\n" +
                "• Comunicação limpa e respeito à hierarquia\n\n" +
                "Clique no botão abaixo para iniciar seu processo de alistamento."
            )
            .setColor('#F2A900')
            .setImage('https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg')
            .setFooter({ text: "Sistema de Alistamento Militar v2.0" });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('recruitment_start') // Updated ID
                .setLabel('📝 Alistar-se Agora')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🪖')
        );

        await channel.send({ embeds: [embed], components: [row] });
        logger.info('✅ Recruitment Panel sent.');
    }

    /**
     * Handles the "Start" button click
     */
    static async showForm(interaction: ButtonInteraction) {
        // 1. Check Link Status
        const statusResponse = await LovableService.getLinkStatus(interaction.user.id);
        const isLinked = statusResponse.success && statusResponse.data?.is_linked;
        
        if (!isLinked) {
            const loginResponse = await LovableService.generateLoginLink(interaction.user.id, interaction.user.username);
            const loginUrl = loginResponse.success && loginResponse.data ? loginResponse.data.login_url : "https://bluezone.gg/login"; // Fallback URL
            
            const embed = new EmbedBuilder()
                .setTitle("⛔ ACESSO NEGADO: CONTA NÃO VINCULADA")
                .setDescription(
                    "Para se alistar, precisamos verificar seus dados de combate (K/D e Rank) automaticamente.\n" +
                    "Isso evita fraudes e garante a qualidade do recrutamento.\n\n" +
                    "**Clique abaixo para conectar sua conta PUBG/Steam.**"
                )
                .setColor(Colors.Red);

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setLabel('🔗 Vincular Conta')
                    .setStyle(ButtonStyle.Link)
                    .setURL(loginUrl)
            );

            await interaction.reply({ embeds: [embed], components: [row], flags: 64 }); // Ephemeral
            return;
        }

        // 2. Show Modal (If Linked)
        const modal = new ModalBuilder()
            .setCustomId('recruitment_modal')
            .setTitle('📝 Ficha de Alistamento');

        const nameInput = new TextInputBuilder()
            .setCustomId('recruitment_name')
            .setLabel("Nome e Idade")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Ex: Lucas, 24 anos")
            .setRequired(true);

        // We don't ask for K/D anymore, we pull it from API/Mock
        
        const clanInput = new TextInputBuilder()
            .setCustomId('recruitment_clan')
            .setLabel("Qual clã deseja entrar?")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Hawk Esports ou Mira Ruim")
            .setRequired(true);

        const reasonInput = new TextInputBuilder()
            .setCustomId('recruitment_reason')
            .setLabel("Por que devemos te recrutar?")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Conte sobre seu estilo de jogo, horários e objetivos...")
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(clanInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
        );

        await interaction.showModal(modal);
    }

    static async processApplication(interaction: ModalSubmitInteraction) {
        await interaction.deferReply({ flags: 64 }); // Ephemeral loading

        const name = interaction.fields.getTextInputValue('recruitment_name');
        const clan = interaction.fields.getTextInputValue('recruitment_clan');
        const reason = interaction.fields.getTextInputValue('recruitment_reason');

        // 1. Fetch Verified Stats
        let stats = { kd: "N/A", rank: "Unranked", wins: 0 };
        try {
            const apiResponse = await LovableService.getStats(interaction.user.id);
            if (apiResponse.success && apiResponse.data) {
                stats = {
                    kd: apiResponse.data.kd_ratio.toFixed(2),
                    rank: apiResponse.data.current_rank,
                    wins: apiResponse.data.wins
                };
            }
        } catch (e) {
            logger.error(e, "Failed to fetch stats for recruitment");
        }

        // 2. Routing Logic
        const clanLower = clan.toLowerCase();
        let targetChannel: TextChannel | undefined;

        if (clanLower.includes('hawk')) {
            targetChannel = interaction.guild?.channels.cache.find(c => c.name === '📄-recrutamento-hawk') as TextChannel;
        } else if (clanLower.includes('mira')) {
            targetChannel = interaction.guild?.channels.cache.find(c => c.name === '📄-recrutamento-mira') as TextChannel;
        }
        
        // Fallback
        if (!targetChannel) {
            // Try generic leadership channels if specific reception ones fail
            if (clanLower.includes('hawk')) targetChannel = interaction.guild?.channels.cache.find(c => c.name === '👮-liderança-hawk') as TextChannel;
            else if (clanLower.includes('mira')) targetChannel = interaction.guild?.channels.cache.find(c => c.name === '👮-liderança-mira') as TextChannel;
            
            if (!targetChannel) {
                targetChannel = interaction.guild?.channels.cache.find(c => c.name.includes('caixa-preta')) as TextChannel;
            }
        }

        if (targetChannel) {
            const embed = new EmbedBuilder()
                .setTitle('📄 NOVA APLICAÇÃO RECEBIDA')
                .setColor('#FFD700') // Gold
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: '👤 Candidato', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: '📋 Dados Pessoais', value: name, inline: true },
                    { name: '🦅 Clã Alvo', value: clan, inline: true },
                    { name: '📊 K/D & Rank (Verificado)', value: `**${stats.kd} KD** • ${stats.rank} • ${stats.wins} Wins`, inline: false },
                    { name: '📝 Motivação', value: reason, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: "Dados sincronizados via WebApp" });

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(`recruit_approve_${interaction.user.id}`)
                    .setLabel('✅ Aprovar (Recruta)')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`recruit_reject_${interaction.user.id}`)
                    .setLabel('❌ Rejeitar')
                    .setStyle(ButtonStyle.Danger),
                 new ButtonBuilder()
                    .setLabel('💬 Chamar DM')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`discord://-/users/${interaction.user.id}`) // Deep link attempt or just visual hint
            );

            await targetChannel.send({ embeds: [embed], components: [row] });
            await interaction.editReply({ content: '✅ **Aplicação Enviada com Sucesso!**\nSeus dados foram verificados e enviados para o comando.' });
        } else {
            await interaction.editReply({ content: '❌ Erro interno: Canal de recrutamento não encontrado. Contate um admin.' });
        }
    }

    static async handleDecision(interaction: ButtonInteraction) {
        const action = interaction.customId.startsWith('recruit_approve') ? 'approve' : 'reject';
        const userId = interaction.customId.split('_')[2];
        const member = await interaction.guild?.members.fetch(userId).catch(() => null);

        if (!member) {
            await interaction.reply({ content: '❌ Usuário não está mais no servidor.', flags: 64 });
            return;
        }

        if (action === 'approve') {
            // Dar cargo de "Recruta" (Novo: 🔰 Recruta)
            const role = interaction.guild?.roles.cache.find(r => r.name === '🔰 Recruta' || r.name.includes('Recruta'));
            if (role) await member.roles.add(role);

            // Change Nickname? (Already done on join, but maybe reinforce?)
            
            await member.send(`🎉 **PARABÉNS!** Sua aplicação foi APROVADA.\nVocê recebeu a patente de **Recruta**. Apresente-se no QG!`).catch(() => {});
            
            await interaction.update({ components: [] }); 
            await interaction.followUp({ content: `✅ **Aprovado** por ${interaction.user}.` });
        } else {
            await member.send(`⚠️ **STATUS:** Sua aplicação foi analisada e recusada neste momento. Continue treinando e tente novamente na próxima temporada.`).catch(() => {});
            
            await interaction.update({ components: [] });
            await interaction.followUp({ content: `❌ **Rejeitado** por ${interaction.user}.` });
        }
    }
}