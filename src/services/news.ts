import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import logger from '../core/logger';

const NEWS_STATE_PATH = path.join(process.cwd(), 'data', 'news_state.json');
const PUBG_APP_ID = 578080;
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes

interface NewsState {
  lastNewsId: string;
}

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
      const response = await axios.get(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${PUBG_APP_ID}&count=1`);
      const newsItems = response.data?.appnews?.newsitems;

      if (!newsItems || newsItems.length === 0) return;

      const latestNews = newsItems[0];
      const state = this.loadState();

      if (latestNews.gid === state.lastNewsId) {
        return; // No new news
      }

      // New news found!
      logger.info(`📰 New PUBG News found: ${latestNews.title}`);
      await this.postNews(latestNews);
      
      // Save state
      this.saveState({ lastNewsId: latestNews.gid });

    } catch (error) {
      logger.error(error, 'Failed to check Steam News');
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
        .replace(/\[.*?\]/g, '') // Remove remaining tags
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim();

    // Limit length
    if (cleanText.length > 400) {
        cleanText = cleanText.substring(0, 400) + '...';
    }

    // Translate common titles (Simple Dictionary)
    let title = news.title;
    if (title.includes('Weekly Bans')) title = '🚫 Relatório Semanal de Banimentos (Anti-Cheat)';
    if (title.includes('Patch Notes')) title = '🛠️ Notas de Atualização (Patch Notes)';
    if (title.includes('Maintenance')) title = '⚠️ Manutenção de Servidores';
    if (title.includes('Dev Letter')) title = '📨 Carta dos Desenvolvedores';

    // Convert timestamp
    const date = new Date(news.date * 1000);

    const embed = new EmbedBuilder()
      .setTitle(`📰 ${title}`)
      .setURL(news.url)
      .setDescription(`${cleanText}\n\n👉 [Ler notícia completa na Steam](${news.url})`)
      .setColor('#FF0000') // Red for Alert/News
      .setAuthor({ name: 'PUBG Corporation', iconURL: 'https://seeklogo.com/images/P/pubg-logo-FB8B0BE671-seeklogo.com.png' })
      .setFooter({ text: 'BlueZone Sentinel • Feed Automático', iconURL: guild.iconURL() || undefined })
      .setTimestamp(date);

    if (imageUrl) {
        embed.setImage(imageUrl);
    }

    await channel.send({ embeds: [embed] });
  }

  private loadState(): NewsState {
    try {
      if (fs.existsSync(NEWS_STATE_PATH)) {
        return JSON.parse(fs.readFileSync(NEWS_STATE_PATH, 'utf-8'));
      }
    } catch (e) { /* ignore */ }
    return { lastNewsId: '' };
  }

  private saveState(state: NewsState) {
    try {
        const dir = path.dirname(NEWS_STATE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(NEWS_STATE_PATH, JSON.stringify(state, null, 2));
    } catch (e) {
        logger.error(e, 'Failed to save news state');
    }
  }
}
