export interface WeaponData {
  name: string;
  type: "AR" | "DMR" | "SR" | "SMG" | "LMG" | "SG" | "HG";
  ammo: string;
  damage: number;
  tier: "S" | "A" | "B" | "C" | "GOD";
  description: string;
  meta_notes: string;
  best_attachments: string[];
  image?: string;
}

export const WEAPONS: Record<string, WeaponData[]> = {
  AR: [
    {
      name: "Beryl M762",
      type: "AR",
      ammo: "7.62mm",
      damage: 44,
      tier: "S",
      description:
        "O rei do DPS a curta/média distância. Recuo vertical alto, mas controlável com treino.",
      meta_notes:
        "Meta absoluto para Fraggers. Supera a M416 no combate < 50m.",
      best_attachments: ["Compensador", "Vertical Grip", "Ext. Quickdraw"],
    },
    {
      name: "AUG",
      type: "AR",
      ammo: "5.56mm",
      damage: 41,
      tier: "S",
      description:
        "A melhor AR de 5.56mm. Cadência de tiro insana e recuo horizontal quase nulo.",
      meta_notes:
        "Nerfada recentemente, mas continua sendo a escolha #1 para sprays precisos a média distância.",
      best_attachments: ["Compensador", "Half Grip", "Heavy Stock"],
    },
    {
      name: "M416",
      type: "AR",
      ammo: "5.56mm",
      damage: 40,
      tier: "A",
      description:
        "A arma mais versátil do jogo. Fácil de controlar, mas perde em DPS puro para Beryl/AUG.",
      meta_notes:
        "Excelente para iniciantes e suporte. Precisa de coronha tática para brilhar.",
      best_attachments: ["Compensador", "Vertical Grip", "Tactical Stock"],
    },
    {
      name: "ACE32",
      type: "AR",
      ammo: "7.62mm",
      damage: 43,
      tier: "A",
      description:
        "Híbrido entre M416 e Beryl. Menor recuo que a Beryl, mas menos dano.",
      meta_notes:
        "Uma alternativa sólida se você não consegue controlar a Beryl.",
      best_attachments: ["Compensador", "Half Grip", "Tactical Stock"],
    },
    {
      name: "AKM",
      type: "AR",
      ammo: "7.62mm",
      damage: 47,
      tier: "B",
      description: "Dano por tiro massivo, mas cadência lenta e recuo difícil.",
      meta_notes:
        "Boa para early game (hot drop) pois não precisa de muitos attachments.",
      best_attachments: ["Compensador", "Ext. Quickdraw"],
    },
  ],
  DMR: [
    {
      name: "Dragunov",
      type: "DMR",
      ammo: "7.62mm",
      damage: 60, // Variable chance for high damage
      tier: "S",
      description:
        "Monstro do meta atual. Chance de dar 'One-Shot' em capacete Lv2 a curta distância.",
      meta_notes:
        "A DMR mais temida. O dano base é altíssimo, permitindo derrubar com 2 tiros no peito.",
      best_attachments: ["Compensador", "Ext. Quickdraw", "Cheek Pad"],
    },
    {
      name: "Mk12",
      type: "DMR",
      ammo: "5.56mm",
      damage: 51,
      tier: "S",
      description:
        "Recuo quase inexistente quando deitada (bipé). Velocidade de bala altíssima.",
      meta_notes:
        "Meta em mapas grandes (Miramar/Taego/Vikendi). Spam de tiros muito fácil.",
      best_attachments: ["Supressor/Compensador", "Vertical Grip"],
    },
    {
      name: "Mini14",
      type: "DMR",
      ammo: "5.56mm",
      damage: 48,
      tier: "A",
      description:
        "A DMR mais rápida do jogo. Bullet velocity insana, quase hitscan.",
      meta_notes:
        "Perfeita para tiros em alvos móveis (carros/paraquedas). Dano baixo requer muitos hits.",
      best_attachments: ["Supressor", "Ext. Quickdraw"],
    },
    {
      name: "SLR",
      type: "DMR",
      ammo: "7.62mm",
      damage: 56,
      tier: "A",
      description: "A clássica. Bate muito forte, mas o recuo é punitivo.",
      meta_notes:
        "Substituída pela Dragunov no meta, mas ainda letal nas mãos certas.",
      best_attachments: ["Compensador", "Cheek Pad"],
    },
  ],
  SR: [
    {
      name: "Kar98k",
      type: "SR",
      ammo: "7.62mm",
      damage: 79,
      tier: "S",
      description: "A lenda. Derruba Capacete Lv2 com 1 tiro até 500m.",
      meta_notes: "Buffada recentemente. Animação de recarregamento rápida.",
      best_attachments: ["Bullet Loops", "Supressor"],
    },
    {
      name: "M24",
      type: "SR",
      ammo: "7.62mm",
      damage: 75,
      tier: "A",
      description: "Pode colocar pente estendido. Som satisfatório.",
      meta_notes:
        "Ligeiramente inferior a Kar98 no dano base atual, mas melhor velocidade de bala.",
      best_attachments: ["Supressor", "Ext. Quickdraw", "Cheek Pad"],
    },
    {
      name: "AWM",
      type: "SR",
      ammo: ".300 Magnum",
      damage: 105,
      tier: "GOD",
      description: "A única que derruba Capacete Lv3 com 1 tiro.",
      meta_notes: "Apenas Drop. Se ouvir uma, não fique parado.",
      best_attachments: ["Supressor", "Ext. Quickdraw", "Cheek Pad"],
    },
  ],
  SMG: [
    {
      name: "JS9",
      type: "SMG",
      ammo: "9mm",
      damage: 39,
      tier: "S",
      description: "Exclusiva do Rondo. Laser beam sem recuo.",
      meta_notes: "Nerfada, mas ainda quebrada. TTK absurdo a curta distância.",
      best_attachments: ["Compensador", "Vertical Grip"],
    },
    {
      name: "UMP45",
      type: "SMG",
      ammo: ".45 ACP",
      damage: 41,
      tier: "A",
      description: "O 'laser' do pobre. Fácil de usar, dano consistente.",
      meta_notes:
        "Perdeu espaço para as ARs, mas ainda viável para iniciantes.",
      best_attachments: ["Compensador", "Vertical Grip"],
    },
    {
      name: "Vector",
      type: "SMG",
      ammo: "9mm",
      damage: 31,
      tier: "A",
      description: "Cospe balas. Se você errar o spray, morreu.",
      meta_notes:
        "Requer Ext. Quickdraw obrigatoriamente. TTK instantâneo em < 10m.",
      best_attachments: ["Compensador", "Vertical Grip", "Tactical Stock"],
    },
  ],
};
