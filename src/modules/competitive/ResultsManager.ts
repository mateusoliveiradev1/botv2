import { db } from "../../core/DatabaseManager";
import { MatchManager } from "./MatchManager";
import { WalletManager, LedgerType } from "./WalletManager";
import { ChannelManager } from "./ChannelManager";
import { Guild } from "discord.js";

interface ResultPayload {
    matchId: string;
    rankings: {
        teamId: string;
        placement: number;
        kills: number;
    }[];
}

export class ResultsManager {
    /**
     * Process Match Results (from API or Manual)
     */
    static async processResults(payload: ResultPayload, guild: Guild) {
        const { matchId, rankings } = payload;

        // 1. Validate Match
        const match = await db.read(async (prisma) => {
            return await prisma.compMatch.findUnique({
                where: { id: matchId }
            });
        });

        if (!match) throw new Error("Partida não encontrada.");
        if (match.status === "FINALIZED") throw new Error("Partida já finalizada.");

        // 2. Save Results & Distribute Prizes
        await db.write(async (prisma) => {
            // Update Match Status
            await prisma.compMatch.update({
                where: { id: matchId },
                data: { 
                    status: "FINALIZED",
                    endedAt: new Date()
                }
            });

            for (const rank of rankings) {
                // Calculate Prize
                const prize = MatchManager.calculatePayouts(
                    match.prizePool,
                    rank.placement,
                    match.payoutStrategy
                );

                // Save Result Record
                await prisma.compMatchResult.create({
                    data: {
                        matchId,
                        teamId: rank.teamId,
                        placement: rank.placement,
                        kills: rank.kills,
                        prize
                    }
                });

                // Pay the Team (Captain receives? Or Split?)
                // Plan says: Captain receives or Split.
                // Simplest for now: Pay to Captain's Wallet (Winnings)
                if (prize > 0) {
                    const team = await prisma.compTeam.findUnique({
                        where: { id: rank.teamId },
                        include: { members: true }
                    });

                    if (team) {
                        // Split logic: Divide equally among members
                        const splitPrize = Math.floor(prize / team.members.length);
                        // Remainder goes to Captain (random/first) to ensure cents match
                        const remainder = prize - (splitPrize * team.members.length);

                        for (let i = 0; i < team.members.length; i++) {
                            const member = team.members[i];
                            const amount = splitPrize + (i === 0 ? remainder : 0);
                            
                            // Non-blocking call to WalletManager inside transaction? 
                            // Better to do it manually here to keep atomic transaction
                            await prisma.compWallet.upsert({
                                where: { userId: member.userId },
                                create: { userId: member.userId, winnings: amount },
                                update: { winnings: { increment: amount } }
                            });

                            await prisma.compLedger.create({
                                data: {
                                    userId: member.userId,
                                    type: "PRIZE",
                                    amount: amount,
                                    description: `Prêmio Partida #${matchId.slice(0,4)} (Pos: ${rank.placement})`,
                                    balanceAfter: 0 // Cannot know exact balance in batch, but it's ok
                                }
                            });
                        }
                    }
                }
            }
        });

        // 3. Cleanup Channels (Auto Teardown)
        // Wait 5 minutes then delete
        setTimeout(() => {
            ChannelManager.teardownMatch(matchId, guild);
        }, 5 * 60 * 1000); 

        return { success: true, processed: rankings.length };
    }
}
