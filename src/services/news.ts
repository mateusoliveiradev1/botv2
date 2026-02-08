import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import logger from '../core/logger';
import prisma from '../core/prisma';

const PUBG_APP_ID = 578080;
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes

export class NewsService {
  private client: Client;
  private interval: NodeJS.Timeout | null = null;

  constructor(client: Client) {
    this.client = client;
  }

  public start() {
    logger.info('📰 News Service Started');
    this.checkNews(); // Check immediately
    this.interval = setInterval(() => this.checkNews(), CHECK_INTERVAL);
  }

  private async checkNews() {
    try {
      // Fetch more items to catch up on missed news (count=3)
      const response = await axios.get(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${PUBG_APP_ID}&count=3`, {
        timeout: 10000
      });
      const newsItems = response.data?.appnews?.newsitems;

      if (!newsItems || newsItems.length === 0) return;

      // Sort by date ascending to post oldest first if multiple new items
      const sortedNews = newsItems.sort((a: any, b: any) => a.date - b.date);
      
      const state = await this.loadState();
      let lastPostedId = state;
      let newLastId = lastPostedId;

      // First time initialization logic
      if (lastPostedId === '') {
           const latest = sortedNews[sortedNews.length - 1];
           await this.postNews(latest);
           await this.saveState(latest.gid);
           return;
      }

      for (const news of sortedNews) {
        if (news.gid === lastPostedId) continue;

        const newsDate = news.date * 1000;
        const twoDaysAgo = Date.now() - (48 * 60 * 60 * 1000);
        if (newsDate < twoDaysAgo) continue;

        if (news.gid !== newLastId && news.gid !== lastPostedId) {
             await this.postNews(news);
             newLastId = news.gid;
        }
      }
      
      if (newLastId !== lastPostedId) {
        await this.saveState(newLastId);
      }

    } catch (error: any) {
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
         logger.warn(`⚠️ Steam News Network Error: ${error.message}. Retrying in 30min.`);
      } else {
         logger.error(error, 'Failed to check Steam News');
      }
    }
  }

  private async postNews(news: any) {
    const guild = this.client.guilds.cache.first(); // Assuming single guild bot
    if (!guild) return;

    const channel = guild.channels.cache.find(c => c.name === '📢-sitrep') as TextChannel;
    if (!channel) {
        logger.warn('⚠️ #sitrep channel not found for news');
        return;
    }

    // 1. BBCode Parsing & Cleaning
    let content = news.contents || '';
    
    // Extract Image (find [img]...[/img])
    const imgMatch = content.match(/\[img\](.*?)\[\/img\]/);
    let imageUrl = imgMatch ? imgMatch[1] : null;

    // Fix Steam Clan Image URL (The weird {STEAM_CLAN_IMAGE} placeholder)
    if (imageUrl && imageUrl.includes('{STEAM_CLAN_IMAGE}')) {
        imageUrl = imageUrl.replace('{STEAM_CLAN_IMAGE}', 'https://clan.cloudflare.steamstatic.com/images');
    }

    // Remove tags for clean text description
    let cleanText = content
        .replace(/\[img\].*?\[\/img\]/g, '') // Remove images
        .replace(/\[url=.*?\](.*?)\[\/url\]/g, '$1') // Keep link text
        .replace(/\[b\](.*?)\[\/b\]/g, '**$1**') // Bold
        .replace(/\[h1\](.*?)\[\/h1\]/g, '**$1**\n') // Headers
        .replace(/\[h2\](.*?)\[\/h2\]/g, '**$1**\n')
        .replace(/\[h3\](.*?)\[\/h3\]/g, '**$1**\n')
        .replace(/\[list\]/g, '')
        .replace(/\[\/list\]/g, '')
        .replace(/\[\*\]/g, '• ')
        .replace(/\[.*?\]/g, '') // Remove remaining tags
        .replace(/\*\*\s*\*\*/g, '') // Remove empty bold tags (**) left behind
        .replace(/^\s*[\r\n]/gm, '') // Remove empty lines
        .replace(/\n\s*\n/g, '\n') // Remove excessive newlines
        .trim();

    // Clean redundant text like "Read the full announcement here!" and stray asterisks
    cleanText = cleanText.replace(/Read the full announcement here!/gi, '');
    cleanText = cleanText.replace(/Click here for more details/gi, '');
    
    // Remove starting asterisks if any (common in badly parsed markdown)
    if (cleanText.startsWith('**')) {
        cleanText = cleanText.substring(2).trim();
    }
    if (cleanText.startsWith('**')) { // Double check for 4 asterisks
        cleanText = cleanText.substring(2).trim();
    }

    // Fallback Image Logic if no [img] found
    if (!imageUrl) {
         if (news.title.includes('Update') || news.title.includes('Patch')) imageUrl = 'https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg';
         else if (news.title.includes('Store') || news.title.includes('Shop')) imageUrl = 'https://pbs.twimg.com/media/Fv8g_aWXsAEyv8_.jpg';
         else if (news.title.includes('Esports')) imageUrl = 'https://esports.pubg.com/img/og_image.jpg';
         else if (news.title.includes('Bans')) imageUrl = 'https://pbs.twimg.com/media/F3t_2wXWoAA_g2_.jpg';
    }

    // Limit length
    if (cleanText.length > 400) {
        cleanText = cleanText.substring(0, 400) + '...';
    }

    // Translate common titles (Simple Dictionary)
    let title = news.title;
    let icon = '📰';
    
    // Auto-Translate Titles
    if (title.includes('Weekly Bans')) { title = 'Relatório Semanal de Banimentos'; icon = '🚫'; }
    else if (title.includes('Patch Notes')) { title = 'Notas de Atualização'; icon = '🛠️'; }
    else if (title.includes('Update')) { title = 'Nova Atualização Disponível'; icon = '🔄'; }
    else if (title.includes('Maintenance')) { title = 'Manutenção de Servidores'; icon = '⚠️'; }
    else if (title.includes('Dev Letter')) { title = 'Carta dos Desenvolvedores'; icon = '📨'; }
    else if (title.includes('Special Drops')) { title = 'Drops Especiais & Eventos'; icon = '🎁'; }
    else if (title.includes('Store Update')) { title = 'Atualização da Loja'; icon = '🛒'; }
    else if (title.includes('Survivor Pass')) { title = 'Novo Passe de Sobrevivente'; icon = '🎫'; }
    else if (title.includes('Esports')) { title = 'PUBG Esports'; icon = '🏆'; }

    // Clean redundant text like "Read the full announcement here!"
    cleanText = cleanText.replace(/Read the full announcement here!/gi, '');
    cleanText = cleanText.replace(/Click here for more details/gi, '');

    // Convert timestamp
    const date = new Date(news.date * 1000);

    const embed = new EmbedBuilder()
      .setTitle(`${icon} ${title}`)
      .setURL(news.url)
      .setDescription(`${cleanText}\n\n👉 [**Clique para ler a notícia completa**](${news.url})`)
      .setColor('#FF0000') // Red for Alert/News
      .setAuthor({ name: 'PUBG Corporation', iconURL: 'https://seeklogo.com/images/P/pubg-logo-FB8B0BE671-seeklogo.com.png' })
      .setFooter({ text: 'BlueZone Sentinel • Inteligência Oficial', iconURL: guild.iconURL() || undefined })
      .setTimestamp(date);

    if (imageUrl) {
        embed.setImage(imageUrl);
    }

    await channel.send({ embeds: [embed] });
  }

  private async loadState(): Promise<string> {
    const state = await prisma.systemState.findUnique({
        where: { key: 'lastNewsId' }
    });
    return state?.value || '';
  }

  private async saveState(lastNewsId: string) {
    await prisma.systemState.upsert({
        where: { key: 'lastNewsId' },
        update: { value: lastNewsId },
        create: { key: 'lastNewsId', value: lastNewsId }
    });
  }
}
