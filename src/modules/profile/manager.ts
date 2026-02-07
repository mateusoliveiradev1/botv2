import { 
    ButtonInteraction, 
    EmbedBuilder, 
    GuildMember,
    AttachmentBuilder
} from 'discord.js';
import { LovableService } from '../../services/lovable';
import { ROLES } from '../setup/constants';
import { CanvasHelper } from '../../utils/canvas'; // Vamos assumir que CanvasHelper pode ser expandido ou usaremos Embed simples por enquanto

export class ProfileManager {
    static async showCard(interaction: ButtonInteraction) {
        await interaction.deferReply({ flags: 64 });

        const member = interaction.member as GuildMember;
        const roles = member.roles.cache;

        // 1. Get Data from Lovable
        const statsResponse = await LovableService.getStats(member.id);
        const stats = statsResponse.success ? statsResponse.data : null;

        // 2. Determine Rank & Roles
        const militaryRank = this.getHighestRole(member, [...ROLES.STAFF, ...ROLES.BASE]) || 'Recruta';
        const clanRole = this.getHighestRole(member, ROLES.CLANS) || 'Sem Clã';
        const compRank = stats?.current_rank || 'Unranked';
        
        // 3. Get Class & Weapon
        const specializedClass = roles.find(r => ROLES.CLASSES.includes(r.name))?.name || 'Nenhuma';
        const favWeapon = roles.find(r => ROLES.WEAPONS.includes(r.name))?.name || 'Nenhuma';

        // 4. Build Embed
        const embed = new EmbedBuilder()
            .setTitle(`💳 IDENTIDADE DO SOBREVIVENTE`)
            .setColor(member.displayHexColor)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: '👤 Nome de Guerra', value: `**${member.displayName}**`, inline: true },
                { name: '🎖️ Patente', value: militaryRank, inline: true },
                { name: '🦅 Afiliação', value: clanRole, inline: true },
                
                { name: '🏆 Elo Competitivo', value: `**${compRank}**`, inline: true },
                { name: '☠️ K/D Ratio', value: stats ? stats.kd_ratio.toFixed(2) : 'N/A', inline: true },
                { name: '🍗 Vitórias', value: stats ? stats.wins.toString() : 'N/A', inline: true },

                { name: '🛡️ Especialização', value: specializedClass, inline: true },
                { name: '🎒 Loadout Favorito', value: favWeapon, inline: true },
                { name: '📅 Tempo de Serviço', value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: `ID: ${member.id} • BlueZone Database` });

        await interaction.editReply({ embeds: [embed] });
    }

    private static getHighestRole(member: GuildMember, roleList: { name: string }[]): string | null {
        // Percorre a lista (que deve estar em ordem de prioridade) e retorna o primeiro que o user tem
        for (const roleDef of roleList) {
            if (member.roles.cache.some(r => r.name === roleDef.name)) {
                return roleDef.name;
            }
        }
        return null;
    }
}
