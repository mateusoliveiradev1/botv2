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
    ButtonStyle
} from 'discord.js';
import { EmbedFactory } from '../../utils/embeds';
import logger from '../../core/logger';

export class RecruitmentManager {
    static async showForm(interaction: ButtonInteraction) {
        const modal = new ModalBuilder()
            .setCustomId('recruitment_modal')
            .setTitle('📝 Ficha de Alistamento');

        const nameInput = new TextInputBuilder()
            .setCustomId('recruitment_name')
            .setLabel("Nome / Idade")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Ex: Lucas, 24 anos")
            .setRequired(true);

        const kdInput = new TextInputBuilder()
            .setCustomId('recruitment_kd')
            .setLabel("Seu K/D e Rank Atual")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Ex: 2.5 KD, Diamond V")
            .setRequired(true);

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
            .setPlaceholder("Conte sobre seu estilo de jogo e objetivos...")
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(kdInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(clanInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
        );

        await interaction.showModal(modal);
    }

    static async processApplication(interaction: ModalSubmitInteraction) {
        const name = interaction.fields.getTextInputValue('recruitment_name');
        const kd = interaction.fields.getTextInputValue('recruitment_kd');
        const clan = interaction.fields.getTextInputValue('recruitment_clan');
        const reason = interaction.fields.getTextInputValue('recruitment_reason');

        // Encontrar canal de gestão (Staff Only)
        // Por enquanto, vamos mandar para o #caixa-preta ou criar um canal de applications
        // Idealmente: #👮-gestao-recrutamento. Vamos usar o #caixa-preta como fallback
        let targetChannel = interaction.guild?.channels.cache.find(c => c.name === '👮-gestao-scrims') as TextChannel; // Usando gestao-scrims temporariamente ou criar um novo
        // Melhor: Usar o canal de logs se não tiver um específico
        if (!targetChannel) targetChannel = interaction.guild?.channels.cache.find(c => c.name.includes('caixa-preta')) as TextChannel;

        if (targetChannel) {
            const embed = new EmbedBuilder()
                .setTitle('📄 NOVA APLICAÇÃO DE RECRUTAMENTO')
                .setColor('#FFFF00')
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: '👤 Candidato', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: '📋 Dados', value: name, inline: true },
                    { name: '🔫 K/D & Rank', value: kd, inline: true },
                    { name: '🦅 Clã Alvo', value: clan, inline: true },
                    { name: '📝 Motivação', value: reason, inline: false }
                )
                .setTimestamp();

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(`recruit_approve_${interaction.user.id}`)
                    .setLabel('Aprovar (Teste)')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`recruit_reject_${interaction.user.id}`)
                    .setLabel('Rejeitar')
                    .setStyle(ButtonStyle.Danger)
            );

            await targetChannel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: '✅ **Aplicação Enviada!** Um oficial analisará sua ficha em breve.', flags: 64 });
        } else {
            await interaction.reply({ content: '❌ Erro interno: Canal de gestão não encontrado.', flags: 64 });
        }
    }

    static async handleDecision(interaction: ButtonInteraction) {
        const action = interaction.customId.startsWith('recruit_approve') ? 'approve' : 'reject';
        const userId = interaction.customId.split('_')[2];
        const member = await interaction.guild?.members.fetch(userId);

        if (!member) {
            await interaction.reply({ content: '❌ Usuário saiu do servidor.', flags: 64 });
            return;
        }

        if (action === 'approve') {
            // Dar cargo de "Recruta" ou "Em Teste" se tiver
            // Vamos dar o cargo base "🪖 Cabo" para ele ter acesso aos canais comuns
            const role = interaction.guild?.roles.cache.find(r => r.name === '🪖 Cabo');
            if (role) await member.roles.add(role);

            await member.send(`🎉 **PARABÉNS!** Sua aplicação para a BlueZone foi APROVADA.\nVocê recebeu acesso aos canais de membros. Apresente-se no chat geral!`).catch(() => {});
            
            await interaction.update({ components: [] }); // Remove botões
            await interaction.followUp({ content: `✅ **Aprovado** por ${interaction.user}.` });
        } else {
            await member.send(`⚠️ **STATUS:** Sua aplicação foi analisada e infelizmente recusada neste momento. Tente novamente no futuro.`).catch(() => {});
            
            await interaction.update({ components: [] });
            await interaction.followUp({ content: `❌ **Rejeitado** por ${interaction.user}.` });
        }
    }
}
