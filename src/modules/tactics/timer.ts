import { TextChannel, EmbedBuilder } from 'discord.js';
import logger from '../../core/logger';

export class TimerManager {
    private static timers: Map<string, NodeJS.Timeout[]> = new Map();

    static async startMatch(channel: TextChannel) {
        // Clear existing timers for this channel
        this.stopMatch(channel.id);

        // Send Start Embed
        const startEmbed = new EmbedBuilder()
            .setTitle("⏱️ OPERAÇÃO INICIADA")
            .setDescription("O cronômetro tático está ativo. Mantenham o rádio limpo para os alertas.")
            .setColor("#00FF00")
            .setTimestamp();

        await channel.send({ embeds: [startEmbed] });

        // SUPER Ruleset v3.0.5 Timers (Erangel/Miramar)
        // Format: Delay (Wait) -> Move (Close)
        // Phase 1: 10:00 Delay + 5:00 Move (Total 15:00)
        // Phase 2: 02:00 Delay + 2:20 Move (Total 19:20)
        // Phase 3: 02:00 Delay + 2:20 Move (Total 23:40)
        // Phase 4: 02:00 Delay + 2:00 Move (Total 27:40)
        // Phase 5: 02:00 Delay + 2:00 Move (Total 31:40)
        // Phase 6: 02:00 Delay + 2:00 Move (Total 35:40)
        // Phase 7: 02:00 Delay + 1:30 Move (Total 39:10)
        // Phase 8: 02:00 Delay + 1:30 Move (Total 42:40)
        // Phase 9: 01:00 Delay + 0:30 Move (Total 44:10)

        const alerts = [
            // --- PHASE 1 (00:00 -> 15:00) ---
            { 
                time: 6 * 60 * 1000, 
                title: "🚨 FIM DO LOOT / ROTAÇÃO (06:00)",
                msg: "Faltam 4 minutos para a Zone 1 fechar. Saiam dos compounds agora!",
                color: "#FFFF00"
            },
            { 
                time: 10 * 60 * 1000, 
                title: "⚠️ ZONE 1 FECHANDO (10:00)",
                msg: "O gás azul começou a se mover. Vocês têm 5 minutos para chegar na Safe.",
                color: "#FFA500"
            },
            
            // --- PHASE 2 (15:00 -> 19:20) ---
            { 
                time: 15 * 60 * 1000, 
                title: "🛡️ ZONE 2 REVELADA (15:00)",
                msg: "Zone 1 fechou. Nova safe revelada. Vocês têm 2 minutos para decidir o próximo pulo.",
                color: "#00FFFF"
            },
            { 
                time: 17 * 60 * 1000, 
                title: "⚠️ ZONE 2 FECHANDO (17:00)",
                msg: "O gás está fechando. Posicionem-se para o Mid-Game.",
                color: "#FFA500"
            },

            // --- PHASE 3 (19:20 -> 23:40) ---
            { 
                time: 19 * 60 * 1000 + 20 * 1000, // 19:20
                title: "🔥 ZONE 3 REVELADA (19:20)",
                msg: "O jogo apertou. Prioridade: High Ground e Informação.",
                color: "#FF4500"
            },

            // --- PHASE 4 (23:40 -> 27:40) ---
            { 
                time: 23 * 60 * 1000 + 40 * 1000, // 23:40
                title: "☠️ ZONE 4 - LATE GAME (23:40)",
                msg: "Entramos no Late Game. Carros são cover agora. Usem smokes!",
                color: "#FF0000"
            },

            // --- PHASE 5+ (Critical Moments) ---
            { 
                time: 27 * 60 * 1000 + 40 * 1000, // 27:40
                title: "☠️ ZONE 5 (27:40)",
                msg: "Foco total. Limpem as costas e avancem com o gás.",
                color: "#8B0000" // Dark Red
            },
            { 
                time: 31 * 60 * 1000 + 40 * 1000, // 31:40
                title: "🏆 RETA FINAL (31:40)",
                msg: "Fases finais. A vitória é decidida nos detalhes. Boa sorte!",
                color: "#800080" // Purple
            }
        ];

        const channelTimers: NodeJS.Timeout[] = [];

        alerts.forEach(alert => {
            const timer = setTimeout(async () => {
                try {
                    const alertEmbed = new EmbedBuilder()
                        .setTitle(alert.title)
                        .setDescription(alert.msg)
                        .setColor(alert.color as any)
                        .setFooter({ text: "Sistema de Alerta Tático" });

                    await channel.send({ embeds: [alertEmbed] });
                } catch (e) {
                    logger.error(e, `Failed to send timer alert to ${channel.name}`);
                }
            }, alert.time);
            channelTimers.push(timer);
        });

        this.timers.set(channel.id, channelTimers);
        logger.info(`Match timer started for channel ${channel.id} with ${channelTimers.length} alerts scheduled.`);
    }

    static stopMatch(channelId: string) {
        const existing = this.timers.get(channelId);
        if (existing) {
            existing.forEach(t => clearTimeout(t));
            this.timers.delete(channelId);
            logger.info(`Match timer stopped for channel ${channelId}.`);
            return true;
        }
        return false;
    }
}
