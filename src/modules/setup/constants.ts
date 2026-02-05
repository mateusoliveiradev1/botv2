import { ChannelType, PermissionFlagsBits } from 'discord.js';

export const ROLES = {
  STAFF: [
    { name: '🦅 Force Commander', color: '#FF0000', permissions: [PermissionFlagsBits.Administrator] },
    { name: '🛡️ Task Force Officer', color: '#FFA500', permissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.KickMembers] },
    { name: '🔭 Scout Leader', color: '#0000FF', permissions: [PermissionFlagsBits.ManageMessages] },
  ],
  ELITE: [
    { name: '🦅 Hawk Esports', color: '#F2A900', hoist: true },
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
  BASE: [
    { name: '🎖️ Soldado', color: '#008000' },
    { name: '🏳️ Visitante', color: '#808080' },
    { name: '🤖 System', color: '#FFFFFF' },
  ]
};

export const CHANNELS = [
  {
    name: '🪂 | ZONA DE SALTO',
    type: ChannelType.GuildCategory,
    children: [
      { name: '👋-boas-vindas', type: ChannelType.GuildText },
      { name: '📜-regras', type: ChannelType.GuildText, read_only: true },
      { name: '🔗-vincular-conta', type: ChannelType.GuildText, read_only: true },
    ]
  },
  {
    name: '📡 | CENTRO DE COMANDO',
    type: ChannelType.GuildCategory,
    children: [
      { name: '📢-sitrep', type: ChannelType.GuildText, read_only: true },
      { name: '📅-missões', type: ChannelType.GuildText, read_only: true },
      { name: '🏅-conquistas', type: ChannelType.GuildText, read_only: true },
    ]
  },
  {
    name: '📊 | TELEMETRIA DE COMBATE',
    type: ChannelType.GuildCategory,
    children: [
      { name: '🏆-ranking-competitivo', type: ChannelType.GuildText, read_only: true },
      { name: '📅-ranking-semanal', type: ChannelType.GuildText, read_only: true },
      { name: '📆-ranking-mensal', type: ChannelType.GuildText, read_only: true },
      { name: '⚔️-ranking-clas', type: ChannelType.GuildText, read_only: true },
      { name: '🏛️-hall-of-fame', type: ChannelType.GuildText, read_only: true },
    ]
  },
  {
    name: '💬 | ALOJAMENTOS',
    type: ChannelType.GuildCategory,
    children: [
      { name: '💬-chat-geral', type: ChannelType.GuildText },
      { name: '📷-clips-highlights', type: ChannelType.GuildText },
      { name: '🤡-memes', type: ChannelType.GuildText },
      { name: '🤖-comandos', type: ChannelType.GuildText },
    ]
  },
  {
    name: '🛡️ | LOGÍSTICA & SUPORTE',
    type: ChannelType.GuildCategory,
    children: [
      { name: '📦-suporte', type: ChannelType.GuildText },
      { name: '🛡️-caixa-preta', type: ChannelType.GuildText, private: true },
    ]
  },
  {
    name: '📂 | OPERAÇÕES EM ANDAMENTO',
    type: ChannelType.GuildCategory,
    private: true, 
    staff_only: true, // Nova flag para impedir que Elite veja
    children: [] 
  },
  {
    name: '🏆 | SALA DE GUERRA',
    type: ChannelType.GuildCategory,
    private: true,
    children: [
      { name: '📅-agenda-oficial', type: ChannelType.GuildText },
      { name: '🧠-taticas-confidenciais', type: ChannelType.GuildText },
      { name: '📝-line-up', type: ChannelType.GuildText },
      { name: 'Briefing Tático', type: ChannelType.GuildVoice },
      { name: 'Scrim Alpha', type: ChannelType.GuildVoice },
      { name: 'Scrim Bravo', type: ChannelType.GuildVoice },
      { name: 'CAMPEONATO', type: ChannelType.GuildVoice },
    ]
  },
  {
    name: '🔊 | FREQUÊNCIA DE RÁDIO',
    type: ChannelType.GuildCategory,
    children: [
      { name: '➕ Criar Sala', type: ChannelType.GuildVoice },
      { name: 'Lobby', type: ChannelType.GuildVoice },
      { name: 'Squad Alpha', type: ChannelType.GuildVoice, limit: 4 },
      { name: 'Squad Bravo', type: ChannelType.GuildVoice, limit: 4 },
      { name: 'Squad Charlie', type: ChannelType.GuildVoice, limit: 4 },
      { name: 'Duo Ops 1', type: ChannelType.GuildVoice, limit: 2 },
      { name: 'Duo Ops 2', type: ChannelType.GuildVoice, limit: 2 },
      { name: '💤 AFK', type: ChannelType.GuildVoice }, // Canal AFK
    ]
  }
];
