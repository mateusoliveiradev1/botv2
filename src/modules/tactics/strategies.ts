export interface StrategyCard {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
}

export const STRATEGIES: StrategyCard[] = [
    {
        id: 'hard_center',
        name: 'HARD CENTER',
        description: 'Ignorem o loot secundário. Peguem veículos e invadam o centro da Safe 1. Segurem o melhor compound.',
        icon: '🛡️',
        color: '#FFFF00'
    },
    {
        id: 'edge_clean',
        name: 'EDGE CLEANER',
        description: 'Joguem na borda do gás. Façam rotação lenta limpando as costas. Não deixem ninguém entrar atrás de vocês.',
        icon: '⚔️',
        color: '#FF0000'
    },
    {
        id: 'split_2_2',
        name: 'SPLIT 2-2',
        description: 'Dividam o time em duas duplas. Uma domina o high ground, a outra avança. Cubram ângulos diferentes.',
        icon: '👥',
        color: '#00FFFF'
    },
    {
        id: 'scouting',
        name: 'SCOUTING INTENSIVO',
        description: 'Um jogador (Scout) vai na frente de moto/carro. O resto segue só quando o caminho estiver limpo.',
        icon: '🔭',
        color: '#00FF00'
    },
    {
        id: 'gatekeeper',
        name: 'GATEKEEPERS',
        description: 'Fechem a ponte ou o chokepoint principal. Ninguém passa pela sua rota.',
        icon: '🚧',
        color: '#FFA500'
    },
    {
        id: 'mad_max',
        name: 'MAD MAX',
        description: 'Prioridade total em veículos e Drops Aéreos. Busquem a crate e lutem por ela.',
        icon: '🚗',
        color: '#FF00FF'
    }
];
