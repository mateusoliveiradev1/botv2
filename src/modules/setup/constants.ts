import { ChannelType, PermissionFlagsBits } from 'discord.js';

export const ROLES = {
  STAFF: [
    { name: '🦅 General de Exército', color: '#FF0000', permissions: [PermissionFlagsBits.Administrator] },
    { name: '🎖️ Coronel', color: '#FFA500', permissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.KickMembers] }, // Antigo Task Force
    { name: '⚔️ Capitão', color: '#FFFF00', permissions: [PermissionFlagsBits.ManageMessages] }, // Antigo Scout
    { name: '🛡️ Sargento', color: '#0000FF', permissions: [] }, // Novo Helper
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
  NOTIFICATIONS: [
    { name: '🔔 Scrims', color: '#FF4500' },
    { name: '🏆 Campeonatos', color: '#FFD700' },
    { name: '📢 Patch Notes', color: '#00BFFF' },
    { name: '🎉 Eventos', color: '#FF69B4' }
  ],
  BASE: [
    { name: '🪖 Cabo', color: '#008000' }, // Antigo Soldado (Membro verificado)
    { name: '🏳️ Recruta', color: '#808080' }, // Antigo Visitante
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
      { name: '🆔-identidade-operacional', type: ChannelType.GuildText, read_only: true }, // Renomeado
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
    staff_only: true,
    children: [] 
  },
  {
    name: '🦅 | QG HAWK ESPORTS',
    type: ChannelType.GuildCategory,
    private: true,
    clan_role: '🦅 Hawk Esports',
    leader_role: '👑 Líder Hawk',
    children: [
      { name: '💬-chat-hawk', type: ChannelType.GuildText },
      { name: '🧠-taticas-hawk', type: ChannelType.GuildText },
      { name: '📝-line-up-hawk', type: ChannelType.GuildText, read_only: true },
      { name: '🔊 War Room Hawk', type: ChannelType.GuildVoice },
      { name: '🔊 Scrim Alpha Hawk', type: ChannelType.GuildVoice },
      { name: '🔊 Scrim Bravo Hawk', type: ChannelType.GuildVoice },
      { name: '🔊 Campeonato Hawk', type: ChannelType.GuildVoice },
    ]
  },
  {
    name: '🎯 | QG MIRA RUIM',
    type: ChannelType.GuildCategory,
    private: true,
    clan_role: '🎯 Mira Ruim',
    leader_role: '👑 Líder Mira Ruim',
    children: [
      { name: '💬-chat-mira-ruim', type: ChannelType.GuildText },
      { name: '🧠-taticas-mira-ruim', type: ChannelType.GuildText },
      { name: '📝-line-up-mira-ruim', type: ChannelType.GuildText, read_only: true },
      { name: '🔊 War Room Mira Ruim', type: ChannelType.GuildVoice },
      { name: '🔊 Scrim Alpha Mira', type: ChannelType.GuildVoice },
      { name: '🔊 Scrim Bravo Mira', type: ChannelType.GuildVoice },
      { name: '🔊 Campeonato Mira', type: ChannelType.GuildVoice },
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
      { name: '💤 AFK', type: ChannelType.GuildVoice }, 
    ]
  }
];
