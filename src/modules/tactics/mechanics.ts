export const DAMAGE_MULTIPLIERS = {
    SR: { head: 2.50, neck: 1.50, torso: 1.10, limb: 0.95 },
    DMR: { head: 2.35, neck: 1.50, torso: 1.05, limb: 0.95 },
    AR: { head: 2.35, neck: 1.00, torso: 1.00, limb: 0.90 },
    SMG: { head: 1.80, neck: 1.00, torso: 1.05, limb: 1.20 },
    SG: { head: 1.50, neck: 1.00, torso: 1.00, limb: 0.90 }
};

export const BLUEZONE_TIMING = [
    { phase: 1, delay: 600, move: 300, dps: 0.4 },
    { phase: 2, delay: 120, move: 140, dps: 0.6 },
    { phase: 3, delay: 120, move: 140, dps: 1.0 },
    { phase: 4, delay: 120, move: 120, dps: 3.0 },
    { phase: 5, delay: 120, move: 120, dps: 5.0 },
    { phase: 6, delay: 120, move: 120, dps: 8.0 },
    { phase: 7, delay: 120, move: 90, dps: 10.0 },
    { phase: 8, delay: 120, move: 90, dps: 14.0 },
    { phase: 9, delay: 60, move: 30, dps: 22.0 }
];

export const THROWABLES = {
    FRAG: {
        name: "Frag Grenade",
        cooking_time: 5.0,
        kill_radius: "3.5m",
        meta_tip: "Cozinhe por 2-3s para airburst. O dano ignora coletes, mas é reduzido drasticamente por obstáculos."
    },
    SMOKE: {
        name: "Smoke Grenade",
        duration: 40,
        bloom_time: 3.0,
        meta_tip: "Use 'Wall of Smoke' (3+ smokes em linha) para cruzar abertos. Carregue no mínimo 4 por partida."
    },
    MOLOTOV: {
        name: "Molotov Cocktail",
        duration: 12,
        meta_tip: "O fogo se espalha 2x mais rápido em madeira. Impede ADS (Aim Down Sight) do inimigo enquanto queima."
    },
    BLUEZONE: {
        name: "Blue Zone Grenade",
        duration: 5,
        radius: "10m",
        meta_tip: "Perfeita para 'Flush' (finalizar) inimigos em cover ou forçar saída de prédios."
    }
};

export const VEHICLE_PHYSICS = {
    DRIVE_BY: "Troque para o assento 2 (CTRL+2) para atirar. O carro mantém o momento e estabilidade perfeita.",
    AIR_CONTROL: "Segure ESPAÇO + CTRL para controlar o nariz (Pitch). Use Q/E para girar (Roll).",
    TRACTION: {
        FWD: "Maioria dos Sedans. Sai de frente em curvas.",
        RWD: "Muscle Cars. Drift fácil, cuidado com acelerador.",
        AWD: "UAZ/Pickups. Melhor para off-road e subidas íngremes."
    }
};
