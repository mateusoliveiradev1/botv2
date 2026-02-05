import path from 'path';

interface MapLocation {
    x: number;
    y: number;
    loot: string;      // High, Medium, Low
    vehicles: string;  // High, Medium, Low
    danger: string;    // Hot Drop, Moderate, Safe
    tips: string;      // Tactical tip
}

interface MapData {
    name: string;
    image: string;
    locations: Record<string, MapLocation>;
}

export const MAPS: Record<string, MapData> = {
  ERANGEL: {
    name: 'Erangel',
    image: path.join(process.cwd(), 'assets/maps/erangel.jpg'),
    locations: {
      'Pochinki': { 
          x: 500, y: 500, 
          loot: '⭐⭐⭐', vehicles: '⭐⭐', danger: '🔥 EXTREMO',
          tips: 'Domine a Igreja ou os Three-Story para visão. Cuidado com o open field nas saídas.' 
      },
      'School': { 
          x: 550, y: 450, 
          loot: '⭐⭐⭐', vehicles: '⭐', danger: '🔥 EXTREMO',
          tips: 'Quem cai no teto tem vantagem. Rotação rápida para Apartamentos se der ruim.'
      },
      'Military Base': { 
          x: 500, y: 800, 
          loot: '⭐⭐⭐⭐', vehicles: '⭐⭐⭐', danger: '🔴 ALTO',
          tips: 'Cuidado com a Bridge Camp na saída. Tenha sempre um barco de backup.'
      },
      'Georgopol': { 
          x: 200, y: 300, 
          loot: '⭐⭐⭐⭐', vehicles: '⭐⭐', danger: '🔴 ALTO',
          tips: 'Luta de containers é caótica. Use as torres para spotar inimigos.'
      },
      'Rozhok': { 
          x: 550, y: 400, 
          loot: '⭐⭐', vehicles: '⭐⭐⭐', danger: '🟠 MÉDIO',
          tips: 'Posição central perfeita. Garagem garantida no lado sul.'
      },
      'Yasnaya Polyana': { 
          x: 700, y: 350, 
          loot: '⭐⭐⭐⭐', vehicles: '⭐⭐', danger: '🔴 ALTO',
          tips: 'Muitos prédios = Luta lenta. Limpe um setor por vez (Delegacia ou Prédios Altos).'
      },
      'Gatka': { 
          x: 300, y: 550, 
          loot: '⭐', vehicles: '⭐', danger: '🟢 BAIXO',
          tips: 'Bom para solo/duo. Squad precisa dividir loot nas casas ao redor.'
      },
      'Mylta': { 
          x: 750, y: 650, 
          loot: '⭐⭐', vehicles: '⭐⭐⭐', danger: '🟠 MÉDIO',
          tips: 'Controle a garagem na saída oeste. Rotação fácil para a ponte.'
      },
    }
  },
  MIRAMAR: {
    name: 'Miramar',
    image: path.join(process.cwd(), 'assets/maps/miramar.png'),
    locations: {
      'Pecado': { 
          x: 450, y: 550, 
          loot: '⭐⭐⭐⭐', vehicles: '⭐', danger: '🔥 EXTREMO',
          tips: 'O Cassino é o rei. Se não cair lá, pegue o Hotel 5 andares.'
      },
      'Hacienda': { 
          x: 500, y: 400, 
          loot: '⭐⭐⭐⭐', vehicles: '⭐', danger: '🔥 SUICÍDIO',
          tips: 'Combate CQB intenso. Shotguns e SMGs dominam aqui.'
      },
      'San Martin': { 
          x: 500, y: 450, 
          loot: '⭐⭐⭐', vehicles: '⭐⭐', danger: '🔴 ALTO',
          tips: 'Cuidado com quem cai na Power Grid e desce o morro.'
      },
      'Los Leones': { 
          x: 600, y: 700, 
          loot: '⭐⭐⭐⭐⭐', vehicles: '⭐⭐⭐', danger: '🟠 MÉDIO',
          tips: 'Cidade gigante. Dá para lootear sem brigar se ficar nas bordas.'
      },
      'El Pozo': { 
          x: 300, y: 350, 
          loot: '⭐⭐⭐', vehicles: '⭐⭐', danger: '🟠 MÉDIO',
          tips: 'Use a Arena de Boxe para loot rápido. Saída fácil para norte.'
      },
      'Chumacera': { 
          x: 400, y: 650, 
          loot: '⭐⭐', vehicles: '⭐', danger: '🟠 MÉDIO',
          tips: 'High ground domina. Pegue as casas no topo primeiro.'
      },
      'Monte Nuevo': { 
          x: 350, y: 400, 
          loot: '⭐⭐', vehicles: '⭐⭐', danger: '🟢 BAIXO',
          tips: 'Ótima visão de El Pozo. Rotação segura pelas montanhas.'
      },
      'Power Grid': { 
          x: 550, y: 500, 
          loot: '⭐⭐', vehicles: '⭐', danger: '🔴 ALTO',
          tips: 'Loot escasso para squad. Caia, mate rápido e desça para San Martin.'
      },
    }
  }
};
