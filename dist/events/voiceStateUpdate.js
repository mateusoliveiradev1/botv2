"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const ready_1 = require("./ready");
const event = {
    name: discord_js_1.Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const member = newState.member;
        if (!member || member.user.bot)
            return;
        // Voice Manager (Temp Channels)
        if (ready_1.voiceManager) {
            await ready_1.voiceManager.handleStateUpdate(oldState, newState);
        }
        // Voice XP Service Logic (Existing)
        if (ready_1.voiceXpService) {
            // Joined Channel
            if (!oldState.channelId && newState.channelId) {
                if (!newState.selfMute && !newState.selfDeaf) {
                    ready_1.voiceXpService.onJoin(member.id);
                }
            }
            // Left Channel
            if (oldState.channelId && !newState.channelId) {
                ready_1.voiceXpService.onLeave(member.id);
            }
            // Toggle Mute/Deaf (Stop/Start tracking)
            if (oldState.channelId && newState.channelId) {
                if (newState.selfMute || newState.selfDeaf) {
                    ready_1.voiceXpService.onLeave(member.id); // Pause
                }
                else if ((oldState.selfMute || oldState.selfDeaf) && (!newState.selfMute && !newState.selfDeaf)) {
                    ready_1.voiceXpService.onJoin(member.id); // Resume
                }
            }
        }
    },
};
exports.default = event;
