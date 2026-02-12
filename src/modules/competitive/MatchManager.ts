import { db } from "../../core/DatabaseManager";
import { Mutex } from "async-mutex";
import { WalletManager, LedgerType } from "./WalletManager";

const matchMutex = new Mutex();

export class MatchManager {
    /**
     * Create a Match
     */
    static async createMatch(
        mode: "SQUAD" | "DUO" | "SOLO",
        entryCostCent: number,
        maxTeams?: number
    ) {
        // Defaults per plan
        let capacity = maxTeams;
        let teamSize = 1;
        let strategy = "SOLO_TOP16";

        if (mode === "SQUAD") {
            capacity = maxTeams || 18;
            teamSize = 4;
            strategy = "SQUAD_TOP4";
        } else if (mode === "DUO") {
            capacity = maxTeams || 50;
            teamSize = 2;
            strategy = "DUO_TOP10";
        } else {
            capacity = maxTeams || 100;
        }

        return await db.write(async (prisma) => {
            return await prisma.compMatch.create({
                data: {
                    mode,
                    teamSize,
                    entryCost: entryCostCent,
                    maxTeams: capacity,
                    payoutStrategy: strategy,
                    status: "OPEN"
                }
            });
        });
    }

    /**
     * Register a Team/Player (with Payment)
     */
    static async registerEntry(
        matchId: string,
        teamId: string,
        payerId: string // Captain who pays
    ) {
        await matchMutex.runExclusive(async () => {
            // 1. Validate Match
            const match = await db.read(async (prisma) => {
                return await prisma.compMatch.findUnique({
                    where: { id: matchId },
                    include: { entries: true }
                });
            });

            if (!match) throw new Error("Partida não encontrada.");
            if (match.status !== "OPEN") throw new Error("Inscrições encerradas.");
            if (match.entries.length >= match.maxTeams) throw new Error("Partida lotada.");

            // 2. Validate Team
            const team = await db.read(async (prisma) => {
                return await prisma.compTeam.findUnique({
                    where: { id: teamId },
                    include: { members: true }
                });
            });

            if (!team) throw new Error("Time não encontrado.");
            
            // Validate Roster Completeness
            if (team.members.length !== match.teamSize) {
                throw new Error(`Time incompleto. O modo ${match.mode} exige exatos ${match.teamSize} membros.`);
            }

            // Check if already registered
            const existing = match.entries.find(e => e.teamId === teamId);
            if (existing) throw new Error("Este time já está inscrito.");

            // 3. Calculate Cost
            // Cost is per PLAYER (e.g. 5.00 * 4 = 20.00)
            const totalCost = match.entryCost * match.teamSize;

            // 4. Process Payment (Captain pays for all)
            // If cost is 0, skip payment
            if (totalCost > 0) {
                await WalletManager.deductBalance(
                    payerId,
                    totalCost,
                    LedgerType.ENTRY_FEE,
                    `Inscrição Partida ${match.mode} #${match.id.slice(0,4)}`
                );
            }

            // 5. Register Entry & Update Pool
            await db.write(async (prisma) => {
                // Add Entry
                await prisma.compMatchEntry.create({
                    data: {
                        matchId,
                        teamId,
                        paid: true
                    }
                });

                // Update Pool (100% of entry fee goes to pool)
                await prisma.compMatch.update({
                    where: { id: matchId },
                    data: {
                        prizePool: { increment: totalCost }
                    }
                });
            });

            // TODO: Trigger Channel Access (ChannelManager)
        });
    }

    /**
     * Calculate Payouts (Dynamic Strategy)
     */
    static calculatePayouts(pool: number, rank: number, strategy: string): number {
        if (pool <= 0) return 0;

        let distribution: number[] = [];

        switch (strategy) {
            case "SQUAD_TOP4":
                distribution = [0.40, 0.30, 0.20, 0.10]; // 40%, 30%, 20%, 10%
                break;
            case "DUO_TOP10":
                // Top 10 curve
                distribution = [0.25, 0.15, 0.12, 0.10, 0.08, 0.07, 0.06, 0.05, 0.05, 0.05, 0.02]; 
                // Note: Sum must be <= 1.0. This is just an example.
                break;
            case "SOLO_TOP16":
            default:
                distribution = [
                    0.30, 0.15, 0.10, 0.07, 0.06, 0.05, 0.04, 0.035, 
                    0.03, 0.03, 0.025, 0.025, 0.02, 0.02, 0.02, 0.015
                ];
                break;
        }

        const pct = distribution[rank - 1] || 0;
        return Math.floor(pool * pct);
    }
}
