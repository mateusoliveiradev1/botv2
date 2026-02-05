import { Client, VoiceState, ChannelType, CategoryChannel, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import logger from '../../core/logger';
import fs from 'fs';
import path from 'path';

const TEMP_CHANNELS_FILE = path.join(process.cwd(), 'data', 'temp_channels.json');

export class VoiceManager {
    private client: Client;
    // Store temp channel IDs in a Set for fast lookup
    private tempChannels = new Set<string>();

    constructor(client: Client) {
        this.client = client;
        this.loadState();
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

                // Create Channel with Advanced Permissions
                const newChannel = await guild.channels.create({
                    name: `🔊 | Squad de ${member.displayName}`,
                    type: ChannelType.GuildVoice,
                    parent: category?.id,
                    permissionOverwrites: [
                        { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.Connect] }, // Public by default
                        { id: member.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers] }
                    ]
                });

                // Save to State
                this.tempChannels.add(newChannel.id);
                this.saveState();

                // Move Member
                await member.voice.setChannel(newChannel);
                logger.info(`Temp Voice created: ${newChannel.name}`);

                // Send Control Panel to Text Chat
                const voiceTextChannel = newChannel as unknown as TextChannel; 
                
                const embed = new EmbedBuilder()
                    .setTitle('🎛️ Painel de Controle da Sala')
                    .setDescription(`Bem-vindo ao seu canal, **${member.displayName}**.\nUse os botões abaixo para gerenciar o squad.`)
                    .setColor('#0099FF')
                    .addFields(
                        { name: '🔒 Privacidade', value: 'Trancar/Destrancar', inline: true },
                        { name: '✏️ Editar', value: 'Mudar Nome/Limite', inline: true },
                        { name: '🚫 Kick', value: 'Expulsar Usuário', inline: true }
                    );

                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId('voice_lock').setLabel('🔒 Trancar').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('voice_unlock').setLabel('🔓 Destrancar').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('voice_rename').setLabel('✏️ Renomear').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('voice_limit').setLabel('👥 Limite').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('voice_kick').setLabel('🚫 Kick').setStyle(ButtonStyle.Danger)
                );

                await voiceTextChannel.send({ content: `<@${member.id}>`, embeds: [embed], components: [row] });

            } catch (e) {
                logger.error(e, 'Failed to create temp voice');
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
                    logger.info(`Temp Voice deleted: ${channel.name}`);
                } catch (e) {
                    logger.error(e, 'Failed to delete temp voice');
                }
            }
        }
    }

    private startCleanupInterval() {
        // Robust Cleanup: Check EVERY temp channel in our list
        setInterval(() => {
            this.client.guilds.cache.forEach(guild => {
                // Check all channels that are in our tempChannels Set
                this.tempChannels.forEach(channelId => {
                    const channel = guild.channels.cache.get(channelId);
                    if (channel && channel.isVoiceBased() && channel.members.size === 0) {
                        channel.delete().catch(e => logger.error(`Cleanup failed for ${channel.name}: ${e.message}`));
                        this.tempChannels.delete(channelId);
                        this.saveState();
                    } else if (!channel) {
                        // Channel no longer exists, remove from set
                        this.tempChannels.delete(channelId);
                        this.saveState();
                    }
                });
            });
        }, 60 * 1000); // Check every 1 minute
    }

    private loadState() {
        try {
            if (fs.existsSync(TEMP_CHANNELS_FILE)) {
                const data = JSON.parse(fs.readFileSync(TEMP_CHANNELS_FILE, 'utf-8'));
                if (Array.isArray(data)) {
                    this.tempChannels = new Set(data);
                }
            }
        } catch (e) {
            logger.error(e, 'Failed to load temp channels state');
        }
    }

    private saveState() {
        try {
            const dir = path.dirname(TEMP_CHANNELS_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(TEMP_CHANNELS_FILE, JSON.stringify(Array.from(this.tempChannels), null, 2));
        } catch (e) {
            logger.error(e, 'Failed to save temp channels state');
        }
    }
}
