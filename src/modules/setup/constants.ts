import { ChannelType, PermissionFlagsBits } from "discord.js";

export const ROLES = {
  STAFF: [
    {
      name: "🌟 General de Exército",
      color: "#FF0000",
      permissions: [PermissionFlagsBits.Administrator],
      hoist: true,
    },
    {
      name: "⚜️ Coronel",
      color: "#FFA500",
      permissions: [
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.KickMembers,
      ],
      hoist: true,
    },
    {
      name: "💠 Capitão",
      color: "#FFFF00",
      permissions: [PermissionFlagsBits.ManageMessages],
      hoist: false,
    },
    { name: "🛡️ Sargento", color: "#0000FF", permissions: [], hoist: false },
  ],
  CLANS: [
    { name: "👑 Líder Hawk", color: "#F2A900", hoist: false }, // Líder não precisa separar, ele aparece dentro do clã ou acima se for Staff
    { name: "🦅 Hawk Esports", color: "#F2A900", hoist: true }, // SEPARAR CLÃ HAWK
    { name: "👑 Líder Mira Ruim", color: "#FF0000", hoist: false },
    { name: "🎯 Mira Ruim", color: "#FF0000", hoist: true }, // SEPARAR CLÃ MIRA
    { name: "🏆 Line-up", color: "#00FFFF", hoist: false },
  ],
  RANKS: [
    { name: "💀 Top 500", color: "#000000", hoist: false },
    { name: "⚔️ Master", color: "#FFD700", hoist: false },
    { name: "💎 Diamond", color: "#B9F2FF", hoist: false },
    { name: "💿 Platinum", color: "#E5E4E2", hoist: false },
    { name: "🥇 Gold", color: "#FFD700", hoist: false },
    { name: "🥈 Silver", color: "#C0C0C0", hoist: false },
    { name: "🥉 Bronze", color: "#CD7F32", hoist: false },
  ],
  CLASSES: ["🔭 Sniper", "🔥 Fragger", "🧠 IGL", "💊 Support", "🏎️ Driver"],
  WEAPONS: [
    "🏁 M416",
    "🔥 Beryl M762",
    "🌪️ AUG",
    "☠️ Kar98k",
    "⚡ Mini14",
    "🍳 Pan",
    "💀 AWM",
    "🐉 Dragunov",
  ],
  NOTIFICATIONS: [
    { name: "🔔 Scrims", color: "#FF4500" },
    { name: "🏆 Campeonatos", color: "#FFD700" },
    { name: "📢 Patch Notes", color: "#00BFFF" },
    { name: "🎉 Eventos", color: "#FF69B4" },
  ],
  BASE: [
    { name: "🪖 Cabo", color: "#008000", hoist: true }, // SEPARAR OPERADORES (Membros Comuns)
    { name: "🔰 Recruta", color: "#808080", hoist: false },
    { name: "🗡️ Mercenário", color: "#8A2BE2", hoist: false },
    { name: "🤖 System", color: "#FFFFFF", hoist: true }, // SEPARAR BOTS
  ],
  // --- SHOP ROLES ---
  WEAPON_MASTERY: [
    "🔫 M416 Specialist",
    "🎱 Beryl M762 Striker",
    "🏴‍☠️ AKM Warlord",
    "🦗 Vector Shredder",
    "🧊 UMP45 Ice",
    "🎯 Kar98k Hunter",
    "💥 M24 Silencer",
    "🦖 AWM God",
    "🔨 S12K Breacher",
    "💣 Panzerfaust Maniac",
  ],
  MAP_VETERANS: [
    "🌲 Erangel Survivor",
    "🌵 Miramar Sheriff",
    "🌴 Sanhok Snake",
    "❄️ Vikendi Yeti",
    "🍂 Taego Traveler",
    "🌋 Paramo Explorer",
    "🏙️ Haven Infiltrator",
    "🚀 Deston Security",
    "🐻 Rondo Local",
    "🏕️ Training Mode Camper",
  ],
  TITLES: [
    "🛡️ Tanker",
    "🚑 Médico de Combate",
    "🔭 Scout",
    "🗣️ IGL",
    "🚗 Motorista de Fuga",
    "👻 Ghost",
    "🌉 Bridge Camper",
    "🐀 Loot Goblin",
    "🤖 Bot Hunter",
    "🥔 Batata Aim",
  ],
  BLACK_MARKET: [
    "🍗 Winner Winner",
    "🎟️ VIP Pass",
    "🐺 Lobo Solitário",
    "🦈 Tubarão do Servidor",
    "💸 Magnata",
    "👑 O Poderoso Chefão",
    "🦄 Unicórnio Tático",
  ],
};

export const CHANNELS = [
  {
    name: "🪂 | ZONA DE SALTO",
    type: ChannelType.GuildCategory,
    children: [
      { name: "👋-boas-vindas", type: ChannelType.GuildText },
      { name: "📜-regras", type: ChannelType.GuildText, read_only: true },
      {
        name: "💻-central-de-comando",
        type: ChannelType.GuildText,
        read_only: true,
      }, // MOVED HERE
      {
        name: "🆔-identidade-operacional",
        type: ChannelType.GuildText,
        read_only: true,
      },
    ],
  },
  {
    name: "📡 | CENTRO DE COMANDO",
    type: ChannelType.GuildCategory,
    children: [
      {
        name: "📢-sitrep",
        type: ChannelType.GuildAnnouncement,
        read_only: true,
      }, // Megafone (News)
      { name: "🚀-boosts", type: ChannelType.GuildText, read_only: true }, // Novo: Boosts
      { name: "🛒-loja-oficial", type: ChannelType.GuildText, read_only: true }, // Novo: Loja
      { name: "📅-missões", type: ChannelType.GuildText, read_only: true },
      { name: "🏅-conquistas", type: ChannelType.GuildText, read_only: true },
    ],
  },
  {
    name: "📊 | TELEMETRIA DE COMBATE",
    type: ChannelType.GuildCategory,
    children: [
      {
        name: "🏆-ranking-competitivo",
        type: ChannelType.GuildText,
        read_only: true,
      },
      {
        name: "📅-ranking-semanal",
        type: ChannelType.GuildText,
        read_only: true,
      },
      {
        name: "📆-ranking-mensal",
        type: ChannelType.GuildText,
        read_only: true,
      },
      { name: "⚔️-ranking-clas", type: ChannelType.GuildText, read_only: true },
      { name: "🏛️-hall-of-fame", type: ChannelType.GuildText, read_only: true },
    ],
  },
  {
    name: "💬 | ALOJAMENTOS",
    type: ChannelType.GuildCategory,
    children: [
      { name: "💬-chat-geral", type: ChannelType.GuildText },
      { name: "🪖-recrutamento", type: ChannelType.GuildText, read_only: true }, // Novo
      {
        name: "🆘-complete-de-time",
        type: ChannelType.GuildText,
        read_only: true,
      }, // New Channel
      {
        name: "📢-transferencias",
        type: ChannelType.GuildText,
        read_only: true,
      }, // New Channel (Transfer Market)
      { name: "📷-clips-highlights", type: ChannelType.GuildText },
      { name: "🤡-memes", type: ChannelType.GuildText },
      { name: "🤖-comandos", type: ChannelType.GuildText },
    ],
  },
  {
    name: "🛡️ | LOGÍSTICA & SUPORTE",
    type: ChannelType.GuildCategory,
    children: [
      { name: "📦-suporte", type: ChannelType.GuildText, read_only: true }, // Read-only para painel
      { name: "🛡️-caixa-preta", type: ChannelType.GuildText, private: true },
      {
        name: "🔒-backup-vault",
        type: ChannelType.GuildText,
        private: true,
        staff_only: true,
      }, // Novo: Backup
      {
        name: "🕵-sitrep-relay",
        type: ChannelType.GuildText,
        private: true,
        staff_only: true,
      }, // Novo: Relay de Notícias
      {
        name: "🛡️-discord-updates",
        type: ChannelType.GuildText,
        private: true,
        staff_only: true,
      }, // Comunidade: Updates
      {
        name: "🚨-discord-security",
        type: ChannelType.GuildText,
        private: true,
        staff_only: true,
      }, // Comunidade: Segurança
    ],
  },
  {
    name: "📂 | OPERAÇÕES EM ANDAMENTO",
    type: ChannelType.GuildCategory,
    private: true,
    staff_only: true,
    children: [],
  },
  {
    name: "🦅 | QG HAWK ESPORTS",
    type: ChannelType.GuildCategory,
    private: true,
    clan_role: "🦅 Hawk Esports",
    leader_role: "👑 Líder Hawk",
    children: [
      { name: "📅-agenda-hawk", type: ChannelType.GuildText, read_only: true }, // Novo
      {
        name: "👮-liderança-hawk",
        type: ChannelType.GuildText,
        private: true,
        leader_only: true,
      }, // Novo
      {
        name: "📄-dossies-operacionais",
        type: ChannelType.GuildText,
        private: true,
        leader_only: true,
      }, // New Channel (Dossiers)
      { name: "💬-chat-hawk", type: ChannelType.GuildText },
      { name: "🧠-taticas-hawk", type: ChannelType.GuildText },
      { name: "📝-line-up-hawk", type: ChannelType.GuildText, read_only: true },
      { name: "🔊 War Room Hawk", type: ChannelType.GuildVoice },
      { name: "🔊 Scrim Alpha Hawk", type: ChannelType.GuildVoice },
      { name: "🔊 Scrim Bravo Hawk", type: ChannelType.GuildVoice },
      { name: "🔊 Campeonato Hawk", type: ChannelType.GuildVoice },
    ],
  },
  {
    name: "🎯 | QG MIRA RUIM",
    type: ChannelType.GuildCategory,
    private: true,
    clan_role: "🎯 Mira Ruim",
    leader_role: "👑 Líder Mira Ruim",
    children: [
      { name: "📅-agenda-mira", type: ChannelType.GuildText, read_only: true }, // Novo
      {
        name: "👮-liderança-mira",
        type: ChannelType.GuildText,
        private: true,
        leader_only: true,
      }, // Novo
      {
        name: "📄-dossies-operacionais",
        type: ChannelType.GuildText,
        private: true,
        leader_only: true,
      }, // New Channel (Dossiers)
      { name: "💬-chat-mira-ruim", type: ChannelType.GuildText },
      { name: "🧠-taticas-mira-ruim", type: ChannelType.GuildText },
      {
        name: "📝-line-up-mira-ruim",
        type: ChannelType.GuildText,
        read_only: true,
      },
      { name: "🔊 War Room Mira Ruim", type: ChannelType.GuildVoice },
      { name: "🔊 Scrim Alpha Mira", type: ChannelType.GuildVoice },
      { name: "🔊 Scrim Bravo Mira", type: ChannelType.GuildVoice },
      { name: "🔊 Campeonato Mira", type: ChannelType.GuildVoice },
    ],
  },
  {
    name: "🔊 | FREQUÊNCIA DE RÁDIO",
    type: ChannelType.GuildCategory,
    children: [
      { name: "➕ Criar Sala", type: ChannelType.GuildVoice },
      { name: "Lobby", type: ChannelType.GuildVoice },
      { name: "Squad Alpha", type: ChannelType.GuildVoice, limit: 4 },
      { name: "Squad Bravo", type: ChannelType.GuildVoice, limit: 4 },
      { name: "Squad Charlie", type: ChannelType.GuildVoice, limit: 4 },
      { name: "Duo Ops 1", type: ChannelType.GuildVoice, limit: 2 },
      { name: "Duo Ops 2", type: ChannelType.GuildVoice, limit: 2 },
      { name: "💤 AFK", type: ChannelType.GuildVoice },
    ],
  },
];
