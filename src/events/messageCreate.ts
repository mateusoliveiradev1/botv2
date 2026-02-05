import { Events, Message, TextChannel } from 'discord.js';
import { BotEvent } from '../types';
import { XpManager } from '../modules/xp/manager';
import { MissionManager } from '../modules/missions/manager';
import { MissionType } from '../modules/missions/constants';
import { AutoMod } from '../modules/moderation/AutoMod';

const event: BotEvent = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot || !message.guild) return;

    // 1. Auto-Mod (Advanced)
    // Se o AutoMod agir (retornar true), paramos o processamento aqui (sem XP, sem missões)
    const punished = await AutoMod.handle(message);
    if (punished) return;

    // 2. XP System
    // Random amount 15-25
    const amount = Math.floor(Math.random() * 10) + 15;
    await XpManager.addXp(message.member!, amount);

    // 3. Mission Tracking
    MissionManager.track(message.author.id, MissionType.MESSAGE, 1);
  },
};

export default event;
