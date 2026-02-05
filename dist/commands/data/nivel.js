"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const manager_1 = require("../../modules/xp/manager");
const constants_1 = require("../../modules/xp/constants");
const embeds_1 = require("../../utils/embeds");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('nivel')
        .setDescription('Exibe seu nível e XP atual no Discord'),
    async execute(interaction) {
        const stats = manager_1.XpManager.getStats(interaction.user.id);
        // Calcular próximo nível
        const nextLevel = constants_1.XP_LEVELS.find(l => l.xp > stats.xp);
        const currentLevelBase = [...constants_1.XP_LEVELS].reverse().find(l => l.xp <= stats.xp) || constants_1.XP_LEVELS[0];
        let progress = 0;
        let nextXp = 0;
        let description = '';
        if (nextLevel) {
            const xpNeeded = nextLevel.xp - currentLevelBase.xp;
            const xpCurrentInLevel = stats.xp - currentLevelBase.xp;
            progress = Math.min(Math.max(xpCurrentInLevel / xpNeeded, 0), 1);
            nextXp = nextLevel.xp;
            // Barra de progresso visual
            const barLength = 10;
            const filledLength = Math.round(progress * barLength);
            const bar = '🟩'.repeat(filledLength) + '⬜'.repeat(barLength - filledLength);
            description = `
      **Nível Atual:** ${stats.level}
      **XP Total:** ${stats.xp} / ${nextXp}
      
      ${bar} **${Math.floor(progress * 100)}%**
      
      *Faltam ${nextLevel.xp - stats.xp} XP para o próximo rank: ${nextLevel.role}*`;
        }
        else {
            description = `
      **Nível Atual:** ${stats.level}
      **XP Total:** ${stats.xp}
      
      🏆 **Nível Máximo Alcançado!**`;
        }
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`📊 Nível de ${interaction.user.username}`)
            .setDescription(description)
            .setColor(embeds_1.Colors.PUBG_YELLOW)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: 'Interaja no chat para ganhar mais XP!' });
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
exports.default = command;
