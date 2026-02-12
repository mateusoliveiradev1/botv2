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

    // --- SITREP RELAY SYSTEM (Priority High - Before Bot Check) ---
    // Intercepts messages in #sitrep-relay (including Webhooks/Bots) and forwards to #sitrep
    if (message.channel.type === 0 && (message.channel as TextChannel).name.includes('sitrep-relay')) {
        try {
            // 1. Find Target Channel (#sitrep)
            const targetChannel = message.guild.channels.cache.find(c => 
                c.name.includes('sitrep') && 
                !c.name.includes('relay') && 
                c.isTextBased()
            ) as TextChannel;

            if (targetChannel) {
                // 2. Prepare Payload
                const payload: any = {};
                
                // If message has content, wrap in Embed or send as is
                if (message.content) {
                    // Create a standardized embed for text updates
                    /* 
                       Using a standardized embed ensures all updates look official.
                       We use the original author's name/icon.
                    */
                   /*
                    const embed = new EmbedBuilder()
                        .setAuthor({ 
                            name: message.author.username || 'Intelligence Relay', 
                            iconURL: message.author.displayAvatarURL() || undefined 
                        })
                        .setDescription(message.content)
                        .setColor('#00FF00') // Green for Relay
                        .setTimestamp();
                    
                    payload.embeds = [embed];
                    */
                   // For now, let's just forward the content to keep links/formatting intact
                   payload.content = `**📡 RELAY [${message.author.username}]:**\n${message.content}`;
                }

                // 3. Forward Attachments/Embeds
                if (message.embeds.length > 0) {
                    payload.embeds = message.embeds;
                }
                if (message.attachments.size > 0) {
                    payload.files = Array.from(message.attachments.values());
                }

                // 4. Send
                if (payload.content || payload.embeds || payload.files) {
                    await targetChannel.send(payload);
                    await message.react('✅'); // Mark as forwarded
                }
            }
        } catch (error) {
            logger.error(error, '❌ Failed to relay sitrep message');
        }
        return; // Stop processing (No XP for relay messages)
    }

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
