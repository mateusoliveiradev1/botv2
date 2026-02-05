import { Events, VoiceState } from 'discord.js';
import { BotEvent } from '../types';
import { voiceXpService, voiceManager } from './ready';

const event: BotEvent = {
  name: Events.VoiceStateUpdate,
  async execute(oldState: VoiceState, newState: VoiceState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    // Voice Manager (Temp Channels)
    if (voiceManager) {
        await voiceManager.handleStateUpdate(oldState, newState);
    }

    // Voice XP Service Logic (Existing)
    if (voiceXpService) {
        // Joined Channel
        if (!oldState.channelId && newState.channelId) {
            if (!newState.selfMute && !newState.selfDeaf) {
                voiceXpService.onJoin(member.id);
            }
        }

        // Left Channel
        if (oldState.channelId && !newState.channelId) {
            voiceXpService.onLeave(member.id);
        }

        // Toggle Mute/Deaf (Stop/Start tracking)
        if (oldState.channelId && newState.channelId) {
            if (newState.selfMute || newState.selfDeaf) {
                voiceXpService.onLeave(member.id); // Pause
            } else if ((oldState.selfMute || oldState.selfDeaf) && (!newState.selfMute && !newState.selfDeaf)) {
                voiceXpService.onJoin(member.id); // Resume
            }
        }
    }
  },
};

export default event;
