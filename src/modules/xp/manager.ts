import { GuildMember, TextChannel, EmbedBuilder, Client } from 'discord.js';
import { XP_LEVELS, XP_RATES } from './constants';
import logger from '../../core/logger';
import { db } from '../../core/DatabaseManager';

interface XpBufferEntry {
  amount: number;
  lastMessageAt?: Date;
  guildId: string;
}

export class XpManager {
  private static xpBuffer = new Map<string, XpBufferEntry>();
  private static FLUSH_INTERVAL = 45000; // 45s
  private static client: Client;
  private static flushInterval: NodeJS.Timeout;

  static async addXp(member: GuildMember, amount: number) {
    if (member.user.bot) return;

    // Auto-init client and interval if not set
    if (!this.client) {
        this.client = member.client;
        this.startFlushInterval();
    }

    // Cooldown check for messages
    if (amount >= XP_RATES.MESSAGE_MIN && amount <= XP_RATES.MESSAGE_MAX) {
      if (this.isCooldown(member.id)) return;
      this.setCooldown(member.id);
    }

    const current = this.xpBuffer.get(member.id) || { amount: 0, guildId: member.guild.id };
    current.amount += amount;
    current.guildId = member.guild.id;

    if (amount >= XP_RATES.MESSAGE_MIN && amount <= XP_RATES.MESSAGE_MAX) {
      current.lastMessageAt = new Date();
    }
    
    this.xpBuffer.set(member.id, current);
  }

  private static startFlushInterval() {
      if (this.flushInterval) return;
      this.flushInterval = setInterval(() => this.flushXp(), this.FLUSH_INTERVAL);
  }

  private static cooldowns = new Map<string, number>();
  
  private static isCooldown(userId: string): boolean {
      const last = this.cooldowns.get(userId);
      if (!last) return false;
      return Date.now() - last < XP_RATES.COOLDOWN;
  }

  private static setCooldown(userId: string) {
      this.cooldowns.set(userId, Date.now());
  }

  private static async flushXp() {
    if (this.xpBuffer.size === 0) return;

    logger.info(`💾 Flushing XP Cache (${this.xpBuffer.size} entries)...`);
    
    const entries = Array.from(this.xpBuffer.entries());
    this.xpBuffer.clear();

    for (const [userId, data] of entries) {
        try {
             await db.write(async (prisma) => {
                await prisma.user.upsert({
                    where: { id: userId },
                    update: {},
                    create: { id: userId, username: 'Unknown' }
                });

                const currentData = await prisma.userXP.upsert({
                    where: { userId },
                    update: {},
                    create: { userId, xp: 0, level: 1, lastMessageAt: new Date(0) }
                });

                const newXp = currentData.xp + data.amount;
                
                const reachedLevel = [...XP_LEVELS].reverse().find(l => newXp >= l.xp);
                let newLevel = currentData.level;
                let levelUpData = null;

                if (reachedLevel && reachedLevel.level > currentData.level) {
                    newLevel = reachedLevel.level;
                    levelUpData = reachedLevel;
                }

                await prisma.userXP.update({
                    where: { userId },
                    data: {
                        xp: newXp,
                        level: newLevel,
                        lastMessageAt: data.lastMessageAt || currentData.lastMessageAt
                    }
                });

                if (levelUpData && this.client) {
                     const guild = this.client.guilds.cache.get(data.guildId);
                     if (guild) {
                         const member = await guild.members.fetch(userId).catch(() => null);
                         if (member) {
                             await this.handleLevelUp(member, levelUpData);
                         }
                     }
                }
            });
        } catch (error) {
            logger.warn(`❌ Failed to flush XP for ${userId}: ${(error as Error).message}`);
        }
    }
  }

  private static async handleLevelUp(member: GuildMember, levelData: any) {
    const role = member.guild.roles.cache.find(r => r.name === levelData.role);
    if (role) {
      await member.roles.add(role);
    }

    const channel = member.guild.channels.cache.find(c => c.name === '🏅-conquistas') as TextChannel;
    if (channel) {
      const stats = await this.getStats(member.id);
      const embed = new EmbedBuilder()
        .setTitle('⭐ PROMOÇÃO DE CAMPO')
        .setDescription(`**ATENÇÃO TODOS!**\n\nO operador **${member}** acumulou experiência de combate suficiente e foi promovido.`)
        .setColor('#FFD700')
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/3112/3112946.png')
        .addFields(
            { name: '🎖️ Nova Patente', value: `\`${levelData.role.toUpperCase()}\``, inline: true },
            { name: '📊 Nível', value: `**${levelData.level}**`, inline: true },
            { name: '📈 XP Total', value: `${stats.xp}`, inline: true }
        )
        .setImage('https://i.pinimg.com/originals/30/1e/52/301e522e3799079728cb64f3d4569527.gif')
        .setFooter({ text: 'Continue engajando para subir de patente!', iconURL: member.guild.iconURL() || undefined })
        .setTimestamp();

      await channel.send({ content: `🎉 Parabéns ${member}!`, embeds: [embed] });
    }
  }

  static async getStats(memberId: string) {
    const data = await db.read(async (prisma) => {
        return await prisma.userXP.findUnique({
            where: { userId: memberId }
        });
    });
    return data || { xp: 0, level: 1, lastMessageAt: new Date(0) };
  }
}
