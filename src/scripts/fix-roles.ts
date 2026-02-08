import { Client, GatewayIntentBits } from 'discord.js';
import { config } from '../core/config';
import logger from '../core/logger';
import { ROLES } from '../modules/setup/constants';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
    ],
});

async function runFix() {
    try {
        await client.login(config.DISCORD_BOT_TOKEN);
        logger.info('🤖 Bot conectado para correção de cargos...');

        // Aguardar cache sync
        await new Promise(resolve => setTimeout(resolve, 2000));

        const guild = client.guilds.cache.first();
        if (!guild) {
            logger.error('❌ Nenhuma guilda encontrada.');
            process.exit(1);
        }

        logger.info(`🎯 Alvo: ${guild.name}`);
        await guild.members.fetchMe();
        
        // --- 1. Sincronizar Hoist (Separar Categorias) ---
        const allRolesConfig = [
            ...ROLES.STAFF,
            ...ROLES.CLANS,
            ...ROLES.RANKS,
            ...ROLES.BASE
        ];

        logger.info('🔄 Sincronizando configurações de Hoist...');
        
        for (const roleConfig of allRolesConfig) {
            const role = guild.roles.cache.find(r => r.name === roleConfig.name);
            
            if (role) {
                const shouldHoist = !!roleConfig.hoist;
                
                if (role.hoist !== shouldHoist) {
                    try {
                        await role.setHoist(shouldHoist);
                        logger.info(`✅ [Hoist] Atualizado: ${role.name} -> ${shouldHoist}`);
                        await new Promise(r => setTimeout(r, 500)); // Delay
                    } catch (e) {
                        logger.warn(`⚠️ Falha ao atualizar Hoist de ${role.name}`);
                    }
                }
            }
        }

        // --- 2. Auto-Nick do Bot ---
        try {
            const botMember = guild.members.me;
            const currentNick = botMember?.nickname || botMember?.user.username;
            if (botMember && !currentNick?.includes('🤖 |')) {
                await botMember.setNickname(`🤖 | ${botMember.user.username}`);
                logger.info('✅ Nick do Bot atualizado.');
            }
        } catch (e) {
            logger.warn('⚠️ Falha ao mudar nick do bot.');
        }

        logger.info('🏁 Correção concluída com sucesso!');
        process.exit(0);

    } catch (error) {
        logger.error(error, '❌ Erro fatal no script:');
        process.exit(1);
    }
}

runFix();
