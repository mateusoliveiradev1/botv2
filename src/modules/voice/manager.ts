import { Client, VoiceState, ChannelType, CategoryChannel } from 'discord.js';
import logger from '../../core/logger';

export class VoiceManager {
    private client: Client;
    private tempChannels = new Set<string>();

    constructor(client: Client) {
        this.client = client;
        this.startCleanupInterval();
    }

    // Called from VoiceStateUpdate event
    public async handleStateUpdate(oldState: VoiceState, newState: VoiceState) {
        const member = newState.member;
        if (!member) return;

        // 1. Join to Create
        if (newState.channelId && newState.channel?.name === '➕ Criar Sala') {
            try {
                const guild = newState.guild;
                const category = newState.channel.parent;

                // Create Channel
                const newChannel = await guild.channels.create({
                    name: `Squad de ${member.user.username}`,
                    type: ChannelType.GuildVoice,
                    parent: category?.id,
                    permissionOverwrites: [
                        { id: member.id, allow: ['Connect', 'ManageChannels'] }
                    ]
                });

                // Move Member
                await member.voice.setChannel(newChannel);
                this.tempChannels.add(newChannel.id);
                logger.info(`Temp Voice created: ${newChannel.name}`);
            } catch (e) {
                logger.error(e, 'Failed to create temp voice');
            }
        }

        // 2. Check Empty Temp Channels (on Leave/Switch)
        if (oldState.channelId && this.tempChannels.has(oldState.channelId)) {
            const channel = oldState.channel;
            if (channel && channel.members.size === 0) {
                try {
                    await channel.delete();
                    this.tempChannels.delete(channel.id);
                    logger.info(`Temp Voice deleted: ${channel.name}`);
                } catch (e) {
                    logger.error(e, 'Failed to delete temp voice');
                }
            }
        }
    }

    private startCleanupInterval() {
        // Safety net: check for empty temp channels every 5 mins
        setInterval(() => {
            this.client.guilds.cache.forEach(guild => {
                guild.channels.cache.forEach(channel => {
                    if (this.tempChannels.has(channel.id) && channel.isVoiceBased() && channel.members.size === 0) {
                        channel.delete().catch(() => {});
                        this.tempChannels.delete(channel.id);
                    }
                });
            });
        }, 5 * 60 * 1000);
    }
}
