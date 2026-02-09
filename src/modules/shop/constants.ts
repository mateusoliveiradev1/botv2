export interface ShopItem {
    id: string;
    name: string;
    price: number;
    description: string;
    type: 'XP' | 'ROLE' | 'COLLECTIBLE';
    category: 'PHARMACY' | 'ARSENAL' | 'PASSPORT' | 'STYLE' | 'BLACK_MARKET';
    value?: number; // For XP amount
    roleName?: string; // For Role name
    emoji: string;
}

export const SHOP_CATEGORIES = {
    PHARMACY: { label: '💊 Farmácia & Boosts', value: 'PHARMACY', description: 'Suprimentos de XP', emoji: '💊' },
    ARSENAL: { label: '🔫 Arsenal', value: 'ARSENAL', description: 'Maestria de Armas', emoji: '🔫' },
    PASSPORT: { label: '🗺️ Passaportes', value: 'PASSPORT', description: 'Veteranos de Mapa', emoji: '🗺️' },
    STYLE: { label: '🎭 Estilos', value: 'STYLE', description: 'Funções Táticas', emoji: '🎭' },
    BLACK_MARKET: { label: '💎 Mercado Negro', value: 'BLACK_MARKET', description: 'Itens Raros e Exclusivos', emoji: '💎' }
};

export const SHOP_ITEMS: ShopItem[] = [
    // --- PHARMACY (XP) ---
    { id: 'bandage', name: 'Bandagem', price: 50, description: '+50 XP', type: 'XP', category: 'PHARMACY', value: 50, emoji: '🩹' },
    { id: 'apple_juice', name: 'Suco de Maçã', price: 100, description: '+100 XP', type: 'XP', category: 'PHARMACY', value: 100, emoji: '🧃' },
    { id: 'energy_drink', name: 'Energy Drink', price: 250, description: '+250 XP', type: 'XP', category: 'PHARMACY', value: 250, emoji: '🥤' },
    { id: 'painkiller', name: 'Painkiller', price: 600, description: '+600 XP', type: 'XP', category: 'PHARMACY', value: 600, emoji: '💊' },
    { id: 'adrenaline', name: 'Adrenalina', price: 1200, description: '+1.200 XP', type: 'XP', category: 'PHARMACY', value: 1200, emoji: '💉' },
    { id: 'loot_bag', name: 'Mochila de Loot', price: 2000, description: '+2.000 XP', type: 'XP', category: 'PHARMACY', value: 2000, emoji: '🎒' },
    { id: 'first_aid', name: 'First Aid Kit', price: 3500, description: '+3.500 XP', type: 'XP', category: 'PHARMACY', value: 3500, emoji: '📦' },
    { id: 'medkit', name: 'Medkit', price: 7000, description: '+7.000 XP', type: 'XP', category: 'PHARMACY', value: 7000, emoji: '🚑' },
    { id: 'air_drop', name: 'Air Drop', price: 15000, description: '+15.000 XP', type: 'XP', category: 'PHARMACY', value: 15000, emoji: '✈️' },
    { id: 'flare_gun', name: 'Flare Gun', price: 30000, description: '+30.000 XP', type: 'XP', category: 'PHARMACY', value: 30000, emoji: '🚀' },

    // --- ARSENAL (WEAPON MASTERY) ---
    { id: 'm416_spec', name: 'M416 Specialist', price: 5000, description: 'Maestria com M416', type: 'ROLE', category: 'ARSENAL', roleName: '🔫 M416 Specialist', emoji: '🔫' },
    { id: 'beryl_striker', name: 'Beryl M762 Striker', price: 5000, description: 'Maestria com Beryl', type: 'ROLE', category: 'ARSENAL', roleName: '🎱 Beryl M762 Striker', emoji: '🎱' },
    { id: 'akm_warlord', name: 'AKM Warlord', price: 5000, description: 'Maestria com AKM', type: 'ROLE', category: 'ARSENAL', roleName: '🏴‍☠️ AKM Warlord', emoji: '🏴‍☠️' },
    { id: 'vector_shredder', name: 'Vector Shredder', price: 5000, description: 'Maestria com Vector', type: 'ROLE', category: 'ARSENAL', roleName: '🦗 Vector Shredder', emoji: '🦗' },
    { id: 'ump_ice', name: 'UMP45 Ice', price: 5000, description: 'Maestria com UMP', type: 'ROLE', category: 'ARSENAL', roleName: '🧊 UMP45 Ice', emoji: '🧊' },
    { id: 'kar98_hunter', name: 'Kar98k Hunter', price: 5000, description: 'Maestria com Kar98', type: 'ROLE', category: 'ARSENAL', roleName: '🎯 Kar98k Hunter', emoji: '🎯' },
    { id: 'm24_silencer', name: 'M24 Silencer', price: 5000, description: 'Maestria com M24', type: 'ROLE', category: 'ARSENAL', roleName: '💥 M24 Silencer', emoji: '💥' },
    { id: 'awm_god', name: 'AWM God', price: 10000, description: 'Maestria Lendária com AWM', type: 'ROLE', category: 'ARSENAL', roleName: '🦖 AWM God', emoji: '🦖' },
    { id: 's12k_breacher', name: 'S12K Breacher', price: 5000, description: 'Maestria com S12K', type: 'ROLE', category: 'ARSENAL', roleName: '🔨 S12K Breacher', emoji: '🔨' },
    { id: 'panzer_maniac', name: 'Panzerfaust Maniac', price: 8000, description: 'Maestria com Panzer', type: 'ROLE', category: 'ARSENAL', roleName: '💣 Panzerfaust Maniac', emoji: '💣' },

    // --- PASSPORT (MAPS) ---
    { id: 'erangel_surv', name: 'Erangel Survivor', price: 8000, description: 'Veterano de Erangel', type: 'ROLE', category: 'PASSPORT', roleName: '🌲 Erangel Survivor', emoji: '🌲' },
    { id: 'miramar_sheriff', name: 'Miramar Sheriff', price: 8000, description: 'Veterano de Miramar', type: 'ROLE', category: 'PASSPORT', roleName: '🌵 Miramar Sheriff', emoji: '🌵' },
    { id: 'sanhok_snake', name: 'Sanhok Snake', price: 8000, description: 'Veterano de Sanhok', type: 'ROLE', category: 'PASSPORT', roleName: '🌴 Sanhok Snake', emoji: '🌴' },
    { id: 'vikendi_yeti', name: 'Vikendi Yeti', price: 8000, description: 'Veterano de Vikendi', type: 'ROLE', category: 'PASSPORT', roleName: '❄️ Vikendi Yeti', emoji: '❄️' },
    { id: 'taego_traveler', name: 'Taego Traveler', price: 8000, description: 'Veterano de Taego', type: 'ROLE', category: 'PASSPORT', roleName: '🍂 Taego Traveler', emoji: '🍂' },
    { id: 'paramo_exp', name: 'Paramo Explorer', price: 8000, description: 'Veterano de Paramo', type: 'ROLE', category: 'PASSPORT', roleName: '🌋 Paramo Explorer', emoji: '🌋' },
    { id: 'haven_inf', name: 'Haven Infiltrator', price: 8000, description: 'Veterano de Haven', type: 'ROLE', category: 'PASSPORT', roleName: '🏙️ Haven Infiltrator', emoji: '🏙️' },
    { id: 'deston_sec', name: 'Deston Security', price: 8000, description: 'Veterano de Deston', type: 'ROLE', category: 'PASSPORT', roleName: '🚀 Deston Security', emoji: '🚀' },
    { id: 'rondo_local', name: 'Rondo Local', price: 8000, description: 'Veterano de Rondo', type: 'ROLE', category: 'PASSPORT', roleName: '🐻 Rondo Local', emoji: '🐻' },
    { id: 'training_camp', name: 'Training Camper', price: 8000, description: 'Veterano de Treino', type: 'ROLE', category: 'PASSPORT', roleName: '🏕️ Training Mode Camper', emoji: '🏕️' },

    // --- STYLE (FUNCTIONS) ---
    { id: 'tanker', name: 'Tanker', price: 5000, description: 'Especialista em Loot Lvl 3', type: 'ROLE', category: 'STYLE', roleName: '🛡️ Tanker', emoji: '🛡️' },
    { id: 'combat_medic', name: 'Médico de Combate', price: 5000, description: 'O anjo da guarda do squad', type: 'ROLE', category: 'STYLE', roleName: '🚑 Médico de Combate', emoji: '🚑' },
    { id: 'scout', name: 'Scout / Olheiro', price: 5000, description: 'Olhos de águia', type: 'ROLE', category: 'STYLE', roleName: '🔭 Scout', emoji: '🔭' },
    { id: 'igl', name: 'IGL', price: 5000, description: 'Líder In-Game', type: 'ROLE', category: 'STYLE', roleName: '🗣️ IGL', emoji: '🗣️' },
    { id: 'driver_fuga', name: 'Motorista de Fuga', price: 5000, description: 'O piloto do bonde', type: 'ROLE', category: 'STYLE', roleName: '🚗 Motorista de Fuga', emoji: '🚗' },
    { id: 'ghost', name: 'Ghost / Ninja', price: 5000, description: 'Invisível e letal', type: 'ROLE', category: 'STYLE', roleName: '👻 Ghost', emoji: '👻' },
    { id: 'bridge_camper', name: 'Bridge Camper', price: 5000, description: 'Cobrador de pedágio', type: 'ROLE', category: 'STYLE', roleName: '🌉 Bridge Camper', emoji: '🌉' },
    { id: 'loot_goblin', name: 'Loot Goblin', price: 5000, description: 'Nunca deixa nada para trás', type: 'ROLE', category: 'STYLE', roleName: '🐀 Loot Goblin', emoji: '🐀' },
    { id: 'bot_hunter', name: 'Bot Hunter', price: 5000, description: 'Caçador de IAs', type: 'ROLE', category: 'STYLE', roleName: '🤖 Bot Hunter', emoji: '🤖' },
    { id: 'potato_aim', name: 'Batata Aim', price: 1000, description: 'Assuma sua mira!', type: 'ROLE', category: 'STYLE', roleName: '🥔 Batata Aim', emoji: '🥔' },

    // --- BLACK MARKET (RARE) ---
    { id: 'golden_pan', name: 'Frigideira de Ouro', price: 15000, description: 'Item de Colecionador', type: 'COLLECTIBLE', category: 'BLACK_MARKET', emoji: '🍳' },
    { id: 'winner_winner', name: 'Winner Winner', price: 20000, description: 'Título de Campeão', type: 'ROLE', category: 'BLACK_MARKET', roleName: '🍗 Winner Winner', emoji: '🍗' },
    { id: 'rename_card', name: 'Rename Card', price: 2000, description: 'Alterar Apelido (Ticket)', type: 'COLLECTIBLE', category: 'BLACK_MARKET', emoji: '🎫' },
    { id: 'color_change', name: 'Color Change', price: 3000, description: 'Alterar Cor (Ticket)', type: 'COLLECTIBLE', category: 'BLACK_MARKET', emoji: '🎨' },
    { id: 'vip_pass', name: 'VIP Pass (30d)', price: 25000, description: 'Acesso VIP Temporário', type: 'ROLE', category: 'BLACK_MARKET', roleName: '🎟️ VIP Pass', emoji: '🎟️' },
    { id: 'lone_wolf', name: 'Lobo Solitário', price: 10000, description: 'Para quem joga solo', type: 'ROLE', category: 'BLACK_MARKET', roleName: '🐺 Lobo Solitário', emoji: '🐺' },
    { id: 'shark', name: 'Tubarão do Servidor', price: 30000, description: 'Predador dos mares', type: 'ROLE', category: 'BLACK_MARKET', roleName: '🦈 Tubarão do Servidor', emoji: '🦈' },
    { id: 'magnata', name: 'Magnata', price: 50000, description: 'Ostentação Pura', type: 'ROLE', category: 'BLACK_MARKET', roleName: '💸 Magnata', emoji: '💸' },
    { id: 'godfather', name: 'O Poderoso Chefão', price: 100000, description: 'O Dono da Rua', type: 'ROLE', category: 'BLACK_MARKET', roleName: '👑 O Poderoso Chefão', emoji: '👑' },
    { id: 'unicorn', name: 'Unicórnio Tático', price: 150000, description: 'Mítico e Inexistente', type: 'ROLE', category: 'BLACK_MARKET', roleName: '🦄 Unicórnio Tático', emoji: '🦄' },
];
