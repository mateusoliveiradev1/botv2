import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { BotEvent } from '../types';
import { LogManager, LogType, LogLevel } from '../modules/logger/LogManager';
import logger from '../core/logger';

const event: BotEvent = {
  name: Events.GuildMemberRemove,
  async execute(member: GuildMember | PartialGuildMember) {
    if (member.user.bot) return;

    logger.info(`Member Left: ${member.user.tag}`);

    // Audit Log (Red)
    await LogManager.log({
        guild: member.guild,
        type: LogType.MEMBER,
        level: LogLevel.DANGER,
        title: 'Membro Saiu',
        description: `Operador abandonou o posto ou foi desconectado.`,
        target: member.user,
        fields: [
            { name: 'Total de Membros', value: `${member.guild.memberCount}`, inline: true }
        ]
    });
  },
};

export default event;