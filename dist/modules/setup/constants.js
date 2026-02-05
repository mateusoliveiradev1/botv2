"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHANNELS = exports.ROLES = void 0;
const discord_js_1 = require("discord.js");
exports.ROLES = {
    STAFF: [
        { name: '🦅 Force Commander', color: '#FF0000', permissions: [discord_js_1.PermissionFlagsBits.Administrator] },
        { name: '🛡️ Task Force Officer', color: '#FFA500', permissions: [discord_js_1.PermissionFlagsBits.ManageChannels, discord_js_1.PermissionFlagsBits.KickMembers] },
        { name: '🔭 Scout Leader', color: '#0000FF', permissions: [discord_js_1.PermissionFlagsBits.ManageMessages] },
    ],
    CLANS: [
        { name: '👑 Líder Hawk', color: '#F2A900', hoist: true },
        { name: '🦅 Hawk Esports', color: '#F2A900', hoist: true },
        { name: '👑 Líder Mira Ruim', color: '#FF0000', hoist: true },
        { name: '🎯 Mira Ruim', color: '#FF0000', hoist: true },
    ],
    RANKS: [
        { name: '💀 Top 500', color: '#000000' },
        { name: '⚔️ Master', color: '#FFD700' },
        { name: '💎 Diamond', color: '#B9F2FF' },
        { name: '💿 Platinum', color: '#E5E4E2' },
        { name: '🥇 Gold', color: '#FFD700' },
        { name: '🥈 Silver', color: '#C0C0C0' },
        { name: '🥉 Bronze', color: '#CD7F32' },
    ],
    CLASSES: [
        '🎯 Sniper', '🔫 Fragger', '🧠 IGL', '💊 Support', '🏎️ Driver'
    ],
    WEAPONS: [
        '🏁 M416', '🔥 Beryl M762', '🌪️ AUG', '☠️ Kar98k', '⚡ Mini14', '🍳 Pan'
    ],
    BASE: [
        { name: '🎖️ Soldado', color: '#008000' },
        { name: '🏳️ Visitante', color: '#808080' },
        { name: '🤖 System', color: '#FFFFFF' },
    ]
};
exports.CHANNELS = [
    {
        name: '🪂 | ZONA DE SALTO',
        type: discord_js_1.ChannelType.GuildCategory,
        children: [
            { name: '👋-boas-vindas', type: discord_js_1.ChannelType.GuildText },
            { name: '📜-regras', type: discord_js_1.ChannelType.GuildText, read_only: true },
            { name: '🔫-arsenal', type: discord_js_1.ChannelType.GuildText, read_only: true },
            { name: '🔗-vincular-conta', type: discord_js_1.ChannelType.GuildText, read_only: true },
        ]
    },
    {
        name: '📡 | CENTRO DE COMANDO',
        type: discord_js_1.ChannelType.GuildCategory,
        children: [
            { name: '📢-sitrep', type: discord_js_1.ChannelType.GuildText, read_only: true },
            { name: '📅-missões', type: discord_js_1.ChannelType.GuildText, read_only: true },
            { name: '🏅-conquistas', type: discord_js_1.ChannelType.GuildText, read_only: true },
        ]
    },
    {
        name: '📊 | TELEMETRIA DE COMBATE',
        type: discord_js_1.ChannelType.GuildCategory,
        children: [
            { name: '🏆-ranking-competitivo', type: discord_js_1.ChannelType.GuildText, read_only: true },
            { name: '📅-ranking-semanal', type: discord_js_1.ChannelType.GuildText, read_only: true },
            { name: '📆-ranking-mensal', type: discord_js_1.ChannelType.GuildText, read_only: true },
            { name: '⚔️-ranking-clas', type: discord_js_1.ChannelType.GuildText, read_only: true },
            { name: '🏛️-hall-of-fame', type: discord_js_1.ChannelType.GuildText, read_only: true },
        ]
    },
    {
        name: '💬 | ALOJAMENTOS',
        type: discord_js_1.ChannelType.GuildCategory,
        children: [
            { name: '💬-chat-geral', type: discord_js_1.ChannelType.GuildText },
            { name: '📷-clips-highlights', type: discord_js_1.ChannelType.GuildText },
            { name: '🤡-memes', type: discord_js_1.ChannelType.GuildText },
            { name: '🤖-comandos', type: discord_js_1.ChannelType.GuildText },
        ]
    },
    {
        name: '🛡️ | LOGÍSTICA & SUPORTE',
        type: discord_js_1.ChannelType.GuildCategory,
        children: [
            { name: '📦-suporte', type: discord_js_1.ChannelType.GuildText },
            { name: '🛡️-caixa-preta', type: discord_js_1.ChannelType.GuildText, private: true },
        ]
    },
    {
        name: '📂 | OPERAÇÕES EM ANDAMENTO',
        type: discord_js_1.ChannelType.GuildCategory,
        private: true,
        staff_only: true, // Nova flag para impedir que Elite veja
        children: []
    },
    {
        name: '🦅 | QG HAWK ESPORTS',
        type: discord_js_1.ChannelType.GuildCategory,
        private: true,
        clan_role: '🦅 Hawk Esports',
        leader_role: '👑 Líder Hawk',
        children: [
            { name: '💬-chat-hawk', type: discord_js_1.ChannelType.GuildText },
            { name: '🧠-taticas-hawk', type: discord_js_1.ChannelType.GuildText },
            { name: '📝-line-up-hawk', type: discord_js_1.ChannelType.GuildText, read_only: true },
            { name: '🔊 War Room Hawk', type: discord_js_1.ChannelType.GuildVoice },
            { name: '🔊 Scrim Alpha Hawk', type: discord_js_1.ChannelType.GuildVoice },
            { name: '🔊 Scrim Bravo Hawk', type: discord_js_1.ChannelType.GuildVoice },
            { name: '🔊 Campeonato Hawk', type: discord_js_1.ChannelType.GuildVoice },
        ]
    },
    {
        name: '🎯 | QG MIRA RUIM',
        type: discord_js_1.ChannelType.GuildCategory,
        private: true,
        clan_role: '🎯 Mira Ruim',
        leader_role: '👑 Líder Mira Ruim',
        children: [
            { name: '💬-chat-mira-ruim', type: discord_js_1.ChannelType.GuildText },
            { name: '🧠-taticas-mira-ruim', type: discord_js_1.ChannelType.GuildText },
            { name: '📝-line-up-mira-ruim', type: discord_js_1.ChannelType.GuildText, read_only: true },
            { name: '🔊 War Room Mira Ruim', type: discord_js_1.ChannelType.GuildVoice },
            { name: '🔊 Scrim Alpha Mira', type: discord_js_1.ChannelType.GuildVoice },
            { name: '🔊 Scrim Bravo Mira', type: discord_js_1.ChannelType.GuildVoice },
            { name: '🔊 Campeonato Mira', type: discord_js_1.ChannelType.GuildVoice },
        ]
    },
    {
        name: '🔊 | FREQUÊNCIA DE RÁDIO',
        type: discord_js_1.ChannelType.GuildCategory,
        children: [
            { name: '➕ Criar Sala', type: discord_js_1.ChannelType.GuildVoice },
            { name: 'Lobby', type: discord_js_1.ChannelType.GuildVoice },
            { name: 'Squad Alpha', type: discord_js_1.ChannelType.GuildVoice, limit: 4 },
            { name: 'Squad Bravo', type: discord_js_1.ChannelType.GuildVoice, limit: 4 },
            { name: 'Squad Charlie', type: discord_js_1.ChannelType.GuildVoice, limit: 4 },
            { name: 'Duo Ops 1', type: discord_js_1.ChannelType.GuildVoice, limit: 2 },
            { name: 'Duo Ops 2', type: discord_js_1.ChannelType.GuildVoice, limit: 2 },
            { name: '💤 AFK', type: discord_js_1.ChannelType.GuildVoice }, // Canal AFK
        ]
    }
];
