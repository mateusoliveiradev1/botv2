import { Events, GuildMember } from 'discord.js';
import { BotEvent } from '../types';
import logger from '../core/logger';

// Definição de Prioridade de Ícones
// O primeiro match na lista será o ícone aplicado.
const PRIORITY_ICONS = [
  // 1. Comando Supremo (Staff)
  { role: '🦅 General de Exército', icon: '🌟' }, // Estrela/Coroa para Dono
  { role: '🎖️ Coronel', icon: '⚔️' }, // Espadas para Admin
  { role: '⚔️ Capitão', icon: '🛡️' }, // Escudo para Mod

  // 2. Liderança de Clã
  { role: '👑 Líder Hawk', icon: '👑' }, // Coroa para Líder
  { role: '👑 Líder Mira Ruim', icon: '👑' },

  // 3. Membros de Clã
  { role: '🦅 Hawk Esports', icon: '🦅' }, // Águia
  { role: '🎯 Mira Ruim', icon: '🎯' }, // Alvo

  // 4. Sistema
  { role: '🤖 System', icon: '🤖' }
];

const event: BotEvent = {
  name: Events.GuildMemberUpdate,
  once: false,
  async execute(oldMember: GuildMember, newMember: GuildMember) {
    // Evitar loop infinito
    if (oldMember.nickname === newMember.nickname) return;
    
    // Ignorar Dono do Servidor (Bots não podem mudar nick do dono)
    if (newMember.id === newMember.guild.ownerId) return;

    // Ignorar se o bot não tiver permissão
    if (!newMember.guild.members.me?.permissions.has('ManageNicknames')) return;
    // Se o membro for superior ao bot, não tenta mudar
    if (newMember.roles.highest.position >= newMember.guild.members.me.roles.highest.position) return;

    try {
      const currentNick = newMember.nickname || newMember.user.username;
      let newNick = currentNick;
      let targetIcon = '';

      // 1. Descobrir qual ícone o membro deve ter (PRIORIDADE)
      const memberRoles = newMember.roles.cache;
      
      for (const entry of PRIORITY_ICONS) {
        if (memberRoles.some(r => r.name === entry.role)) {
          targetIcon = entry.icon;
          break; // Encontrou a maior prioridade, para aqui.
        }
      }

      // Fallback para recrutas sem cargo especial (opcional)
      if (!targetIcon) {
          // targetIcon = '🪖'; // Descomente para forçar ícone em todos
      }

      // 2. Lógica de Aplicação
      if (targetIcon) {
        const iconPrefix = `${targetIcon} | `;
        
        if (currentNick.startsWith(iconPrefix)) return; // Já está certo

        // Remove qualquer emoji antigo no começo
        const cleanNick = currentNick.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s\|\s/u, '');
        newNick = `${iconPrefix}${cleanNick}`;
      } else {
        // Se perdeu o cargo, remove o ícone
        const cleanNick = currentNick.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s\|\s/u, '');
        if (cleanNick !== currentNick) {
            newNick = cleanNick;
        } else {
            return; 
        }
      }

      // 3. Limite
      if (newNick.length > 32) newNick = newNick.substring(0, 32);

      // 4. Aplicar
      if (newNick !== currentNick) {
        await newMember.setNickname(newNick);
        logger.info(`🏷️ Nickname atualizado para ${newMember.user.tag}: ${newNick}`);
      }

    } catch (error) {
      logger.warn(`⚠️ Não foi possível alterar nick de ${newMember.user.tag}: ${(error as Error).message}`);
    }
  }
};

export default event;
