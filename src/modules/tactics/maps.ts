export interface MapLocation {
    x: number; // Percentage 0-100 or coordinate
    y: number;
    loot: string;      // Stars or Description
    vehicles: string;  // Stars
    danger: string;    // Danger Level
    tips: string;      // Tactical tip
}

export interface MapData {
    name: string;
    size: string;
    image: string; // URL
    features: string[];
    locations: Record<string, MapLocation>;
}

export const MAPS: Record<string, MapData> = {
  ERANGEL: {
    name: 'Erangel',
    size: '8x8 km',
    image: 'https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg', // Generic fallback or specific
    features: ['Ferries', 'Secret Rooms (Keys)', 'Bridges'],
    locations: {
      'Pochinki': { 
          x: 50, y: 50, 
          loot: '⭐⭐⭐', vehicles: '⭐⭐', danger: '🔥 EXTREMO',
          tips: 'O centro do mapa. Domine a Igreja ou os Three-Story para visão. Rotação difícil pelo open field.' 
      },
      'School / Rozhok': { 
          x: 55, y: 45, 
          loot: '⭐⭐⭐', vehicles: '⭐⭐⭐', danger: '🔥 EXTREMO',
          tips: 'School é Deathmatch. Rozhok tem o melhor high ground e garagem garantida.'
      },
      'Military Base (Sosnovka)': { 
          x: 50, y: 85, 
          loot: '⭐⭐⭐⭐⭐', vehicles: '⭐⭐⭐', danger: '🔴 ALTO',
          tips: 'Melhor loot do mapa. Cuidado extremo com os campers nas pontes na hora de sair.'
      },
      'Georgopol': { 
          x: 20, y: 30, 
          loot: '⭐⭐⭐⭐', vehicles: '⭐⭐', danger: '🔴 ALTO',
          tips: 'Luta nos containers é caótica e vertical. Use as torres para spotar.'
      }
    }
  },
  MIRAMAR: {
    name: 'Miramar',
    size: '8x8 km',
    image: 'https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg',
    features: ['Ziplines', 'Sandstorms', 'Vending Machines'],
    locations: {
      'Pecado': { 
          x: 45, y: 55, 
          loot: '⭐⭐⭐⭐', vehicles: '⭐', danger: '🔥 EXTREMO',
          tips: 'O Cassino e o Ginásio são os hot drops. Rotação centralizada facilita qualquer safe.'
      },
      'Hacienda del Patron': { 
          x: 50, y: 40, 
          loot: '⭐⭐⭐⭐', vehicles: '⭐', danger: '🔥 SUICÍDIO',
          tips: 'Combate CQB insano. Quem sai vivo sai full loot nivel 3.'
      },
      'Los Leones': { 
          x: 60, y: 70, 
          loot: '⭐⭐⭐⭐⭐', vehicles: '⭐⭐⭐', danger: '🟠 MÉDIO',
          tips: 'Cidade imensa. Muitos prédios para campers. Evite correr nas ruas abertas.'
      }
    }
  },
  TAEGO: {
    name: 'Taego',
    size: '8x8 km',
    image: 'https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg',
    features: ['Comeback BR', 'Secret Rooms', 'Error Space', 'Self-AED'],
    locations: {
      'Terminal': { 
          x: 50, y: 50, 
          loot: '⭐⭐⭐⭐', vehicles: '⭐⭐', danger: '🔴 ALTO',
          tips: 'Muitos ângulos. Controle o telhado principal para dominar a área.'
      },
      'Palace': { 
          x: 20, y: 20, 
          loot: '⭐⭐⭐⭐', vehicles: '⭐', danger: '🟠 MÉDIO',
          tips: 'Loot concentrado. Rotação longa se a safe fechar longe.'
      }
    }
  },
  RONDO: {
    name: 'Rondo',
    size: '8x8 km',
    image: 'https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg',
    features: ['Market/Shop', 'Additional Plane', 'Stun Gun', 'Escalators'],
    locations: {
      'Jadena City': { 
          x: 70, y: 70, 
          loot: '⭐⭐⭐⭐⭐', vehicles: '⭐⭐⭐', danger: '🔴 ALTO',
          tips: 'Combate urbano intenso. Use as escadas rolantes para flanquear.'
      },
      'NEOX Factory': { 
          x: 80, y: 30, 
          loot: '⭐⭐⭐⭐', vehicles: '⭐⭐', danger: '🟠 MÉDIO',
          tips: 'Fábrica de veículos. Ótimo para garantir transporte.'
      }
    }
  },
  VIKENDI: {
    name: 'Vikendi',
    size: '6x6 km',
    image: 'https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg',
    features: ['Cable Cars', 'Lab Camps', 'Crowbar Rooms', 'Blizzard'],
    locations: {
      'Train Station': { 
          x: 50, y: 50, 
          loot: '⭐⭐⭐⭐', vehicles: '⭐⭐', danger: '🔴 ALTO',
          tips: 'Labirinto de trens. Cuidado com campers em cima dos vagões.'
      },
      'Castle': { 
          x: 40, y: 40, 
          loot: '⭐⭐⭐', vehicles: '⭐', danger: '🟠 MÉDIO',
          tips: 'Fortaleza defensiva. Difícil de invadir, fácil de defender.'
      }
    }
  },
  DESTON: {
    name: 'Deston',
    size: '8x8 km',
    image: 'https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg',
    features: ['Ascenders', 'Bluechip Detector (Removed)', 'Security Keys', 'Airboats'],
    locations: {
      'Ripton': { 
          x: 80, y: 50, 
          loot: '⭐⭐⭐⭐⭐', vehicles: '⭐⭐', danger: '🔴 ALTO',
          tips: 'Cidade alagada e arranha-céus. Use os Ascenders para ganhar high ground instantâneo.'
      },
      'Lodge': { 
          x: 50, y: 50, 
          loot: '⭐⭐⭐⭐', vehicles: '⭐⭐', danger: '🔥 EXTREMO',
          tips: 'O maior prédio do mapa. Loot insano, mas muito perigoso.'
      }
    }
  },
  SANHOK: {
    name: 'Sanhok',
    size: '4x4 km',
    image: 'https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg',
    features: ['Loot Truck', 'Fast Paced', 'Dynamic Weather'],
    locations: {
      'Bootcamp': { 
          x: 50, y: 50, 
          loot: '⭐⭐⭐⭐⭐', vehicles: '⭐', danger: '🔥 SUICÍDIO',
          tips: 'O lugar mais quente do PUBG. Só caia se confiar na sua mira (ou sorte).'
      },
      'Paradise Resort': { 
          x: 60, y: 30, 
          loot: '⭐⭐⭐⭐', vehicles: '⭐', danger: '🔥 EXTREMO',
          tips: 'Combate em corredores e pátios. SMGs e Shotguns brilham aqui.'
      }
    }
  },
  PARAMO: {
    name: 'Paramo',
    size: '3x3 km',
    image: 'https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg',
    features: ['Dynamic Terrain', 'Lava', 'Helicopter Loot'],
    locations: {
      'Atlal': { 
          x: 50, y: 50, 
          loot: '⭐⭐⭐', vehicles: '⭐', danger: '🟠 MÉDIO',
          tips: 'O layout da cidade muda a cada partida. Fique atento.'
      }
    }
  },
  KARAKIN: {
    name: 'Karakin',
    size: '2x2 km',
    image: 'https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg',
    features: ['Black Zone', 'Destructible Walls', 'Sticky Bombs'],
    locations: {
      'Bashara': { 
          x: 50, y: 50, 
          loot: '⭐⭐⭐', vehicles: '❌', danger: '🔴 ALTO',
          tips: 'Verticalidade e túneis. Leve C4/Sticky Bombs para abrir caminhos.'
      }
    }
  }
};
