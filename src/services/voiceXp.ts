import { Client, Guild, GuildMember, Collection } from 'discord.js';
import { XpManager } from '../modules/xp/manager';
import { XP_RATES } from '../modules/xp/constants';
import logger from '../core/logger';
import { MissionManager } from '../modules/missions/manager';
import { MissionType } from '../modules/missions/constants';

export class VoiceXpService {
    private client: Client;
    private interval: NodeJS.Timeout | null = null;
    // Track when user joined: Map<memberId, timestamp>
    private joinedAt = new Map<string, number>();

    constructor(client: Client) {
        this.client = client;
    }

    public start() {
        logger.info('🎤 Voice XP Service Started');
        
        // Check every minute
        this.interval = setInterval(() => this.processVoiceXp(), 60 * 1000);

        // Initial scan (in case bot restarted while people are in voice)
        this.scanVoiceChannels();
    }

    private scanVoiceChannels() {
        this.client.guilds.cache.forEach(guild => {
            guild.channels.cache.forEach(channel => {
                if (channel.isVoiceBased()) {
                    channel.members.forEach(member => {
                        if (!member.user.bot && !member.voice.selfMute && !member.voice.selfDeaf) {
                            this.joinedAt.set(member.id, Date.now());
                        }
                    });
                }
            });
        });
    }

    private async processVoiceXp() {
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;
        const oneMinute = 60 * 1000;

        for (const [memberId, joinTime] of this.joinedAt.entries()) {
            // Check if user is still in voice (double check)
            // Ideally we rely on VoiceStateUpdate to remove them, but let's be safe.
            // Fetching member every time is heavy. We'll rely on the event to ADD/REMOVE from this map.
            // BUT, for the actual XP award, we need the member object.
            
            // 1. Mission Tracking (Update every minute)
            // This assumes processVoiceXp runs every minute
            MissionManager.track(memberId, MissionType.VOICE, 1); // +1 Minute
            
            if (now - joinTime >= tenMinutes) {
                // Award XP
                try {
                    // Try to find member in cache first
                    const guild = this.client.guilds.cache.first(); // Assuming single guild for now or iterate
                    if (guild) {
                        const member = await guild.members.fetch(memberId).catch(() => null);
                        if (member && member.voice.channelId) {
                             await XpManager.addXp(member, 50); // 50 XP per 10 mins
                             // Reset timer to now (so they get another 50 in 10 mins)
                             this.joinedAt.set(memberId, now);
                             // logger.debug(`Awarded Voice XP to ${member.user.tag}`);
                        } else {
                            // User not found or not in voice anymore
                            this.joinedAt.delete(memberId);
                        }
                    }
                } catch (e) {
                    logger.error(e, `Error awarding voice XP to ${memberId}`);
                }
            }
        }
    }

    // Public methods to be called from Event
    public onJoin(memberId: string) {
        this.joinedAt.set(memberId, Date.now());
    }

    public onLeave(memberId: string) {
        this.joinedAt.delete(memberId);
    }
}
