"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceManager = void 0;
const discord_js_1 = require("discord.js");
const logger_1 = __importDefault(require("../../core/logger"));
class VoiceManager {
    client;
    tempChannels = new Set();
    constructor(client) {
        this.client = client;
        this.startCleanupInterval();
    }
    // Called from VoiceStateUpdate event
    async handleStateUpdate(oldState, newState) {
        const member = newState.member;
        if (!member)
            return;
        // 1. Join to Create
        if (newState.channelId && newState.channel?.name === '➕ Criar Sala') {
            try {
                const guild = newState.guild;
                const category = newState.channel.parent;
                // Create Channel
                const newChannel = await guild.channels.create({
                    name: `Squad de ${member.user.username}`,
                    type: discord_js_1.ChannelType.GuildVoice,
                    parent: category?.id,
                    permissionOverwrites: [
                        { id: member.id, allow: ['Connect', 'ManageChannels'] }
                    ]
                });
                // Move Member
                await member.voice.setChannel(newChannel);
                this.tempChannels.add(newChannel.id);
                logger_1.default.info(`Temp Voice created: ${newChannel.name}`);
            }
            catch (e) {
                logger_1.default.error(e, 'Failed to create temp voice');
            }
        }
        // 2. Check Empty Temp Channels (on Leave/Switch)
        if (oldState.channelId && this.tempChannels.has(oldState.channelId)) {
            const channel = oldState.channel;
            if (channel && channel.members.size === 0) {
                try {
                    await channel.delete();
                    this.tempChannels.delete(channel.id);
                    logger_1.default.info(`Temp Voice deleted: ${channel.name}`);
                }
                catch (e) {
                    logger_1.default.error(e, 'Failed to delete temp voice');
                }
            }
        }
    }
    startCleanupInterval() {
        // Safety net: check for empty temp channels every 5 mins
        setInterval(() => {
            this.client.guilds.cache.forEach(guild => {
                guild.channels.cache.forEach(channel => {
                    if (this.tempChannels.has(channel.id) && channel.isVoiceBased() && channel.members.size === 0) {
                        channel.delete().catch(() => { });
                        this.tempChannels.delete(channel.id);
                    }
                });
            });
        }, 5 * 60 * 1000);
    }
}
exports.VoiceManager = VoiceManager;
