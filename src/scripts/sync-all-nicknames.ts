import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from '../core/config';
import logger from '../core/logger';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
    ],
});

// Definição de Prioridade de Ícones (IGUAL AO EVENTO)
const PRIORITY_ICONS = [
  // 1. Comando Supremo (Staff)
  { role: '🦅 General de Exército', icon: '🌟' }, // Estrela/Coroa para Dono
  { role: '🎖️ Coronel', icon: '⚔️' }, // Espadas para Admin
  { role: '⚔️ Capitão', icon: '🛡️' }, // Escudo para Mod

  // 2. Liderança de Clã
  { role: '👑 Líder Hawk', icon: '👑' }, // Coroa para Líder
  { role: '👑 Líder Mira Ruim', icon: '👑' },

  // 3. Membros de Clã
  { role: '🦅 Hawk Esports', icon: '🦅' }, // Águia
  { role: '🎯 Mira Ruim', icon: '🎯' }, // Alvo

  // 4. Sistema
  { role: '🤖 System', icon: '🤖' }
];

async function syncAllNicknames() {
    try {
        await client.login(config.DISCORD_BOT_TOKEN);
        logger.info('🤖 Bot conectado para sincronização em massa de apelidos...');

        await new Promise(resolve => setTimeout(resolve, 2000));

        const guild = client.guilds.cache.first();
        if (!guild) {
            logger.error('❌ Nenhuma guilda encontrada.');
            process.exit(1);
        }

        logger.info(`🎯 Sincronizando: ${guild.name}`);

        // Fetch All Members (Importante para pegar todo mundo)
        const members = await guild.members.fetch();
        logger.info(`👥 Total de membros encontrados: ${members.size}`);

        let updatedCount = 0;
        let errorCount = 0;

        for (const [id, member] of members) {
            // Ignorar Dono (Bot não pode mudar)
            if (id === guild.ownerId) continue;
            // Ignorar se o bot não tiver permissão sobre o membro
            if (member.roles.highest.position >= guild.members.me!.roles.highest.position) continue;

            try {
                const currentNick = member.nickname || member.user.username;
                let targetIcon = '';

                // Descobrir ícone (PRIORIDADE)
                for (const entry of PRIORITY_ICONS) {
                    if (member.roles.cache.some(r => r.name === entry.role)) {
                        targetIcon = entry.icon;
                        break;
                    }
                }

                // Fallback (Opcional)
                // if (!targetIcon) targetIcon = '🪖';

                if (targetIcon) {
                    const iconPrefix = `${targetIcon} | `;
                    
                    // Se já tem, ignora
                    if (currentNick.startsWith(iconPrefix)) continue;

                    // Remove ícones antigos
                    const cleanNick = currentNick.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s\|\s/u, '');
                    let newNick = `${iconPrefix}${cleanNick}`;

                    // Limite
                    if (newNick.length > 32) newNick = newNick.substring(0, 32);

                    if (newNick !== currentNick) {
                        await member.setNickname(newNick);
                        updatedCount++;
                        logger.info(`✅ [${updatedCount}] Atualizado: ${member.user.tag} -> ${newNick}`);
                        
                        // Delay para evitar Rate Limit (Importante em massa)
                        await new Promise(resolve => setTimeout(resolve, 1000)); 
                    }
                }

            } catch (e) {
                errorCount++;
                // Silently fail or log debug
            }
        }

        logger.info(`🏁 Sincronização concluída!`);
        logger.info(`✨ Atualizados: ${updatedCount}`);
        logger.info(`⚠️ Falhas/Ignorados: ${errorCount}`);
        process.exit(0);

    } catch (error) {
        logger.error(error, '❌ Erro fatal no script:');
        process.exit(1);
    }
}

syncAllNicknames();
