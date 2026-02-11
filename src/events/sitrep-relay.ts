import { Events, Message, TextChannel } from 'discord.js';
import { BotEvent } from '../types';
import { NewsService, NewsItem } from '../services/news';
import logger from '../core/logger';

const RELAY_CHANNEL_NAME = '🕵-sitrep-relay';

const event: BotEvent = {
    name: Events.MessageCreate,
    once: false,
    async execute(message: Message) {
        // Ignore self to prevent loops
        if (message.author.id === message.client.user?.id) return; 
        
        const channel = message.channel;
        // Check if it's the correct channel
        // Note: checking by name is robust enough for setup, but ID would be safer if configured
        if (!('name' in channel) || channel.name !== RELAY_CHANNEL_NAME) return;

        try {
            logger.info(`📨 SITREP Relay: Processing message from ${message.author.tag}`);

            // Instantiate Service (Stateless usage for posting)
            const newsService = new NewsService(message.client);

            // Determine Content Source (Webhook Embed vs User Message)
            let title = 'Relatório de Inteligência';
            let content = message.content;
            let imageUrl: string | undefined = undefined;
            let url: string | undefined = undefined;
            let authorName = message.author.username;
            let authorIcon = message.author.displayAvatarURL();

            // If it's a webhook with embeds, prefer embed data
            if (message.embeds.length > 0) {
                const sourceEmbed = message.embeds[0];
                title = sourceEmbed.title || title;
                // If description is empty, try to use content or fields (simplified for now)
                content = sourceEmbed.description || message.content || ''; 
                imageUrl = sourceEmbed.image?.url || sourceEmbed.thumbnail?.url;
                url = sourceEmbed.url || undefined;
                if (sourceEmbed.author) {
                    authorName = sourceEmbed.author.name || authorName;
                    authorIcon = sourceEmbed.author.iconURL || authorIcon;
                }
            }

            // Fallback/Safety Check
            if (!content && !imageUrl) {
                logger.warn('⚠️ SITREP Relay: Empty content/image, skipping.');
                return;
            }

            const newsItem: NewsItem = {
                title: title,
                content: content,
                url: url,
                imageUrl: imageUrl,
                date: new Date(),
                source: 'Relay',
                author: {
                    name: authorName,
                    iconURL: authorIcon
                }
            };

            await newsService.postNews(newsItem);
            logger.info('✅ SITREP Relay: News posted successfully.');
            
            // React to confirm receipt (Visual feedback for admin/webhook)
            await message.react('✅').catch(() => {});

        } catch (error) {
            logger.error(error, '❌ SITREP Relay Failed');
            await message.react('❌').catch(() => {});
        }
    }
};

export default event;
