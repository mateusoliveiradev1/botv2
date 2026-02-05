"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const WarningManager_1 = require("../../modules/moderation/WarningManager");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('warns')
        .setDescription('Visualiza o histórico de advertências de um usuário')
        .addUserOption(option => option.setName('usuario')
        .setDescription('O usuário para ver o histórico (vazio para ver o seu)')
        .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario') || interaction.user;
        const guildId = interaction.guildId;
        const warnings = WarningManager_1.WarningManager.getWarnings(guildId, user.id);
        const count = warnings.length;
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`📜 Histórico de Advertências - ${user.tag}`)
            .setColor(count > 0 ? '#FFA500' : '#00FF00')
            .setThumbnail(user.displayAvatarURL())
            .setDescription(`Total de advertências: **${count}**`);
        if (count === 0) {
            embed.setDescription('Este usuário não possui advertências. Usuário exemplar! 🌟');
        }
        else {
            // Mostrar as últimas 10 warns para não estourar o limite do embed
            const lastWarnings = warnings.slice(-10).reverse(); // Mais recentes primeiro
            const history = lastWarnings.map((w, index) => {
                const date = new Date(w.timestamp).toLocaleDateString('pt-BR');
                const mod = w.moderatorId === 'AUTO_MOD' ? '🤖 AutoMod' : `<@${w.moderatorId}>`;
                return `**${count - index}.** [${date}] ${w.reason} (por ${mod})`;
            }).join('\n');
            embed.addFields({ name: 'Últimas Infrações', value: history });
        }
        await interaction.reply({ embeds: [embed] });
    }
};
exports.default = command;
