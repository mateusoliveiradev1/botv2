import { Events, GuildMember, TextChannel, AttachmentBuilder } from 'discord.js';
import { BotEvent } from '../types';
import { XpManager } from '../modules/xp/manager';
import { CanvasHelper } from '../utils/canvas';
import logger from '../core/logger';

const event: BotEvent = {
  name: Events.GuildMemberUpdate,
  once: false,
  async execute(oldMember: GuildMember, newMember: GuildMember) {
    // Verificar se o usuário começou a dar boost
    const wasBooster = oldMember.premiumSince;
    const isBooster = newMember.premiumSince;

    if (!wasBooster && isBooster) {
      logger.info(`🚀 Novo Booster detectado: ${newMember.user.tag}`);

      try {
        // 1. Recompensa de XP (5000 XP = Nível 20 instantâneo)
        await XpManager.addXp(newMember, 5000);
        
        // 2. Encontrar canal de anúncio
        const guild = newMember.guild;
        const channelName = ['🚀-boosts', '💎-vip', 'geral', 'chat-geral'];
        
        const channel = guild.channels.cache.find(c => 
          channelName.some(name => c.name.toLowerCase().includes(name)) && c.isTextBased()
        ) as TextChannel;

        if (!channel) {
          logger.warn('⚠️ Nenhum canal adequado encontrado para anunciar o boost.');
          return;
        }

        // 3. Gerar Cartão Visual
        const boostCount = guild.premiumSubscriptionCount || 0;
        const cardBuffer = await CanvasHelper.generateBoostCard(
          newMember.user.username,
          newMember.user.displayAvatarURL({ extension: 'png', size: 512 }),
          guild.name,
          boostCount
        );

        const attachment = new AttachmentBuilder(cardBuffer, { name: 'boost-card.png' });

        // 4. Enviar Mensagem
        await channel.send({
          content: `🎉 **ATENÇÃO OPERADORES!**\n\n<@${newMember.id}> acabou de enviar um **Suprimento de Elite (Boost)** para o servidor!\nComo agradecimento, **5.000 XP** foram creditados em sua conta.`,
          files: [attachment]
        });

      } catch (error) {
        logger.error(error, '❌ Erro ao processar evento de boost:');
      }
    }
  }
};

export default event;
