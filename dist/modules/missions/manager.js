"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const discord_js_1 = require("discord.js");
const constants_1 = require("./constants");
const logger_1 = __importDefault(require("../../core/logger"));
const manager_1 = require("../xp/manager");
const DB_PATH = path_1.default.join(process.cwd(), 'data', 'daily_missions.json');
class MissionManager {
    static data = { date: '', activeMissions: [], userProgress: {} };
    static client;
    static init(client) {
        this.client = client;
        this.loadDb();
        this.checkRotation();
        // Check rotation every hour
        setInterval(() => this.checkRotation(), 60 * 60 * 1000);
    }
    static loadDb() {
        try {
            if (fs_1.default.existsSync(DB_PATH)) {
                this.data = JSON.parse(fs_1.default.readFileSync(DB_PATH, 'utf-8'));
            }
        }
        catch (e) {
            logger_1.default.error(e, 'Failed to load missions DB');
        }
    }
    static saveDb() {
        try {
            const dir = path_1.default.dirname(DB_PATH);
            if (!fs_1.default.existsSync(dir))
                fs_1.default.mkdirSync(dir, { recursive: true });
            fs_1.default.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2));
        }
        catch (e) {
            logger_1.default.error(e, 'Failed to save missions DB');
        }
    }
    static getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }
    static async checkRotation() {
        const today = this.getTodayDate();
        if (this.data.date !== today) {
            logger_1.default.info('🔄 Rotating Daily Missions...');
            // Pick 3 random missions
            // Try to pick distinct types if possible
            const shuffled = [...constants_1.MISSION_POOL].sort(() => 0.5 - Math.random());
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
        if (!this.client)
            return;
        const guild = this.client.guilds.cache.first();
        if (!guild)
            return;
        const channel = guild.channels.cache.find(c => c.name === '📅-missões');
        if (!channel)
            return;
        // Clear old messages
        // await channel.bulkDelete(5).catch(() => {}); 
        // Better: Edit the last bot message if exists, or send new. 
        // For simplicity in this flow, let's assume SetupManager handles initial seed, 
        // but here we force update.
        // Actually, SetupManager calls seed, which should call this Update function if it's dynamic.
        const activeMissions = this.getActiveMissions();
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`📅 MISSÕES DIÁRIAS: ${this.data.date}`)
            .setDescription('Complete os desafios abaixo para ganhar XP extra!\nAs missões resetam todos os dias à meia-noite.')
            .setColor('#FFD700')
            .setImage('https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg')
            .setFooter({ text: 'Clique em "Ver Meu Progresso" para checar seus status.', iconURL: guild.iconURL() || undefined });
        activeMissions.forEach((m, index) => {
            let icon = '🎯';
            if (m.type === constants_1.MissionType.VOICE)
                icon = '🎙️';
            if (m.type === constants_1.MissionType.MESSAGE)
                icon = '💬';
            if (m.type === constants_1.MissionType.STREAM)
                icon = '🎥';
            embed.addFields({
                name: `${icon} Missão ${index + 1}: ${m.title}`,
                value: `📝 ${m.description}\n🎁 Recompensa: **${m.rewardXp} XP**`
            });
        });
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('check_mission_progress')
            .setLabel('📋 Ver Meu Progresso / Resgatar')
            .setStyle(discord_js_1.ButtonStyle.Primary));
        // Fetch last message to edit or send new
        const messages = await channel.messages.fetch({ limit: 1 });
        const lastMsg = messages.first();
        if (lastMsg && lastMsg.author.id === this.client.user?.id) {
            await lastMsg.edit({ embeds: [embed], components: [row] });
        }
        else {
            await channel.send({ embeds: [embed], components: [row] });
        }
    }
    static getActiveMissions() {
        return constants_1.MISSION_POOL.filter(m => this.data.activeMissions.includes(m.id));
    }
    static track(userId, type, amount) {
        if (!this.data.userProgress[userId]) {
            this.data.userProgress[userId] = {};
        }
        const active = this.getActiveMissions();
        let changed = false;
        for (const mission of active) {
            if (mission.type === type) {
                const current = this.data.userProgress[userId][mission.id]?.current || 0;
                const claimed = this.data.userProgress[userId][mission.id]?.claimed || false;
                if (claimed)
                    continue; // Already done
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
        if (changed)
            this.saveDb();
    }
    static async getProgressEmbed(member) {
        const userId = member.id;
        const progress = this.data.userProgress[userId] || {};
        const active = this.getActiveMissions();
        const embed = new discord_js_1.EmbedBuilder()
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
            }
            else if (isFinished) {
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
    static async claimRewards(member) {
        const userId = member.id;
        const progress = this.data.userProgress[userId] || {};
        const active = this.getActiveMissions();
        const claimedNames = [];
        for (const mission of active) {
            const p = progress[mission.id];
            if (p && p.current >= mission.target && !p.claimed) {
                // Claim!
                p.claimed = true;
                await manager_1.XpManager.addXp(member, mission.rewardXp);
                claimedNames.push(`${mission.title} (+${mission.rewardXp} XP)`);
            }
        }
        if (claimedNames.length > 0)
            this.saveDb();
        return claimedNames;
    }
}
exports.MissionManager = MissionManager;
