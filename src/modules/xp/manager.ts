import { GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { XP_LEVELS, XP_RATES } from './constants';
import logger from '../../core/logger';
import { db } from '../../core/DatabaseManager';

export class XpManager {

  static async addXp(member: GuildMember, amount: number) {
    if (member.user.bot) return;

    await db.write(async (prisma) => {
        await prisma.user.upsert({
            where: { id: member.id },
            update: { username: member.user.username },
            create: { id: member.id, username: member.user.username }
        });
    });

    const data = await db.write(async (prisma) => {
        return await prisma.userXP.upsert({
            where: { userId: member.id },
            update: {},
            create: { userId: member.id, xp: 0, level: 1, lastMessageAt: new Date(0) }
        });
    });
    
    // Cooldown check for messages (if amount matches message range)
    if (amount >= XP_RATES.MESSAGE_MIN && amount <= XP_RATES.MESSAGE_MAX) {
      if (Date.now() - data.lastMessageAt.getTime() < XP_RATES.COOLDOWN) return;
    }

    const newXp = data.xp + amount;
    
    // Check Level Up
    // Better logic: find highest level reached
    const reachedLevel = [...XP_LEVELS].reverse().find(l => newXp >= l.xp);
    let newLevel = data.level;

    if (reachedLevel && reachedLevel.level > data.level) {
      newLevel = reachedLevel.level;
      await this.handleLevelUp(member, reachedLevel);
    }

    // Update DB
    await db.write(async (prisma) => {
        await prisma.userXP.update({
            where: { userId: member.id },
            data: {
                xp: newXp,
                level: newLevel,
                lastMessageAt: (amount >= XP_RATES.MESSAGE_MIN && amount <= XP_RATES.MESSAGE_MAX) ? new Date() : data.lastMessageAt
            }
        });
    });
  }

  private static async handleLevelUp(member: GuildMember, levelData: any) {
    // 1. Assign Role
    const role = member.guild.roles.cache.find(r => r.name === levelData.role);
    if (role) {
      await member.roles.add(role);
    }

    // 2. Announce with Premium Embed
    const channel = member.guild.channels.cache.find(c => c.name === '🏅-conquistas') as TextChannel;
    if (channel) {
      const stats = await this.getStats(member.id);
      const embed = new EmbedBuilder()
        .setTitle('⭐ PROMOÇÃO DE CAMPO')
        .setDescription(`**ATENÇÃO TODOS!**\n\nO operador **${member}** acumulou experiência de combate suficiente e foi promovido.`)
        .setColor('#FFD700') // Gold
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/3112/3112946.png') // Gold Medal Icon
        .addFields(
            { name: '🎖️ Nova Patente', value: `\`${levelData.role.toUpperCase()}\``, inline: true },
            { name: '📊 Nível', value: `**${levelData.level}**`, inline: true },
            { name: '📈 XP Total', value: `${stats.xp}`, inline: true }
        )
        .setImage('https://i.pinimg.com/originals/30/1e/52/301e522e3799079728cb64f3d4569527.gif') // Level Up GIF (Gold Confetti)
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
