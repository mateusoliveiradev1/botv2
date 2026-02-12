import { db } from "../../core/DatabaseManager";
import { Guild, Role, GuildPremiumTier, User } from "discord.js";
import { LogManager, LogType, LogLevel } from "../logger/LogManager";

export class TeamManager {
    /**
     * Create a new team with Role
     */
    static async createTeam(
        captainId: string,
        name: string,
        mode: "SQUAD" | "DUO",
        guild: Guild
    ) {
        // 1. Check if user already has a team for this mode
        const existing = await db.read(async (prisma) => {
            return await prisma.compTeam.findFirst({
                where: {
                    captainId,
                    mode
                }
            });
        });

        if (existing) {
            throw new Error(`Você já tem um time de ${mode} registrado: ${existing.name}`);
        }

        // 2. Create Discord Role
        const role = await guild.roles.create({
            name: `🛡️ ${name}`,
            color: "Random",
            mentionable: true,
            reason: `Time Competitivo: ${name} (Capitão: ${captainId})`
        });

        // 3. Persist to DB
        const team = await db.write(async (prisma) => {
            return await prisma.compTeam.create({
                data: {
                    name,
                    captainId,
                    mode,
                    roleId: role.id,
                    members: {
                        create: {
                            userId: captainId
                        }
                    }
                },
                include: {
                    members: true
                }
            });
        });

        // 4. Assign Role to Captain
        try {
            const member = await guild.members.fetch(captainId);
            await member.roles.add(role);
        } catch (e) {
            console.error(`Failed to assign role to captain ${captainId}`, e);
        }

        return team;
    }

    /**
     * Add member to team
     */
    static async addMember(teamId: string, userId: string, guild: Guild) {
        const team = await db.read(async (prisma) => {
            return await prisma.compTeam.findUnique({
                where: { id: teamId },
                include: { members: true }
            });
        });

        if (!team) throw new Error("Time não encontrado.");

        // Check Capacity
        const limit = team.mode === "SQUAD" ? 4 : 2;
        if (team.members.length >= limit) {
            throw new Error(`O time já está cheio (${team.members.length}/${limit}).`);
        }

        // Add to DB
        await db.write(async (prisma) => {
            await prisma.compTeamMember.create({
                data: {
                    teamId,
                    userId
                }
            });
        });

        // Add Role
        if (team.roleId) {
            try {
                const member = await guild.members.fetch(userId);
                const role = await guild.roles.fetch(team.roleId);
                if (role) await member.roles.add(role);
            } catch (e) {
                console.error(`Failed to assign role to member ${userId}`, e);
            }
        }
    }

    /**
     * Upload Team Logo (and update Role Icon if Tier 2)
     */
    static async updateLogo(teamId: string, logoUrl: string, guild: Guild) {
        // 1. Update DB
        const team = await db.write(async (prisma) => {
            return await prisma.compTeam.update({
                where: { id: teamId },
                data: { logoUrl }
            });
        });

        // 2. Update Role Icon (if Tier 2)
        if (team.roleId && guild.premiumTier >= GuildPremiumTier.Tier2) {
            try {
                const role = await guild.roles.fetch(team.roleId);
                if (role) {
                    await role.setIcon(logoUrl);
                }
            } catch (e) {
                console.error("Failed to update Role Icon:", e);
                // Non-critical error
            }
        }

        return team;
    }

    /**
     * Delete Team (and Role)
     */
    static async deleteTeam(teamId: string, guild: Guild) {
        const team = await db.read(async (prisma) => {
            return await prisma.compTeam.findUnique({ where: { id: teamId } });
        });

        if (!team) return;

        // Delete DB
        await db.write(async (prisma) => {
            await prisma.compTeam.delete({ where: { id: teamId } });
        });

        // Delete Role
        if (team.roleId) {
            try {
                const role = await guild.roles.fetch(team.roleId);
                if (role) await role.delete("Time desfeito pelo capitão");
            } catch (e) {
                console.error("Failed to delete role:", e);
            }
        }
    }
}
