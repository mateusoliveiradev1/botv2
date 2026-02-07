import { 
    ButtonInteraction, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    TextChannel 
} from 'discord.js';
import { EmbedFactory } from '../../utils/embeds';

export class OnboardingManager {
    static async startTutorial(interaction: ButtonInteraction) {
        // Step 1: Boas-vindas
        const embed = new EmbedBuilder()
            .setTitle('🪂 BRIEFING DE SOBREVIVÊNCIA')
            .setDescription(`Bem-vindo ao campo de batalha, **${interaction.user.username}**.\n\nVocê acaba de saltar na ilha da BlueZone Sentinel. Sua missão é sobreviver, evoluir e dominar o servidor.\n\n*Clique abaixo para receber suas instruções.*`)
            .setColor('#F2A900') // Gold
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/2910/2910795.png'); // Parachute

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('onboarding_step_2')
                .setLabel('➡️ Próximo: Regras')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ 
            embeds: [embed], 
            components: [row], 
            flags: 64 // Ephemeral
        });
    }

    static async handleStep(interaction: ButtonInteraction) {
        const step = interaction.customId;

        if (step === 'onboarding_step_2') {
            // Regras
            const embed = new EmbedBuilder()
                .setTitle('📜 REGRAS DE CONDUTA')
                .setDescription('Para manter a ordem no quartel, siga o código de honra:\n\n1. **Respeito acima de tudo.** Toxicidade = Ban.\n2. **Fair Play.** Cheating é tolerância zero.\n3. **Comunicação.** Use o Push-to-Talk em canais lotados.\n\n*O descumprimento resultará em corte marcial.*')
                .setColor('#0099FF');

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('onboarding_step_3')
                    .setLabel('➡️ Próximo: Identidade')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.update({ embeds: [embed], components: [row] });
        }

        if (step === 'onboarding_step_3') {
            // Identidade
            const embed = new EmbedBuilder()
                .setTitle('🆔 SUA IDENTIDADE')
                .setDescription('Vá até o canal <#ID_DO_CANAL_IDENTIDADE> para configurar seu perfil:\n\n🛡️ **Escolha sua Classe:** Sniper, Fragger, IGL...\n🔫 **Escolha sua Arma:** Mostre sua preferência.\n🔗 **Vincule sua Conta:** Conecte o PUBG para exibir seus stats.\n\n*Isso garante que você seja reconhecido pelo seu valor.*')
                .setColor('#00FF00');

            // Tentar pegar o ID do canal dinamicamente seria ideal, mas no tutorial estático podemos ser genéricos ou pedir pra ele olhar o canal
            // Vamos usar uma menção genérica por enquanto ou melhorar depois com o ID real

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('onboarding_step_4')
                    .setLabel('➡️ Próximo: Clãs')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.update({ embeds: [embed], components: [row] });
        }

        if (step === 'onboarding_step_4') {
            // Clãs
            const embed = new EmbedBuilder()
                .setTitle('🦅 ESCOLHA SEU LADO')
                .setDescription('Existem dois grandes pelotões operando aqui:\n\n**🦅 HAWK ESPORTS:** Focado em alta performance e competitivo.\n**🎯 MIRA RUIM:** Focado em comunidade, resenha e diversão.\n\nQuer se alistar? Vá em <#ID_DO_CANAL_RECRUTAMENTO> e envie sua ficha.')
                .setColor('#FF0000');

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('onboarding_finish')
                    .setLabel('✅ Finalizar Briefing')
                    .setStyle(ButtonStyle.Success)
            );

            await interaction.update({ embeds: [embed], components: [row] });
        }

        if (step === 'onboarding_finish') {
            // Fim
            const embed = new EmbedBuilder()
                .setTitle('🚀 SALTO CONCLUÍDO')
                .setDescription('Você está pronto para o combate.\n\n👉 **Próximos Passos:**\n1. Configure seu perfil.\n2. Entre em uma sala de voz.\n3. Sobreviva.\n\n*Boa sorte, Sobrevivente.*')
                .setColor('#F2A900')
                .setImage('https://media.discordapp.net/attachments/1214272027477610568/1214272027989311548/pubg-jump.gif'); // Exemplo de GIF

            await interaction.update({ embeds: [embed], components: [] });
        }
    }
}
