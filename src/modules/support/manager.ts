import { 
    StringSelectMenuInteraction, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';

export class SupportManager {
    static async handleSelection(interaction: StringSelectMenuInteraction) {
        const selection = interaction.values[0];
        const embed = new EmbedBuilder();
        const components: ActionRowBuilder<ButtonBuilder>[] = [];

        if (selection === 'faq_link') {
            embed.setTitle('🔗 Problemas de Vínculo')
                .setDescription('Não consegue conectar sua conta do PUBG?\n\n1. Verifique se seu perfil na Steam/Epic está **Público**.\n2. Tente usar o botão abaixo para gerar um novo link seguro.')
                .setColor('#FFA500');
            
            components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('link_account').setLabel('Tentar Vincular').setStyle(ButtonStyle.Primary)
            ));
        }

        if (selection === 'faq_recruit') {
            embed.setTitle('🦅 Recrutamento')
                .setDescription('Quer entrar para a elite?\n\n**Requisitos Hawk:**\n• K/D 2.0+\n• Rank Diamond+\n• Disponibilidade para Scrims\n\nSe você cumpre os requisitos, envie sua ficha agora.')
                .setColor('#F2A900');

            components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('recruitment_start').setLabel('📝 Preencher Ficha').setStyle(ButtonStyle.Success)
            ));
        }

        if (selection === 'faq_report') {
            embed.setTitle('⚖️ Denúncias')
                .setDescription('Viu algo errado? (Toxicidade, Team Kill, Cheating)\n\nAbra um ticket imediatamente e anexe provas (vídeo/print). A Staff não age sem provas.')
                .setColor('#FF0000');

            components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('open_ticket').setLabel('🚨 Abrir Denúncia').setStyle(ButtonStyle.Danger)
            ));
        }

        if (selection === 'faq_ranking') {
            embed.setTitle('🏆 Sistema de Ranking')
                .setDescription('O ranking é atualizado a cada partida via API.\n\n• **Pontos (RP):** Baseados em Dano e Colocação.\n• **Elo:** Sobrevivente -> Veterano -> Elite -> Lenda.\n\nVeja sua posição no canal <#ID_RANKING>.')
                .setColor('#00BFFF');
        }

        if (selection === 'faq_gameplay') {
            embed.setTitle('🎮 Scrims e Treinos')
                .setDescription('Os treinos acontecem Terça e Quinta às 20h.\n\nFique atento aos canais de agenda do seu clã para confirmar presença. A ausência sem aviso pode gerar advertência.')
                .setColor('#00FF7F');
        }

        // Add standard buttons if needed
        if (components.length === 0) {
             components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('open_ticket').setLabel('Falar com Humano').setStyle(ButtonStyle.Secondary)
            ));
        }

        await interaction.reply({ embeds: [embed], components, flags: 64 });
    }
}
