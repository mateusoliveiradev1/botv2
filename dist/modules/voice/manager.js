"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceManager = void 0;
const discord_js_1 = require("discord.js");
const logger_1 = __importDefault(require("../../core/logger"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const TEMP_CHANNELS_FILE = path_1.default.join(process.cwd(), 'data', 'temp_channels.json');
class VoiceManager {
    client;
    // Store temp channel IDs in a Set for fast lookup
    tempChannels = new Set();
    constructor(client) {
        this.client = client;
        this.loadState();
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
                // Create Channel with Advanced Permissions
                const newChannel = await guild.channels.create({
                    name: `🔊 | Squad de ${member.displayName}`,
                    type: discord_js_1.ChannelType.GuildVoice,
                    parent: category?.id,
                    permissionOverwrites: [
                        { id: guild.roles.everyone.id, allow: [discord_js_1.PermissionFlagsBits.Connect] }, // Public by default
                        { id: member.id, allow: [discord_js_1.PermissionFlagsBits.Connect, discord_js_1.PermissionFlagsBits.ManageChannels, discord_js_1.PermissionFlagsBits.MoveMembers] }
                    ]
                });
                // Save to State
                this.tempChannels.add(newChannel.id);
                this.saveState();
                // Move Member
                await member.voice.setChannel(newChannel);
                logger_1.default.info(`Temp Voice created: ${newChannel.name}`);
                // Send Control Panel to Text Chat
                const voiceTextChannel = newChannel;
                const embed = new discord_js_1.EmbedBuilder()
                    .setTitle('🎛️ Painel de Controle da Sala')
                    .setDescription(`Bem-vindo ao seu canal, **${member.displayName}**.\nUse os botões abaixo para gerenciar o squad.`)
                    .setColor('#0099FF')
                    .addFields({ name: '🔒 Privacidade', value: 'Trancar/Destrancar', inline: true }, { name: '✏️ Editar', value: 'Mudar Nome/Limite', inline: true }, { name: '🚫 Kick', value: 'Expulsar Usuário', inline: true });
                const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId('voice_lock').setLabel('🔒 Trancar').setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder().setCustomId('voice_unlock').setLabel('🔓 Destrancar').setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder().setCustomId('voice_rename').setLabel('✏️ Renomear').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId('voice_limit').setLabel('👥 Limite').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId('voice_kick').setLabel('🚫 Kick').setStyle(discord_js_1.ButtonStyle.Danger));
                await voiceTextChannel.send({ content: `<@${member.id}>`, embeds: [embed], components: [row] });
            }
            catch (e) {
                logger_1.default.error(e, 'Failed to create temp voice');
            }
        }
        // 2. Check Empty Temp Channels (on Leave/Switch)
        // Check OLD channel
        if (oldState.channelId) {
            const channel = oldState.channel;
            // STRICT CHECK: Only delete if ID is in our known Temp Channels list
            if (channel && this.tempChannels.has(channel.id) && channel.members.size === 0) {
                try {
                    await channel.delete();
                    this.tempChannels.delete(channel.id);
                    this.saveState();
                    logger_1.default.info(`Temp Voice deleted: ${channel.name}`);
                }
                catch (e) {
                    logger_1.default.error(e, 'Failed to delete temp voice');
                }
            }
        }
    }
    startCleanupInterval() {
        // Robust Cleanup: Check EVERY temp channel in our list
        setInterval(() => {
            this.client.guilds.cache.forEach(guild => {
                // Check all channels that are in our tempChannels Set
                this.tempChannels.forEach(channelId => {
                    const channel = guild.channels.cache.get(channelId);
                    if (channel && channel.isVoiceBased() && channel.members.size === 0) {
                        channel.delete().catch(e => logger_1.default.error(`Cleanup failed for ${channel.name}: ${e.message}`));
                        this.tempChannels.delete(channelId);
                        this.saveState();
                    }
                    else if (!channel) {
                        // Channel no longer exists, remove from set
                        this.tempChannels.delete(channelId);
                        this.saveState();
                    }
                });
            });
        }, 60 * 1000); // Check every 1 minute
    }
    loadState() {
        try {
            if (fs_1.default.existsSync(TEMP_CHANNELS_FILE)) {
                const data = JSON.parse(fs_1.default.readFileSync(TEMP_CHANNELS_FILE, 'utf-8'));
                if (Array.isArray(data)) {
                    this.tempChannels = new Set(data);
                }
            }
        }
        catch (e) {
            logger_1.default.error(e, 'Failed to load temp channels state');
        }
    }
    saveState() {
        try {
            const dir = path_1.default.dirname(TEMP_CHANNELS_FILE);
            if (!fs_1.default.existsSync(dir))
                fs_1.default.mkdirSync(dir, { recursive: true });
            fs_1.default.writeFileSync(TEMP_CHANNELS_FILE, JSON.stringify(Array.from(this.tempChannels), null, 2));
        }
        catch (e) {
            logger_1.default.error(e, 'Failed to save temp channels state');
        }
    }
}
exports.VoiceManager = VoiceManager;
