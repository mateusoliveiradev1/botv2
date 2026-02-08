import { Events, Message, TextChannel, MessageType, AttachmentBuilder } from 'discord.js';
import { BotEvent } from '../types';
import { XpManager } from '../modules/xp/manager';
import { MissionManager } from '../modules/missions/manager';
import { MissionType } from '../modules/missions/constants';
import { AutoMod } from '../modules/moderation/AutoMod';
import { CanvasHelper } from '../utils/canvas';
import logger from '../core/logger';

const event: BotEvent = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (!message.guild) return;

    // --- DETECÇÃO DE BOOST ---
    const boostTypes = [
        MessageType.GuildBoost,
        MessageType.GuildBoostTier1,
        MessageType.GuildBoostTier2,
        MessageType.GuildBoostTier3
    ];

    if (boostTypes.includes(message.type)) {
        const member = message.member;
        if (member) {
            logger.info(`🚀 Novo boost detectado via mensagem de sistema: ${member.user.tag}`);
            try {
                // 1. Recompensa de XP (5000 XP)
                await XpManager.addXp(member, 5000);
                
                // 2. Encontrar canal de anúncio (🚀-boosts)
                const channelName = ['🚀-boosts', '💎-vip', 'geral'];
                const channel = message.guild.channels.cache.find(c => 
                  channelName.some(name => c.name.toLowerCase().includes(name)) && c.isTextBased()
                ) as TextChannel;
        
                if (channel) {
                    // 3. Gerar Cartão Visual
                    const boostCount = message.guild.premiumSubscriptionCount || 0;
                    const cardBuffer = await CanvasHelper.generateBoostCard(
                      member.user.username,
                      member.user.displayAvatarURL({ extension: 'png', size: 512 }),
                      message.guild.name,
                      boostCount
                    );
            
                    const attachment = new AttachmentBuilder(cardBuffer, { name: 'boost-card.png' });
            
                    // 4. Enviar Mensagem
                    await channel.send({
                      content: `🎉 **ATENÇÃO OPERADORES!**\n\n<@${member.id}> acabou de enviar um **Suprimento de Elite (Boost)** para o servidor!\nComo agradecimento, **5.000 XP** foram creditados em sua conta.`,
                      files: [attachment]
                    });
                }
            } catch (error) {
                logger.error(error, '❌ Erro ao processar boost message:');
            }
        }
        return; // Não processa XP de mensagem normal para boosts
    }

    if (message.author.bot) return;

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
