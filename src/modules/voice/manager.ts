import { Client, VoiceState, ChannelType, CategoryChannel, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel, ModalBuilder, TextInputBuilder, TextInputStyle, GuildMember, UserSelectMenuBuilder, Interaction, MessageFlags } from 'discord.js';
import logger from '../../core/logger';
import fs from 'fs';
import path from 'path';
import { LogManager, LogType, LogLevel } from '../logger/LogManager';

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

    public static async handleInteraction(interaction: Interaction) {
        if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isUserSelectMenu()) return;

        // Button Handling
        if (interaction.isButton() && interaction.customId.startsWith('voice_')) {
            const member = interaction.member as GuildMember;
            
            // 1. Validate Channel Presence
            if (!member.voice.channel) {
                await interaction.reply({ content: '❌ Você precisa estar em um canal de voz.', flags: MessageFlags.Ephemeral });
                return;
            }

            // 2. Validate Ownership (ManageChannels)
            const channel = member.voice.channel;
            const isOwner = channel.permissionsFor(member).has(PermissionFlagsBits.ManageChannels);

            if (!isOwner) {
                await interaction.reply({ content: '⛔ Você não tem permissão para gerenciar esta sala.', flags: MessageFlags.Ephemeral });
                return;
            }

            // 3. Route Actions
            switch (interaction.customId) {
                case 'voice_lock':
                    await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: false });
                    
                    await LogManager.log({
                        guild: interaction.guild!,
                        type: LogType.SYSTEM,
                        level: LogLevel.WARN,
                        title: "🔒 Sala de Voz Trancada",
                        description: `O acesso à sala foi bloqueado.`,
                        executor: interaction.user,
                        fields: [{ name: "Canal", value: channel.name, inline: true }]
                    });

                    await interaction.reply({ content: '🔒 **Sala Trancada!** Ninguém mais pode entrar.', flags: MessageFlags.Ephemeral });
                    break;

                case 'voice_unlock':
                    await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: true });

                    await LogManager.log({
                        guild: interaction.guild!,
                        type: LogType.SYSTEM,
                        level: LogLevel.INFO,
                        title: "🔓 Sala de Voz Destrancada",
                        description: `O acesso à sala foi liberado.`,
                        executor: interaction.user,
                        fields: [{ name: "Canal", value: channel.name, inline: true }]
                    });

                    await interaction.reply({ content: '🔓 **Sala Destrancada!** Entrada liberada.', flags: MessageFlags.Ephemeral });
                    break;

                case 'voice_rename':
                    const renameModal = new ModalBuilder()
                        .setCustomId('voice_rename_modal')
                        .setTitle('✏️ Renomear Sala');

                    const nameInput = new TextInputBuilder()
                        .setCustomId('voice_name_input')
                        .setLabel("Novo Nome")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder(`Squad de ${member.displayName}`)
                        .setMaxLength(30)
                        .setRequired(true);

                    renameModal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput));
                    await interaction.showModal(renameModal);
                    break;

                case 'voice_limit':
                    const limitModal = new ModalBuilder()
                        .setCustomId('voice_limit_modal')
                        .setTitle('👥 Limite de Usuários');

                    const limitInput = new TextInputBuilder()
                        .setCustomId('voice_limit_input')
                        .setLabel("Número (0 = Sem limite)")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Ex: 4")
                        .setMaxLength(2)
                        .setRequired(true);

                    limitModal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput));
                    await interaction.showModal(limitModal);
                    break;

                case 'voice_kick':
                    const userSelect = new UserSelectMenuBuilder()
                        .setCustomId('voice_kick_select')
                        .setPlaceholder('Selecione quem você quer expulsar')
                        .setMaxValues(1);

                    const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);
                    
                    await interaction.reply({ 
                        content: '🚫 **Selecione o usuário para expulsar da sala:**',
                        components: [row],
                        flags: MessageFlags.Ephemeral 
                    });
                    break;
            }
            return;
        }

        // Modal Handling
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'voice_rename_modal') {
                const newName = interaction.fields.getTextInputValue('voice_name_input');
                const member = interaction.member as GuildMember;
                
                if (member.voice.channel && member.voice.channel.permissionsFor(member).has(PermissionFlagsBits.ManageChannels)) {
                    const oldName = member.voice.channel.name;
                    await member.voice.channel.setName(`🔊 | ${newName}`);
                    
                    await LogManager.log({
                        guild: interaction.guild!,
                        type: LogType.SYSTEM,
                        level: LogLevel.INFO,
                        title: "✏️ Sala Renomeada",
                        description: `Nome do canal de voz alterado.`,
                        executor: interaction.user,
                        fields: [
                            { name: "Antigo", value: oldName, inline: true },
                            { name: "Novo", value: `🔊 | ${newName}`, inline: true }
                        ]
                    });

                    await interaction.reply({ content: `✅ Sala renomeada para: **${newName}**`, flags: MessageFlags.Ephemeral });
                }
            }

            if (interaction.customId === 'voice_limit_modal') {
                const limit = parseInt(interaction.fields.getTextInputValue('voice_limit_input'));
                const member = interaction.member as GuildMember;
                
                if (!isNaN(limit) && member.voice.channel && member.voice.channel.permissionsFor(member).has(PermissionFlagsBits.ManageChannels)) {
                    await member.voice.channel.setUserLimit(limit);

                    await LogManager.log({
                        guild: interaction.guild!,
                        type: LogType.SYSTEM,
                        level: LogLevel.INFO,
                        title: "👥 Limite de Voz Alterado",
                        description: `Capacidade da sala ajustada.`,
                        executor: interaction.user,
                        fields: [
                            { name: "Canal", value: member.voice.channel.name, inline: true },
                            { name: "Novo Limite", value: limit === 0 ? "Ilimitado" : `${limit}`, inline: true }
                        ]
                    });

                    await interaction.reply({ content: `✅ Limite ajustado para: **${limit === 0 ? 'Ilimitado' : limit}**`, flags: MessageFlags.Ephemeral });
                }
            }
            return;
        }

        // Select Menu Handling (Kick)
        if (interaction.isUserSelectMenu() && interaction.customId === 'voice_kick_select') {
            const targetUserId = interaction.values[0];
            const member = interaction.member as GuildMember;
            
            if (!member.voice.channel) {
                await interaction.reply({ content: '❌ Você não está em um canal de voz.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (!member.voice.channel.permissionsFor(member).has(PermissionFlagsBits.ManageChannels)) {
                await interaction.reply({ content: '⛔ Sem permissão.', flags: MessageFlags.Ephemeral });
                return;
            }

            const targetMember = await interaction.guild?.members.fetch(targetUserId);
            if (!targetMember) return;

            if (targetMember.voice.channelId !== member.voice.channelId) {
                await interaction.reply({ content: '❌ Esse usuário não está na sua sala.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (targetMember.id === member.id) {
                 await interaction.reply({ content: '❌ Você não pode se expulsar.', flags: MessageFlags.Ephemeral });
                 return;
            }

            try {
                await targetMember.voice.setChannel(null, `Expulso por ${member.displayName}`);

                await LogManager.log({
                    guild: interaction.guild!,
                    type: LogType.MODERATION,
                    level: LogLevel.DANGER,
                    title: "👢 Expulsão de Voz",
                    description: `Usuário removido da sala de voz.`,
                    executor: interaction.user,
                    fields: [
                        { name: "Alvo", value: targetMember.user.tag, inline: true },
                        { name: "Sala", value: member.voice.channel?.name || "Desconhecida", inline: true }
                    ]
                });

                await interaction.reply({ content: `👢 **${targetMember.displayName}** foi removido da sala.`, flags: MessageFlags.Ephemeral });
            } catch (e) {
                await interaction.reply({ content: '❌ Erro ao expulsar usuário (permissões insuficientes?).', flags: MessageFlags.Ephemeral });
            }
        }
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

    // New: Cleanup Orphans Method (Public)
    public async cleanupOrphans() {
        logger.info('🧹 Running Orphaned Voice Channels Cleanup...');
        let cleaned = 0;

        // Iterate over all cached guilds
        this.client.guilds.cache.forEach(async (guild) => {
            // Check stored temp channels
            for (const channelId of this.tempChannels) {
                const channel = guild.channels.cache.get(channelId);
                
                // If channel exists but is empty
                if (channel && channel.isVoiceBased() && channel.members.size === 0) {
                    try {
                        await channel.delete();
                        this.tempChannels.delete(channelId);
                        cleaned++;
                        logger.info(`🧹 Cleaned orphan channel: ${channel.name}`);
                    } catch (e) {
                        logger.error(`Failed to delete orphan ${channelId}`);
                    }
                } 
                // If channel doesn't exist anymore (deleted while offline)
                else if (!channel) {
                    this.tempChannels.delete(channelId);
                }
            }
        });

        this.saveState();
        logger.info(`✅ Cleanup complete. Removed ${cleaned} orphans.`);
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
