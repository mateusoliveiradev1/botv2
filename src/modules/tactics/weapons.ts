export interface WeaponData {
    name: string;
    type: 'AR' | 'DMR' | 'SR' | 'SMG' | 'SG' | 'LMG' | 'HG';
    ammo: string;
    damage: number;
    rpm?: number; // Added for TTK Calc
    tier: 'S' | 'A' | 'B' | 'C' | 'GOD';
    description: string;
    meta_notes: string;
    bullet_velocity?: number; // m/s
    recoil_control?: string; // Low, Medium, High, Extreme
    attachments_guide?: string; // Essential attachments
}

export const WEAPONS: Record<string, WeaponData[]> = {
    AR: [
        {
            name: "Beryl M762",
            type: "AR",
            ammo: "7.62mm",
            damage: 44,
            rpm: 698,
            tier: "S",
            description: "O rei do DPS a curta/média distância. Recuo vertical agressivo.",
            meta_notes: "Meta absoluto para Fraggers. Supera a M416 no combate < 50m.",
            bullet_velocity: 715,
            recoil_control: "🔴 Difícil (Vertical)",
            attachments_guide: "Compensador + Vertical Grip + Ext. Quickdraw"
        },
        {
            name: "AUG",
            type: "AR",
            ammo: "5.56mm",
            damage: 41,
            rpm: 720, // Adjusted based on latest patch
            tier: "S",
            description: "A melhor AR 5.56mm. Cadência alta e recuo fácil de controlar.",
            meta_notes: "Essencial para sprays precisos a média distância.",
            bullet_velocity: 940,
            recoil_control: "🟢 Fácil (Laser)",
            attachments_guide: "Compensador + Half Grip + Coronha Tática"
        },
        {
            name: "M416",
            type: "AR",
            ammo: "5.56mm",
            damage: 40,
            rpm: 700,
            tier: "A",
            description: "A arma mais versátil do jogo. Requer todos os acessórios.",
            meta_notes: "Excelente para iniciantes, mas perde em trocação pura para Beryl.",
            bullet_velocity: 880,
            recoil_control: "🟡 Médio",
            attachments_guide: "Compensador + Vertical Grip + Coronha Tática"
        }
    ],
    DMR: [
        {
            name: "Dragunov",
            type: "DMR",
            ammo: "7.62mm",
            damage: 60,
            rpm: 400, // Semi-auto cap
            tier: "S",
            description: "DMR pesada com chance de dano crítico.",
            meta_notes: "Pode dar One-Shot em Capacete Lv2 se critar. Substituiu a SLR.",
            bullet_velocity: 830,
            recoil_control: "🟡 Médio (Recovery Lento)",
            attachments_guide: "Compensador + Cheek Pad + Ext. Mag"
        },
        {
            name: "Mk12",
            type: "DMR",
            ammo: "5.56mm",
            damage: 51,
            rpm: 450,
            tier: "S",
            description: "DMR de baixo recuo com bipé.",
            meta_notes: "Meta em mapas abertos (Miramar/Taego). Quase sem recuo quando deitado.",
            bullet_velocity: 930,
            recoil_control: "🟢 Baixo",
            attachments_guide: "Supressor + Vertical Grip + Ext. Mag"
        },
        {
            name: "Mini14",
            type: "DMR",
            ammo: "5.56mm",
            damage: 48,
            rpm: 500,
            tier: "A",
            description: "A DMR mais rápida do jogo.",
            meta_notes: "Melhor para acertar alvos em movimento (carros/paraquedas).",
            bullet_velocity: 990,
            recoil_control: "🟢 Muito Baixo",
            attachments_guide: "Supressor + Ext. Mag (Sem Grip)"
        }
    ],
    SR: [
        {
            name: "AWM",
            type: "SR",
            ammo: ".300 Magnum",
            damage: 105,
            tier: "GOD",
            description: "A única arma que mata Capacete Lv3 com 1 tiro.",
            meta_notes: "Drop exclusivo. Munição limitada.",
            bullet_velocity: 945,
            recoil_control: "N/A",
            attachments_guide: "Supressor + Cheek Pad"
        },
        {
            name: "Kar98k",
            type: "SR",
            ammo: "7.62mm",
            damage: 79,
            tier: "A",
            description: "Sniper clássica de ferrolho.",
            meta_notes: "One-shot em Capacete Lv2. Inferior a M24 em velocidade.",
            bullet_velocity: 760,
            recoil_control: "N/A",
            attachments_guide: "Bullet Loops (Recarga Rápida)"
        }
    ],
    SMG: [
        {
            name: "JS9",
            type: "SMG",
            ammo: "9mm",
            damage: 39,
            rpm: 900,
            tier: "S",
            description: "Exclusiva de Rondo. Laser beam.",
            meta_notes: "TTK absurdo a curta distância. Recuo inexistente.",
            bullet_velocity: 400,
            recoil_control: "🟢 Nulo",
            attachments_guide: "Compensador + Ext. Mag"
        },
        {
            name: "UMP45",
            type: "SMG",
            ammo: ".45 ACP",
            damage: 41,
            rpm: 650,
            tier: "A",
            description: "SMG lenta mas consistente.",
            meta_notes: "Boa para 'Limb Meta' (atirar nas pernas).",
            bullet_velocity: 360,
            recoil_control: "🟢 Baixo",
            attachments_guide: "Supressor + Vertical + Ext. Mag"
        }
    ]
};
