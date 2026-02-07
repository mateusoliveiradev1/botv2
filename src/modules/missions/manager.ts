import fs from 'fs';
import path from 'path';
import { Client, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildMember } from 'discord.js';
import { MISSION_POOL, MissionTemplate, MissionType } from './constants';
import logger from '../../core/logger';
import { XpManager } from '../xp/manager';
import { EmbedFactory } from '../../utils/embeds';

const DB_PATH = path.join(process.cwd(), 'data', 'daily_missions.json');

interface UserProgress {
    [missionId: string]: {
        current: number;
        claimed: boolean;
    };
}

interface MissionsData {
    date: string; // YYYY-MM-DD
    activeMissions: string[]; // IDs of active missions
    userProgress: {
        [userId: string]: UserProgress;
    };
}

import { LogManager, LogType, LogLevel } from '../logger/LogManager'; // Import LogManager

export class MissionManager {
    private static data: MissionsData = { date: '', activeMissions: [], userProgress: {} };
    private static client: Client;

    static async handleInteraction(interaction: any) {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'check_mission_progress' || interaction.customId === 'refresh_mission_progress') {
             await interaction.deferReply({ ephemeral: true });

             // Claim logic happens automatically on "View" if completed (or we can separate it)
             // The original logic seemed to claim on Refresh. Let's claim on View to make it easy.
             const claimed = await this.claimRewards(interaction.member as GuildMember);
             const embed = await this.getProgressEmbed(interaction.member as GuildMember);
             
             let content = '';
             if (claimed.length > 0) {
                 content = `🎉 **Parabéns!** Você resgatou:\n${claimed.map(s => `• ${s}`).join('\n')}`;
                 
                 // Log Claim
                 await LogManager.log({
                    guild: interaction.guild!,
                    type: LogType.SYSTEM, // Corrected from XP to SYSTEM
                    level: LogLevel.SUCCESS,
                    title: "🎁 Missão Concluída",
                    description: `Recompensa resgatada pelo combatente.`,
                    executor: interaction.user,
                    fields: [
                        { name: "Recompensas", value: claimed.join(', '), inline: false }
                    ]
                 });
             } else {
                 content = '📊 Aqui está seu progresso atual:';
             }

             const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                 new ButtonBuilder().setCustomId('refresh_mission_progress').setLabel('🔄 Atualizar').setStyle(ButtonStyle.Secondary)
             );

             await interaction.editReply({ content: content, embeds: [embed], components: [row] });
             return;
        }
    }

    static init(client: Client) {
        this.client = client;
        this.loadDb();
        this.checkRotation();
        
        // Check rotation every hour
        setInterval(() => this.checkRotation(), 60 * 60 * 1000);
    }

    private static loadDb() {
        try {
            if (fs.existsSync(DB_PATH)) {
                this.data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
            }
        } catch (e) {
            logger.error(e, 'Failed to load missions DB');
        }
    }

    private static saveDb() {
        try {
            const dir = path.dirname(DB_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2));
        } catch (e) {
            logger.error(e, 'Failed to save missions DB');
        }
    }

    private static getTodayDate(): string {
        return new Date().toISOString().split('T')[0];
    }

    private static async checkRotation() {
        const today = this.getTodayDate();
        if (this.data.date !== today) {
            logger.info('🔄 Rotating Daily Missions...');
            
            // Pick 3 random missions
            // Try to pick distinct types if possible
            const shuffled = [...MISSION_POOL].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 3);

            this.data = {
                date: today,
                activeMissions: selected.map(m => m.id),
                userProgress: {}
            };
            this.saveDb();

            // Update Channel
            await this.updateChannelBoard();
        }
    }

    static async updateChannelBoard() {
        if (!this.client) return;
        const guild = this.client.guilds.cache.first();
        if (!guild) return;

        const channel = guild.channels.cache.find(c => c.name === '📅-missões') as TextChannel;
        if (!channel) return;

        // Clear old messages
        // await channel.bulkDelete(5).catch(() => {}); 
        // Better: Edit the last bot message if exists, or send new. 
        // For simplicity in this flow, let's assume SetupManager handles initial seed, 
        // but here we force update.
        // Actually, SetupManager calls seed, which should call this Update function if it's dynamic.

        const activeMissions = this.getActiveMissions();
        
        const embed = new EmbedBuilder()
            .setTitle(`📅 MISSÕES DIÁRIAS: ${this.data.date}`)
            .setDescription('Complete os desafios abaixo para ganhar XP extra!\nAs missões resetam todos os dias à meia-noite.')
            .setColor('#FFD700')
            .setImage('https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg')
            .setFooter({ text: 'Clique em "Ver Meu Progresso" para checar seus status.', iconURL: guild.iconURL() || undefined });

        activeMissions.forEach((m, index) => {
            let icon = '🎯';
            if (m.type === MissionType.VOICE) icon = '🎙️';
            if (m.type === MissionType.MESSAGE) icon = '💬';
            if (m.type === MissionType.STREAM) icon = '🎥';

            embed.addFields({
                name: `${icon} Missão ${index + 1}: ${m.title}`,
                value: `📝 ${m.description}\n🎁 Recompensa: **${m.rewardXp} XP**`
            });
        });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('check_mission_progress')
                .setLabel('📋 Ver Meu Progresso / Resgatar')
                .setStyle(ButtonStyle.Primary)
        );

        // Fetch last message to edit or send new
        const messages = await channel.messages.fetch({ limit: 1 });
        const lastMsg = messages.first();

        if (lastMsg && lastMsg.author.id === this.client.user?.id) {
            await lastMsg.edit({ embeds: [embed], components: [row] });
        } else {
            await channel.send({ embeds: [embed], components: [row] });
        }
    }

    static getActiveMissions(): MissionTemplate[] {
        return MISSION_POOL.filter(m => this.data.activeMissions.includes(m.id));
    }

    static track(userId: string, type: MissionType, amount: number) {
        if (!this.data.userProgress[userId]) {
            this.data.userProgress[userId] = {};
        }

        const active = this.getActiveMissions();
        let changed = false;

        for (const mission of active) {
            if (mission.type === type) {
                const current = this.data.userProgress[userId][mission.id]?.current || 0;
                const claimed = this.data.userProgress[userId][mission.id]?.claimed || false;

                if (claimed) continue; // Already done

                // Update
                if (!this.data.userProgress[userId][mission.id]) {
                     this.data.userProgress[userId][mission.id] = { current: 0, claimed: false };
                }
                
                this.data.userProgress[userId][mission.id].current += amount;
                
                // Cap at target (visual only, logic handles >=)
                // Actually keep raw count
                changed = true;
            }
        }

        if (changed) this.saveDb();
    }

    static async getProgressEmbed(member: GuildMember) {
        const userId = member.id;
        const progress = this.data.userProgress[userId] || {};
        const active = this.getActiveMissions();

        const embed = new EmbedBuilder()
            .setTitle(`📊 Progresso de ${member.user.username}`)
            .setDescription('Acompanhe suas missões diárias em tempo real.')
            .setColor('#0099FF')
            .setTimestamp();

        if (active.length === 0) {
            embed.setDescription('Nenhuma missão ativa no momento.');
            return embed;
        }

        for (const mission of active) {
            const p = progress[mission.id] || { current: 0, claimed: false };
            const percent = Math.min(p.current / mission.target, 1);
            const isFinished = p.current >= mission.target;
            
            // Progress Bar: [████░░░░░░] 40%
            const barSize = 10;
            const filled = Math.floor(barSize * percent);
            const empty = barSize - filled;
            const bar = '`[' + '█'.repeat(filled) + '░'.repeat(empty) + ']`';
            const percentageText = `${Math.floor(percent * 100)}%`;

            let statusText = `${bar} **${percentageText}**\n${p.current} / ${mission.target}`;
            
            if (p.claimed) {
                statusText = '✅ **CONCLUÍDO & RESGATADO**';
            } else if (isFinished) {
                statusText = '🔓 **PRONTO PARA RESGATAR!**\n*Clique em Atualizar para receber*';
            }

            embed.addFields({
                name: `${mission.title}`,
                value: statusText,
                inline: false
            });
        }

        return embed;
    }

    static async claimRewards(member: GuildMember): Promise<string[]> {
        const userId = member.id;
        const progress = this.data.userProgress[userId] || {};
        const active = this.getActiveMissions();
        const claimedNames: string[] = [];

        for (const mission of active) {
            const p = progress[mission.id];
            if (p && p.current >= mission.target && !p.claimed) {
                // Claim!
                p.claimed = true;
                await XpManager.addXp(member, mission.rewardXp);
                claimedNames.push(`${mission.title} (+${mission.rewardXp} XP)`);
            }
        }

        if (claimedNames.length > 0) this.saveDb();
        return claimedNames;
    }
}
