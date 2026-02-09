import { db } from "../../core/DatabaseManager";
import { LogManager, LogType, LogLevel } from "../logger/LogManager";
import { Guild, User } from "discord.js";

export class EconomyManager {
  private static DAILY_AMOUNT = 200;
  private static DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24h

  /**
   * Get user balance. Creates account if not exists.
   */
  static async getBalance(userId: string): Promise<number> {
    // Ensure user exists first
    await db.write(async (prisma) => {
      await prisma.user.upsert({
        where: { id: userId },
        create: { id: userId },
        update: {},
      });
    });

    // Get or Create Economy Record safely
    const eco = await db.write(async (prisma) => {
      return await prisma.userEconomy.upsert({
        where: { userId },
        create: { userId, balance: 0 },
        update: {},
      });
    });

    return eco.balance;
  }

  /**
   * Add money to user balance
   */
  static async addBalance(
    userId: string,
    amount: number,
    reason: string,
    guild?: Guild,
    executor?: User,
  ): Promise<number> {
    if (amount <= 0) return await this.getBalance(userId);

    // Ensure User & Economy exist
    await this.getBalance(userId);

    const newEco = await db.write(async (prisma) => {
      return await prisma.userEconomy.update({
        where: { userId },
        data: { balance: { increment: amount } },
      });
    });

    if (guild) {
      await LogManager.log({
        guild,
        type: LogType.SYSTEM, // Using SYSTEM as ECONOMY type doesn't exist yet
        level: LogLevel.INFO,
        title: "💰 Depósito Realizado",
        description: `Crédito de **${amount} BC** adicionado.`,
        executor: executor,
        fields: [
          { name: "Beneficiário", value: `<@${userId}>`, inline: true },
          { name: "Motivo", value: reason, inline: true },
          { name: "Novo Saldo", value: `${newEco.balance} BC`, inline: true },
        ],
      });
    }

    return newEco.balance;
  }

  /**
   * Remove money from user balance
   */
  static async removeBalance(
    userId: string,
    amount: number,
    reason: string,
    guild?: Guild,
    executor?: User,
  ): Promise<boolean> {
    if (amount <= 0) return false;

    const current = await this.getBalance(userId);
    if (current < amount) return false;

    await db.write(async (prisma) => {
      await prisma.userEconomy.update({
        where: { userId },
        data: { balance: { decrement: amount } },
      });
    });

    if (guild) {
      await LogManager.log({
        guild,
        type: LogType.SYSTEM,
        level: LogLevel.WARN,
        title: "💸 Débito Realizado",
        description: `Débito de **${amount} BC** processado.`,
        executor: executor,
        fields: [
          { name: "Usuário", value: `<@${userId}>`, inline: true },
          { name: "Motivo", value: reason, inline: true },
          {
            name: "Saldo Restante",
            value: `${current - amount} BC`,
            inline: true,
          },
        ],
      });
    }

    return true;
  }

  /**
   * Claim Daily Reward
   */
  static async claimDaily(
    userId: string,
    guild?: Guild,
  ): Promise<{ success: boolean; cooldown?: number; balance?: number }> {
    const now = new Date();

    // Ensure account
    await this.getBalance(userId);

    const eco = await db.read(async (prisma) => {
      return await prisma.userEconomy.findUnique({
        where: { userId },
      });
    });

    if (eco && eco.lastDaily) {
      const diff = now.getTime() - eco.lastDaily.getTime();
      if (diff < this.DAILY_COOLDOWN) {
        return { success: false, cooldown: this.DAILY_COOLDOWN - diff };
      }
    }

    // Process Claim
    const newEco = await db.write(async (prisma) => {
      return await prisma.userEconomy.update({
        where: { userId },
        data: {
          balance: { increment: this.DAILY_AMOUNT },
          lastDaily: now,
        },
      });
    });

    if (guild) {
      // Optional: Log daily claims (might be spammy, keep it simple)
      // logger.info(`User ${userId} claimed daily: ${this.DAILY_AMOUNT} BC`);
    }

    return { success: true, balance: newEco.balance };
  }
}
