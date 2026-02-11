import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import logger from '../core/logger';
import { db } from '../core/DatabaseManager';

const PUBG_APP_ID = 578080;
// const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes (Unused in Relay Mode)

export interface NewsItem {
    title: string;
    content: string;
    url?: string;
    imageUrl?: string;
    date: Date;
    source: string; // 'Steam' | 'Relay' | 'Manual'
    author?: { name: string, iconURL?: string };
}

export class NewsService {
  private client: Client;
  private interval: NodeJS.Timeout | null = null;

  constructor(client: Client) {
    this.client = client;
  }

  public start() {
    logger.info('📰 News Service Started (Relay Mode Active)');
    // Polling disabled in favor of Relay System (SITREP Ninja)
    // this.checkNews(); 
    // this.interval = setInterval(() => this.checkNews(), CHECK_INTERVAL);
  }

  /**
   * Posts a formatted news item to the official channel
   */
  public async postNews(news: NewsItem) {
    const guild = this.client.guilds.cache.first(); // Assuming single guild bot
    if (!guild) return;

    const channel = guild.channels.cache.find(c => c.name === '📢-sitrep') as TextChannel;
    if (!channel) {
        logger.warn('⚠️ #sitrep channel not found for news');
        return;
    }

    // Translate common titles if from Relay/Steam (Simple Dictionary)
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

    const embed = new EmbedBuilder()
      .setTitle(`${icon} ${title}`)
      .setDescription(`${news.content}\n\n${news.url ? `👉 [**Clique para ler a notícia completa**](${news.url})` : ''}`)
      .setColor('#FF0000') // Red for Alert/News
      .setAuthor(news.author || { name: 'PUBG Corporation', iconURL: 'https://seeklogo.com/images/P/pubg-logo-FB8B0BE671-seeklogo.com.png' })
      .setFooter({ text: 'BlueZone Sentinel • Inteligência Oficial', iconURL: guild.iconURL() || undefined })
      .setTimestamp(news.date);

    if (news.imageUrl) {
        embed.setImage(news.imageUrl);
    } else if (news.source === 'Steam') {
         // Fallback logic for Steam
         if (news.title.includes('Update') || news.title.includes('Patch')) embed.setImage('https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg');
         else if (news.title.includes('Store') || news.title.includes('Shop')) embed.setImage('https://pbs.twimg.com/media/Fv8g_aWXsAEyv8_.jpg');
         else if (news.title.includes('Esports')) embed.setImage('https://esports.pubg.com/img/og_image.jpg');
         else if (news.title.includes('Bans')) embed.setImage('https://pbs.twimg.com/media/F3t_2wXWoAA_g2_.jpg');
    }

    await channel.send({ embeds: [embed] });
  }

  // Kept for reference or manual trigger, adapted to use postNews
  private async checkNews() {
    try {
      const response = await axios.get(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${PUBG_APP_ID}&count=3`, {
        timeout: 10000
      });
      const newsItems = response.data?.appnews?.newsitems;

      if (!newsItems || newsItems.length === 0) return;

      const sortedNews = newsItems.sort((a: any, b: any) => a.date - b.date);
      
      const state = await this.loadState();
      const lastPostedId = state;
      let newLastId = lastPostedId;

      if (lastPostedId === '') {
           const latest = sortedNews[sortedNews.length - 1];
           await this.processSteamNews(latest);
           await this.saveState(latest.gid);
           return;
      }

      for (const news of sortedNews) {
        if (news.gid === lastPostedId) continue;
        const newsDate = news.date * 1000;
        const twoDaysAgo = Date.now() - (48 * 60 * 60 * 1000);
        if (newsDate < twoDaysAgo) continue;

        if (news.gid !== newLastId && news.gid !== lastPostedId) {
             await this.processSteamNews(news);
             newLastId = news.gid;
        }
      }
      
      if (newLastId !== lastPostedId) {
        await this.saveState(newLastId);
      }

    } catch (error: any) {
       logger.error(error, 'Failed to check Steam News');
    }
  }

  private async processSteamNews(steamNews: any) {
      // 1. Clean Content
      const content = steamNews.contents || '';
      const imgMatch = content.match(/\[img\](.*?)\[\/img\]/);
      let imageUrl = imgMatch ? imgMatch[1] : undefined;

      if (imageUrl && imageUrl.includes('{STEAM_CLAN_IMAGE}')) {
        imageUrl = imageUrl.replace('{STEAM_CLAN_IMAGE}', 'https://clan.cloudflare.steamstatic.com/images');
      }

      let cleanText = content
        .replace(/\[img\].*?\[\/img\]/g, '')
        .replace(/\[url=.*?\](.*?)\[\/url\]/g, '$1')
        .replace(/\[b\](.*?)\[\/b\]/g, '**$1**')
        .replace(/\[h1\](.*?)\[\/h1\]/g, '**$1**\n')
        .replace(/\[h2\](.*?)\[\/h2\]/g, '**$1**\n')
        .replace(/\[h3\](.*?)\[\/h3\]/g, '**$1**\n')
        .replace(/\[list\]/g, '')
        .replace(/\[\/list\]/g, '')
        .replace(/\[\*\]/g, '• ')
        .replace(/\[.*?\]/g, '')
        .replace(/\*\*\s*\*\*/g, '')
        .replace(/^\s*[\r\n]/gm, '')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      cleanText = cleanText.replace(/Read the full announcement here!/gi, '');
      cleanText = cleanText.replace(/Click here for more details/gi, '');
      
      if (cleanText.startsWith('**')) cleanText = cleanText.substring(2).trim();
      if (cleanText.startsWith('**')) cleanText = cleanText.substring(2).trim();

      if (cleanText.length > 400) cleanText = cleanText.substring(0, 400) + '...';

      const newsItem: NewsItem = {
          title: steamNews.title,
          content: cleanText,
          url: steamNews.url,
          imageUrl: imageUrl,
          date: new Date(steamNews.date * 1000),
          source: 'Steam'
      };

      await this.postNews(newsItem);
  }

  private async loadState(): Promise<string> {
    try {
        const state = await db.read(async (prisma) => prisma.systemState.findUnique({
            where: { key: 'lastNewsId' }
        }));
        return state?.value || '';
    } catch (e) {
        return '';
    }
  }

  private async saveState(lastNewsId: string) {
    await db.write(async (prisma) => {
        await prisma.systemState.upsert({
            where: { key: 'lastNewsId' },
            update: { value: lastNewsId },
            create: { key: 'lastNewsId', value: lastNewsId }
        });
    });
  }
}
