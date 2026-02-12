export interface ProRotation {
    team: string;
    map: string;
    drop_spot: string;
    strategy: string;
    signature_move: string;
    playstyle?: string;
    composition?: string;
    rotation_path?: string; // ASCII diagram
}

export const PRO_ROTATIONS: ProRotation[] = [
    {
        team: "Soniqs",
        map: "Erangel",
        drop_spot: "Pochinki / Farm",
        strategy: "Hard Center Control",
        signature_move: "Rotação rápida para os apartamentos de School se a safe fechar Norte.",
        playstyle: "🛡️ Defensivo / Posicional",
        composition: "2 DMR (Mk12), 2 AR (Beryl), 1 Shotcaller (IGL)",
        rotation_path: "Pochinki ➔ School ➔ Rozhok Hill"
    },
    {
        team: "Twisted Minds",
        map: "Miramar",
        drop_spot: "Pecado / San Martin",
        strategy: "Split 2-2 Aggressive",
        signature_move: "Dominar o 'High Ground' de Power Grid para fechar rotações de Los Leones.",
        playstyle: "⚔️ Agressivo / Caçador de Kills",
        composition: "3 DMR (Dragunov), 1 SR (AWM/Kar98), Full Smoke Utility",
        rotation_path: "Pecado ➔ Power Grid ➔ San Martin"
    },
    {
        team: "17Gaming",
        map: "Taego",
        drop_spot: "Terminal",
        strategy: "Compound Defense",
        signature_move: "Uso massivo de smokes para criar cover artificial em open fields.",
        playstyle: "🏰 Tartaruga (Full Defense)",
        composition: "4 ARs (Beryl/AUG) para CQC extremo",
        rotation_path: "Terminal ➔ Palace ➔ Ho San"
    },
    {
        team: "FaZe Clan",
        map: "Vikendi",
        drop_spot: "Castle",
        strategy: "Edge Cleaner",
        signature_move: "Rotação tardia usando o trem/cable car para surpreender times no centro.",
        playstyle: "🔄 Rotacional / Late Game",
        composition: "Balanced (2 AR, 2 DMR)",
        rotation_path: "Castle ➔ Villa ➔ Dino Land"
    },
    {
        team: "Four Angry Men (4AM)",
        map: "Rondo",
        drop_spot: "Jadena City",
        strategy: "Urban Warfare",
        signature_move: "Controle dos terraços altos usando Ascenders para snipar rotações.",
        playstyle: "🏙️ Urbano / Vertical",
        composition: "2 SMG (JS9) para prédios, 2 DMR para telhados",
        rotation_path: "Jadena ➔ NEOX Factory ➔ Stadium"
    }
];
