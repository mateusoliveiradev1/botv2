"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceXpService = void 0;
const manager_1 = require("../modules/xp/manager");
const logger_1 = __importDefault(require("../core/logger"));
const manager_2 = require("../modules/missions/manager");
const constants_1 = require("../modules/missions/constants");
class VoiceXpService {
    client;
    interval = null;
    // Track when user joined: Map<memberId, timestamp>
    joinedAt = new Map();
    constructor(client) {
        this.client = client;
    }
    start() {
        logger_1.default.info('🎤 Voice XP Service Started');
        // Check every minute
        this.interval = setInterval(() => this.processVoiceXp(), 60 * 1000);
        // Initial scan (in case bot restarted while people are in voice)
        this.scanVoiceChannels();
    }
    scanVoiceChannels() {
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
    async processVoiceXp() {
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
            manager_2.MissionManager.track(memberId, constants_1.MissionType.VOICE, 1); // +1 Minute
            if (now - joinTime >= tenMinutes) {
                // Award XP
                try {
                    // Try to find member in cache first
                    const guild = this.client.guilds.cache.first(); // Assuming single guild for now or iterate
                    if (guild) {
                        const member = await guild.members.fetch(memberId).catch(() => null);
                        if (member && member.voice.channelId) {
                            await manager_1.XpManager.addXp(member, 50); // 50 XP per 10 mins
                            // Reset timer to now (so they get another 50 in 10 mins)
                            this.joinedAt.set(memberId, now);
                            // logger.debug(`Awarded Voice XP to ${member.user.tag}`);
                        }
                        else {
                            // User not found or not in voice anymore
                            this.joinedAt.delete(memberId);
                        }
                    }
                }
                catch (e) {
                    logger_1.default.error(e, `Error awarding voice XP to ${memberId}`);
                }
            }
        }
    }
    // Public methods to be called from Event
    onJoin(memberId) {
        this.joinedAt.set(memberId, Date.now());
    }
    onLeave(memberId) {
        this.joinedAt.delete(memberId);
    }
}
exports.VoiceXpService = VoiceXpService;
