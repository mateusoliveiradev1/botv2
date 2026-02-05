export const BAD_WORDS = [
    // Ofensas Gerais (Termos inegavelmente ofensivos)
    'arrombado', 'arrombada', 
    'babaca', 
    'bosta', 
    'caralho', 
    'corno', 'corna',
    'fdp', 'filho da puta', 'filha da puta',
    'merda', 
    'pau no cu',
    'porra', 
    'puta', 'puto',
    'vadia', 'vagabundo', 'vagabunda',
    'viado', 'bicha', 'bixa',
    'imbecil', 'idiota', 'trouxa',
    
    // Termos de Ódio (Removido termos ambíguos como 'preto' para evitar falsos positivos)
    'nazista', 'hitler', 'macaco', 
    
    // Scams e Phishing comuns
    'nitro free', 'nitro grátis', 'nitro gratis',
    'steam gift', 'steam grátis', 'steam gratis',
    'free steam',
    'discord nitro free',
    'robux free', 'robux gratis',
    'gemas gratis', 'gemas grátis',
    'sorteio de conta',
    'teste meu jogo', 'test my game'
];

export const SUSPICIOUS_DOMAINS = [
    'steamcommunity.com.gift',
    'dlscord.gg', 'discorcl.gg', 'discord-app', 'discord-gift',
    'bit.ly', 'goo.gl', 'tinyurl.com' // Encurtadores muitas vezes usados em spam
];
