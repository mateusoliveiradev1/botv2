import { GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { XP_LEVELS, XP_RATES } from './constants';
import logger from '../../core/logger';
import fs from 'fs';
import path from 'path';

// JSON Persistence Path
const DB_PATH = path.join(process.cwd(), 'data', 'xp_data.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Interface for XP Data
interface XpData {
  xp: number;
  level: number;
  lastMessage: number;
}

// Load DB from JSON
let xpDb = new Map<string, XpData>();

try {
  if (fs.existsSync(DB_PATH)) {
    const rawData = fs.readFileSync(DB_PATH, 'utf-8');
    const json = JSON.parse(rawData);
    xpDb = new Map(Object.entries(json));
  }
} catch (error) {
  logger.error(error, 'Failed to load XP Database');
}

export class XpManager {
  private static saveDb() {
    try {
      const obj = Object.fromEntries(xpDb);
      fs.writeFileSync(DB_PATH, JSON.stringify(obj, null, 2));
    } catch (error) {
      logger.error(error, 'Failed to save XP Database');
    }
  }

  static async addXp(member: GuildMember, amount: number) {
    if (member.user.bot) return;

    const data = xpDb.get(member.id) || { xp: 0, level: 1, lastMessage: 0 };
    
    // Cooldown check for messages (if amount matches message range)
    if (amount >= XP_RATES.MESSAGE_MIN && amount <= XP_RATES.MESSAGE_MAX) {
      if (Date.now() - data.lastMessage < XP_RATES.COOLDOWN) return;
      data.lastMessage = Date.now();
    }

    data.xp += amount;
    
    // Check Level Up
    // Better logic: find highest level reached
    const reachedLevel = [...XP_LEVELS].reverse().find(l => data.xp >= l.xp);

    if (reachedLevel && reachedLevel.level > data.level) {
      data.level = reachedLevel.level;
      await this.handleLevelUp(member, reachedLevel);
    }

    xpDb.set(member.id, data);
    this.saveDb(); // Save on every update (simple but effective for small scale)
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
      const embed = new EmbedBuilder()
        .setTitle('⭐ PROMOÇÃO DE CAMPO')
        .setDescription(`**ATENÇÃO TODOS!**\n\nO operador **${member}** acumulou experiência de combate suficiente e foi promovido.`)
        .setColor('#FFD700') // Gold
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/3112/3112946.png') // Gold Medal Icon
        .addFields(
            { name: '🎖️ Nova Patente', value: `\`${levelData.role.toUpperCase()}\``, inline: true },
            { name: '📊 Nível', value: `**${levelData.level}**`, inline: true },
            { name: '📈 XP Total', value: `${(await this.getStats(member.id)).xp}`, inline: true }
        )
        .setImage('https://i.pinimg.com/originals/30/1e/52/301e522e3799079728cb64f3d4569527.gif') // Level Up GIF (Gold Confetti)
        .setFooter({ text: 'Continue engajando para subir de patente!', iconURL: member.guild.iconURL() || undefined })
        .setTimestamp();

      await channel.send({ content: `🎉 Parabéns ${member}!`, embeds: [embed] });
    }
  }

  static getStats(memberId: string) {
    return xpDb.get(memberId) || { xp: 0, level: 1, lastMessage: 0 };
  }
}
