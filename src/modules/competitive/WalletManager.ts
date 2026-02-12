import { db } from "../../core/DatabaseManager";
import { Mutex } from "async-mutex";

const walletMutex = new Mutex();

export enum LedgerType {
    DEPOSIT = "DEPOSIT",
    WITHDRAW = "WITHDRAW",
    ENTRY_FEE = "ENTRY_FEE",
    PRIZE = "PRIZE",
    ADJUSTMENT = "ADJUSTMENT"
}

export class WalletManager {
    /**
     * Get or Create Wallet
     */
    static async getWallet(userId: string) {
        return await db.write(async (prisma) => {
            return await prisma.compWallet.upsert({
                where: { userId },
                create: { userId, credits: 0, winnings: 0 },
                update: {}
            });
        });
    }

    /**
     * Add Balance (Atomic)
     * Can add to 'credits' (Deposits) or 'winnings' (Prizes)
     */
    static async addBalance(
        userId: string, 
        amountCent: number, 
        type: LedgerType, 
        description: string,
        target: "credits" | "winnings" = "credits"
    ) {
        if (amountCent <= 0) throw new Error("Valor deve ser positivo.");

        await walletMutex.runExclusive(async () => {
            await db.write(async (prisma) => {
                // 1. Update Balance
                const wallet = await prisma.compWallet.upsert({
                    where: { userId },
                    create: { 
                        userId, 
                        credits: target === "credits" ? amountCent : 0,
                        winnings: target === "winnings" ? amountCent : 0
                    },
                    update: {
                        [target]: { increment: amountCent }
                    }
                });

                // 2. Ledger Entry
                await prisma.compLedger.create({
                    data: {
                        userId,
                        type,
                        amount: amountCent,
                        description,
                        balanceAfter: target === "credits" ? wallet.credits : wallet.winnings // Simplified
                    }
                });
            });
        });
    }

    /**
     * Deduct Balance (Atomic)
     * Prioritizes 'credits' first, then 'winnings' if allowed (or strict separation)
     * For now: Entry Fees consume Credits ONLY.
     */
    static async deductBalance(
        userId: string,
        amountCent: number,
        type: LedgerType,
        description: string
    ) {
        if (amountCent <= 0) throw new Error("Valor deve ser positivo.");

        await walletMutex.runExclusive(async () => {
            const wallet = await this.getWallet(userId);

            if (wallet.credits < amountCent) {
                throw new Error(`Saldo insuficiente. Você tem R$ ${(wallet.credits/100).toFixed(2)}, mas precisa de R$ ${(amountCent/100).toFixed(2)}.`);
            }

            await db.write(async (prisma) => {
                const newWallet = await prisma.compWallet.update({
                    where: { userId },
                    data: {
                        credits: { decrement: amountCent }
                    }
                });

                await prisma.compLedger.create({
                    data: {
                        userId,
                        type,
                        amount: -amountCent, // Negative for deduction
                        description,
                        balanceAfter: newWallet.credits
                    }
                });
            });
        });
    }

    /**
     * Get Ledger History
     */
    static async getHistory(userId: string, limit = 5) {
        return await db.read(async (prisma) => {
            return await prisma.compLedger.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: limit
            });
        });
    }
}
