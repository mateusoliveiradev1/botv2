import { db } from "../../core/DatabaseManager";
import { Guild, ChannelType, PermissionFlagsBits, CategoryChannel } from "discord.js";

export class ChannelManager {
    /**
     * Ensure Match Environment (Category + Info Channel) exists
     */
    static async ensureMatchCategory(matchId: string, guild: Guild) {
        // 1. Check if DB has category ID
        const match = await db.read(async (prisma) => {
            return await prisma.compMatch.findUnique({ where: { id: matchId } });
        });

        if (match && match.channelCategoryId) {
            try {
                return await guild.channels.fetch(match.channelCategoryId) as CategoryChannel;
            } catch (e) {
                // Channel deleted manually? Recreate.
            }
        }

        // 2. Create Category
        const category = await guild.channels.create({
            name: `🏆 PARTIDA ${matchId.slice(0, 4)}`,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.id, // @everyone
                    deny: [PermissionFlagsBits.ViewChannel] // Private by default
                }
            ]
        });

        // 3. Create #info-senha channel
        await guild.channels.create({
            name: "🔐-senha-sala",
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                }
                // Team roles will be added here later
            ]
        });

        // 4. Save to DB
        await db.write(async (prisma) => {
            await prisma.compMatch.update({
                where: { id: matchId },
                data: { channelCategoryId: category.id }
            });
        });

        return category;
    }

    /**
     * Grant Access to a Team (via Role)
     */
    static async grantTeamAccess(matchId: string, teamId: string, guild: Guild) {
        // 1. Get Match Category
        const category = await this.ensureMatchCategory(matchId, guild);
        if (!category) return;

        // 2. Get Team Role
        const team = await db.read(async (prisma) => {
            return await prisma.compTeam.findUnique({ where: { id: teamId } });
        });

        if (!team || !team.roleId) return;

        // 3. Update Category Permissions
        await category.permissionOverwrites.edit(team.roleId, {
            ViewChannel: true,
            SendMessages: true,
            Connect: true
        });

        // 4. Create Voice Channel for Squad (if needed)
        // Only for DUO/SQUAD
        if (team.mode !== "SOLO") {
            await guild.channels.create({
                name: `🔊 ${team.name}`,
                type: ChannelType.GuildVoice,
                parent: category.id,
                userLimit: team.mode === "SQUAD" ? 4 : 2,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel] // Hide from everyone
                    },
                    {
                        id: team.roleId,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] // Allow Team
                    }
                ]
            });
        }
    }

    /**
     * Teardown (Delete) all channels for a match
     */
    static async teardownMatch(matchId: string, guild: Guild) {
        const match = await db.read(async (prisma) => {
            return await prisma.compMatch.findUnique({ where: { id: matchId } });
        });

        if (!match || !match.channelCategoryId) return;

        try {
            const category = await guild.channels.fetch(match.channelCategoryId) as CategoryChannel;
            if (category) {
                // Delete children first
                const children = category.children.cache;
                for (const [_, channel] of children) {
                    await channel.delete("Fim da partida competitiva");
                }
                // Delete category
                await category.delete("Fim da partida competitiva");
            }
        } catch (e) {
            console.error(`Failed to teardown match ${matchId}`, e);
        }

        // Clear DB reference
        await db.write(async (prisma) => {
            await prisma.compMatch.update({
                where: { id: matchId },
                data: { channelCategoryId: null }
            });
        });
    }
}
