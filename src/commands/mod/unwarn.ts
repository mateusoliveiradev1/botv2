import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { SlashCommand } from '../../types';
import { WarningManager } from '../../modules/moderation/WarningManager';

const command: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Remove a última advertência de um usuário')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('O usuário para remover a advertência')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario', true);
        const guildId = interaction.guildId!;

        const success = WarningManager.removeWarning(guildId, user.id);

        if (success) {
            const currentCount = WarningManager.getWarningCount(guildId, user.id);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Advertência Removida')
                .setColor('#00FF00')
                .setDescription(`A última advertência de ${user} foi removida com sucesso.`)
                .addFields({ name: 'Contagem Atual', value: currentCount.toString() });

            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({ 
                content: `O usuário ${user} não possui advertências para remover.`, 
                ephemeral: true 
            });
        }
    }
};

export default command;
