export interface ProRotation {
    team: string;
    map: string;
    drop_spot: string;
    strategy: string;
    signature_move: string;
}

export const PRO_ROTATIONS: ProRotation[] = [
    {
        team: "Soniqs",
        map: "Erangel",
        drop_spot: "Pochinki / Farm",
        strategy: "Hard Center Control",
        signature_move: "Rotação rápida para os apartamentos de School se a safe fechar Norte."
    },
    {
        team: "Twisted Minds",
        map: "Miramar",
        drop_spot: "Pecado / San Martin",
        strategy: "Split 2-2 Aggressive",
        signature_move: "Dominar o 'High Ground' de Power Grid para fechar rotações de Los Leones."
    },
    {
        team: "17Gaming",
        map: "Taego",
        drop_spot: "Terminal",
        strategy: "Compound Defense",
        signature_move: "Uso massivo de smokes para criar cover artificial em open fields."
    },
    {
        team: "FaZe Clan",
        map: "Vikendi",
        drop_spot: "Castle",
        strategy: "Edge Cleaner",
        signature_move: "Rotação tardia usando o trem/cable car para surpreender times no centro."
    },
    {
        team: "Four Angry Men (4AM)",
        map: "Rondo",
        drop_spot: "Jadena City",
        strategy: "Urban Warfare",
        signature_move: "Controle dos terraços altos usando Ascenders para snipar rotações."
    }
];
