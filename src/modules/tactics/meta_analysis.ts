export interface WeaponStat {
    name: string;
    pick_rate: number; // Percentage
    avg_damage: number;
    win_rate: number;
}

export const META_STATS: Record<string, WeaponStat[]> = {
    AR: [
        { name: "Beryl M762", pick_rate: 62.5, avg_damage: 245, win_rate: 58.2 },
        { name: "M416", pick_rate: 28.3, avg_damage: 198, win_rate: 45.1 },
        { name: "AUG", pick_rate: 8.1, avg_damage: 210, win_rate: 49.5 }
    ],
    DMR: [
        { name: "Dragunov", pick_rate: 48.2, avg_damage: 310, win_rate: 55.4 },
        { name: "Mk12", pick_rate: 35.5, avg_damage: 280, win_rate: 51.0 },
        { name: "Mini14", pick_rate: 12.1, avg_damage: 180, win_rate: 42.8 }
    ],
    SR: [
        { name: "Kar98k", pick_rate: 4.2, avg_damage: 120, win_rate: 30.5 },
        { name: "AWM", pick_rate: 0.8, avg_damage: 450, win_rate: 75.0 }
    ]
};

export const WIN_CONDITIONS = {
    ROTATIONS: [
        { type: "Hard Center", win_rate: 35.0, description: "Ocupar o centro da Safe 1 e segurar compound." },
        { type: "Edge Play", win_rate: 22.5, description: "Jogar na borda do gás limpando as costas." },
        { type: "Late Rotate", win_rate: 15.2, description: "Entrar atrasado na safe (alto risco)." }
    ],
    VEHICLES: [
        { map: "Erangel", meta: "UAZ (Cover Móvel)", pick_rate: 85 },
        { map: "Miramar", meta: "Pickup/Mirado (Velocidade)", pick_rate: 90 },
        { map: "Taego", meta: "Pony Coupe (Aceleração)", pick_rate: 75 }
    ]
};
