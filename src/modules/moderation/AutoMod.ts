import { Message, PermissionFlagsBits, EmbedBuilder, TextChannel } from 'discord.js';
import { LogManager, LogType, LogLevel } from '../logger/LogManager';
import { BAD_WORDS, SUSPICIOUS_DOMAINS } from './badWords';
import { WarningManager } from './WarningManager';

// Spam Tracking
const SPAM_MAP = new Map<string, { count: number, lastMsg: number }>();
const REPEAT_MAP = new Map<string, { content: string, count: number, lastMsg: number }>();

export class AutoMod {
    
    static async handle(message: Message): Promise<boolean> {
        if (message.author.bot) return false;

        // Admin Bypass
        if (message.member?.permissions.has(PermissionFlagsBits.Administrator) || 
            message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return false;
        }

        const contentLower = message.content.toLowerCase();

        // 1. Anti-Link (Invite & Suspicious Links)
        // Allow whitelisted domains (YouTube, etc) implicitly by only blocking known bad ones
        if (contentLower.includes('discord.gg/') || 
            contentLower.includes('discord.com/invite') ||
            SUSPICIOUS_DOMAINS.some(domain => contentLower.includes(domain))) {
            await this.punish(message, 'Divulgação de Links / Link Suspeito', true);
            return true;
        }

        // 2. Anti-Profanity / Scam
        if (BAD_WORDS.some(word => contentLower.includes(word))) {
            await this.punish(message, 'Linguagem Imprópria / Scam', true);
            return true;
        }

        // 3. Anti-Zalgo (Glitch Text)
        if (this.checkZalgo(message.content)) {
            await this.punish(message, 'Texto Glitch (Zalgo) detectado', true);
            return true;
        }

        // 4. Anti-Mass Mention (Raid)
        if (this.checkMassMention(message)) {
            await this.punish(message, 'Menção em Massa (Anti-Raid)', true);
            return true;
        }

        // 5. Anti-Emoji Spam (Flood Visual)
        if (this.checkEmojiSpam(message)) {
            await this.punish(message, 'Spam de Emojis', false); // No warn log for emojis initially, just delete
            return true;
        }

        // 6. Anti-Caps (Gritar)
        if (message.content.length > 15) { // Increased leniency slightly
            const capsCount = message.content.replace(/[^A-Z]/g, "").length;
            const percentage = capsCount / message.content.length;
            
            if (percentage > 0.75) { // 75% threshold
                await this.punish(message, 'Uso excessivo de CAPS LOCK', false); 
                return true;
            }
        }

        // 7. Anti-Spam (Fast Flood)
        if (this.checkSpam(message)) {
            try {
                await message.member?.timeout(60 * 1000, 'AutoMod: Spam/Flood Rápido');
                await this.punish(message, 'Spam/Flood Rápido detectado', true);
            } catch (e) {
                // Ignore timeout error if user has higher role or other issues
            }
            return true;
        }

        // 8. Anti-Repeat (Copy-Paste Flood)
        if (this.checkRepeatedText(message)) {
            await this.punish(message, 'Spam por Repetição (Copy-Paste)', true);
            return true;
        }

        return false;
    }

    // --- FILTERS ---

    private static checkZalgo(content: string): boolean {
        // Regex for Zalgo combining characters range
        // eslint-disable-next-line no-misleading-character-class
        const zalgoRegex = /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/g;
        const matches = content.match(zalgoRegex);
        // Threshold: If more than 10 combining chars are found, block it.
        return matches ? matches.length > 10 : false;
    }

    private static checkMassMention(message: Message): boolean {
        // Count unique user/role mentions
        const mentionCount = message.mentions.users.size + message.mentions.roles.size;
        // Also check for raw @everyone or @here if not allowed (though permissions usually handle this)
        const hasEveryone = message.content.includes('@everyone') || message.content.includes('@here');
        
        return mentionCount > 5 || (hasEveryone && !message.member?.permissions.has(PermissionFlagsBits.MentionEveryone));
    }

    private static checkEmojiSpam(message: Message): boolean {
        // Regex for Unicode Emojis and Custom Discord Emojis
        const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic}|<a?:.+?:\d+>)/gu;
        const matches = message.content.match(emojiRegex);
        
        return matches ? matches.length > 15 : false;
    }

    private static checkSpam(message: Message): boolean {
        const id = message.author.id;
        const now = Date.now();
        const data = SPAM_MAP.get(id) || { count: 0, lastMsg: 0 };

        if (now - data.lastMsg < 3000) { // 3 seconds
            data.count++;
        } else {
            data.count = 1;
        }

        data.lastMsg = now;
        SPAM_MAP.set(id, data);

        return data.count >= 5; // 5 messages in < 3s
    }

    private static checkRepeatedText(message: Message): boolean {
        const id = message.author.id;
        const now = Date.now();
        const content = message.content.trim().toLowerCase();
        
        if (content.length < 5) return false; // Ignore short messages like "ok", "lol"

        const data = REPEAT_MAP.get(id) || { content: '', count: 0, lastMsg: 0 };

        if (data.content === content && (now - data.lastMsg < 60000)) { // Same msg within 1 minute
            data.count++;
        } else {
            data.content = content;
            data.count = 1;
        }

        data.lastMsg = now;
        REPEAT_MAP.set(id, data);

        return data.count >= 4; // Block on 4th repetition
    }

    // --- ACTION ---

    private static async punish(message: Message, reason: string, log: boolean) {
        if (message.deletable) await message.delete().catch(() => {});

        // Warning Logic
        let warnCount = 0;
        // Only add DB warning for serious offenses, simple spam/caps might just get deleted
        if (message.member && log) { 
            warnCount = await WarningManager.addWarning(message.member, reason);
        }

        if (message.channel.isTextBased()) {
             const warning = await (message.channel as TextChannel).send(`⚠️ ${message.author}, mensagem interceptada: **${reason}**.`);
             setTimeout(() => warning.delete().catch(() => {}), 5000);
        }

        if (log) {
            await LogManager.log({
                guild: message.guild!,
                type: LogType.MODERATION,
                level: LogLevel.WARN,
                title: '🛡️ AutoMod Supremo',
                description: `Defesa automática ativada.`,
                executor: message.client.user!,
                target: message.author,
                fields: [
                    { name: 'Infração', value: reason, inline: true },
                    { name: 'Conteúdo', value: `\`\`\`${message.content.substring(0, 100)}\`\`\``, inline: false },
                    { name: 'Nível de Alerta', value: warnCount > 0 ? `Warn #${warnCount}` : 'Aviso Verbal', inline: true }
                ]
            });
        }
    }
}
