import { 
    ButtonInteraction, 
    EmbedBuilder, 
    GuildMember,
    AttachmentBuilder,
    Interaction
} from 'discord.js';
import { LovableService } from '../../services/lovable';
import { ROLES } from '../setup/constants';
import { LogManager, LogType, LogLevel } from '../logger/LogManager';

export class ProfileManager {
    static async showCard(interaction: ButtonInteraction) {
        await interaction.deferReply({ flags: 64 });

        const member = interaction.member as GuildMember;
        const roles = member.roles.cache;

        // 1. Get Data from Lovable
        const statsResponse = await LovableService.getStats(member.id);
        const stats = statsResponse.success ? statsResponse.data : null;

        // 1.5. Auto-Sync Rank (New)
        if (stats && stats.current_rank) {
            await this.syncRankRole(member, stats.current_rank);
        }

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

    private static async syncRankRole(member: GuildMember, rankName: string) {
        // Map API Rank Names to Discord Roles
        // API often returns "Diamond V", "Platinum IV", etc.
        // We want to match broadly to our Roles: "💎 Diamante", "🏆 Platina", etc.
        
        let targetRoleName = '';
        
        if (rankName.includes('Master') || rankName.includes('Grandmaster')) targetRoleName = '👑 Mestre';
        else if (rankName.includes('Diamond')) targetRoleName = '💎 Diamante';
        else if (rankName.includes('Platinum')) targetRoleName = '🏆 Platina';
        else if (rankName.includes('Gold')) targetRoleName = '🥇 Ouro';
        else if (rankName.includes('Silver')) targetRoleName = '🥈 Prata';
        else if (rankName.includes('Bronze')) targetRoleName = '🥉 Bronze';
        else return; // No sync for lower ranks or unranked

        const targetRole = member.guild.roles.cache.find(r => r.name.includes(targetRoleName));
        if (!targetRole) return;

        // Check if already has it
        if (member.roles.cache.has(targetRole.id)) return;

        // Remove old rank roles
        const allRankRoles = ['👑 Mestre', '💎 Diamante', '🏆 Platina', '🥇 Ouro', '🥈 Prata', '🥉 Bronze'];
        const rolesToRemove = member.roles.cache.filter(r => 
            allRankRoles.some(rank => r.name.includes(rank)) && r.id !== targetRole.id
        );

        if (rolesToRemove.size > 0) {
            await member.roles.remove(rolesToRemove);
        }

        // Add new role
        await member.roles.add(targetRole);

        // Log Change
        await LogManager.log({
            guild: member.guild,
            type: LogType.SYSTEM,
            level: LogLevel.SUCCESS,
            title: "🆙 Patente Atualizada",
            description: `Sincronização automática via WebApp.`,
            target: member.user,
            fields: [
                { name: "Novo Rank", value: targetRole.name, inline: true },
                { name: "Rank API", value: rankName, inline: true }
            ]
        });
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
