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

export class ScrimManager {
    static async showScheduler(interaction: ButtonInteraction) {
        const modal = new ModalBuilder()
            .setCustomId('scrim_schedule_modal')
            .setTitle('📅 Agendar Treino (Scrim)');

        const dateInput = new TextInputBuilder()
            .setCustomId('scrim_date')
            .setLabel("Data e Hora")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Ex: Hoje às 20h ou 15/02 às 19h")
            .setRequired(true);

        const typeInput = new TextInputBuilder()
            .setCustomId('scrim_type')
            .setLabel("Tipo de Treino")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Ex: Treino Interno, Contra Squad X...")
            .setRequired(true);

        const modeInput = new TextInputBuilder()
            .setCustomId('scrim_mode')
            .setLabel("Modo")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Ex: SQUAD FPP - Erangel/Miramar")
            .setRequired(true);

        // Destino (Hawk, Mira, Ambos)
        const targetInput = new TextInputBuilder()
            .setCustomId('scrim_target')
            .setLabel("Destino (Hawk, Mira ou Ambos)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Digite: Hawk, Mira ou Ambos")
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(dateInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(typeInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(modeInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(targetInput)
        );

        await interaction.showModal(modal);
    }

    static async createEvent(interaction: ModalSubmitInteraction) {
        const date = interaction.fields.getTextInputValue('scrim_date');
        const type = interaction.fields.getTextInputValue('scrim_type');
        const mode = interaction.fields.getTextInputValue('scrim_mode');
        const target = interaction.fields.getTextInputValue('scrim_target').toLowerCase();

        let channels: TextChannel[] = [];
        let roleMention = '';

        // Determinar canais e menções
        if (target.includes('hawk') || target.includes('ambos')) {
            const c = interaction.guild?.channels.cache.find(c => c.name === '📅-agenda-hawk') as TextChannel;
            if (c) channels.push(c);
            roleMention += '<@&ID_ROLE_HAWK> '; // Idealmente pegar ID do constants
        }
        if (target.includes('mira') || target.includes('ambos')) {
            const c = interaction.guild?.channels.cache.find(c => c.name === '📅-agenda-mira') as TextChannel;
            if (c) channels.push(c);
            roleMention += '<@&ID_ROLE_MIRA> ';
        }

        if (channels.length === 0) {
            await interaction.reply({ content: '❌ Erro: Nenhum canal de agenda encontrado.', flags: 64 });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`📅 AGENDA DE TREINO: ${type.toUpperCase()}`)
            .setDescription(`**Horário:** ${date}\n**Modo:** ${mode}\n**Organizador:** ${interaction.user}`)
            .setColor('#FF4500')
            .addFields(
                { name: '✅ Confirmados', value: '*Ninguém ainda*', inline: true },
                { name: '❌ Ausentes', value: '*Ninguém ainda*', inline: true }
            )
            .setFooter({ text: 'Confirme sua presença para garantir o slot.' });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('scrim_join').setLabel('Confirmar').setStyle(ButtonStyle.Success).setEmoji('✅'),
            new ButtonBuilder().setCustomId('scrim_leave').setLabel('Ausente').setStyle(ButtonStyle.Danger).setEmoji('✖️')
        );

        for (const channel of channels) {
            await channel.send({ content: `🔔 **Atenção Operadores!** Novo treino agendado.`, embeds: [embed], components: [row] });
        }

        await interaction.reply({ content: `✅ Treino agendado em ${channels.length} canais.`, flags: 64 });
    }

    static async handlePresence(interaction: ButtonInteraction) {
        const action = interaction.customId === 'scrim_join' ? 'join' : 'leave';
        const userTag = interaction.user.username; // Ou nickname

        const embed = interaction.message.embeds[0];
        const oldConfirmed = embed.fields[0].value.replace('*Ninguém ainda*', '').split('\n').filter(s => s.trim().length > 0);
        const oldAbsent = embed.fields[1].value.replace('*Ninguém ainda*', '').split('\n').filter(s => s.trim().length > 0);

        // Remove user from both lists
        let newConfirmed = oldConfirmed.filter(s => !s.includes(userTag));
        let newAbsent = oldAbsent.filter(s => !s.includes(userTag));

        if (action === 'join') newConfirmed.push(`• ${userTag}`);
        else newAbsent.push(`• ${userTag}`);

        const newEmbed = EmbedBuilder.from(embed).setFields(
            { name: '✅ Confirmados', value: newConfirmed.length ? newConfirmed.join('\n') : '*Ninguém ainda*', inline: true },
            { name: '❌ Ausentes', value: newAbsent.length ? newAbsent.join('\n') : '*Ninguém ainda*', inline: true }
        );

        await interaction.update({ embeds: [newEmbed] });
    }
}
