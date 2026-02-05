"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const manager_1 = require("../../modules/setup/manager");
const embeds_1 = require("../../utils/embeds");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('setup')
        .setDescription('Constrói a estrutura do servidor (Admin Only)')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.Administrator),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            if (interaction.guild) {
                const manager = new manager_1.SetupManager(interaction.guild);
                await manager.run();
                await interaction.editReply({ embeds: [embeds_1.EmbedFactory.success('Setup Concluído', 'Estrutura BlueZone criada com sucesso.')] });
            }
            else {
                await interaction.editReply('Erro: Comando apenas para servidores.');
            }
        }
        catch (error) {
            // Ignorar erro se a interação expirou (setup demorou mas funcionou)
        }
    }
};
exports.default = command;
