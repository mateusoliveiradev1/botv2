import {
  Client,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
} from "discord.js";
import { MISSION_POOL, MissionTemplate, MissionType } from "./constants";
import logger from "../../core/logger";
import { XpManager } from "../xp/manager";
import { EmbedFactory } from "../../utils/embeds";
import { db } from "../../core/DatabaseManager"; // Import DatabaseManager
import { LogManager, LogType, LogLevel } from "../logger/LogManager";

// Remove JSON interfaces and imports
// ...

export class MissionManager {
  // Keep data for rotation state only (active missions)
  private static activeMissions: string[] = [];
  private static lastRotationDate: string = "";
  private static client: Client;

  // Cache de progresso em memória para reduzir carga no banco (Write-Behind)
  // Map<userId_missionId, { amount: number, lastUpdate: number }>
  private static progressCache = new Map<string, { amount: number, lastUpdate: number }>();
  private static CACHE_FLUSH_INTERVAL = 5 * 60 * 1000; // 5 minutos (era 30s)
  private static CACHE_MAX_SIZE = 50; // Se atingir 50 itens, flush imediato

  static async handleInteraction(interaction: any) {
    if (!interaction.isButton()) return;

    if (
      interaction.customId === "check_mission_progress" ||
      interaction.customId === "refresh_mission_progress"
    ) {
      // Usar flags: 64 para Ephemeral
      await interaction.deferReply({ flags: 64 });

      try {
          // Timeout de 5s para evitar que o botão fique pensando infinitamente
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de Banco de Dados')), 5000));
          
          const processPromise = (async () => {
              const claimed = await this.claimRewards(
                interaction.member as GuildMember,
              );
              const embed = await this.getProgressEmbed(
                interaction.member as GuildMember,
              );
              return { claimed, embed };
          })();

          const result: any = await Promise.race([processPromise, timeoutPromise]);
          const { claimed, embed } = result;

          let content;
          if (claimed.length > 0) {
            content = `🎉 **Parabéns!** Você resgatou:\n${claimed.map((s: string) => `• ${s}`).join("\n")}`;

            // Log Claim (Background)
            LogManager.log({
              guild: interaction.guild!,
              type: LogType.SYSTEM,
              level: LogLevel.SUCCESS,
              title: "🎁 Missão Concluída",
              description: `Recompensa resgatada pelo combatente.`,
              executor: interaction.user,
              fields: [
                { name: "Recompensas", value: claimed.join(", "), inline: false },
              ],
            }).catch(() => {});
          } else {
            content = "📊 Aqui está seu progresso atual:";
          }

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId("refresh_mission_progress")
              .setLabel("🔄 Atualizar")
              .setStyle(ButtonStyle.Secondary),
          );

          await interaction.editReply({
            content: content,
            embeds: [embed],
            components: [row],
          });
      } catch (error) {
          await interaction.editReply({
              content: "⚠️ **Sistema de Missões Indisponível.**\nO banco de dados está instável no momento. Tente novamente em alguns segundos.",
              embeds: [],
              components: []
          });
      }
      return;
    }
  }

  // Fila de processamento para garantir que um flush termine antes do próximo começar
  private static isFlushing = false;

  static init(client: Client) {
    this.client = client;
    this.loadRotationState().then(() => {
      this.checkRotation();
    });

    setInterval(() => this.checkRotation(), 60 * 60 * 1000);

    // Substituir setInterval por loop recursivo com verificação de flag (Queue Pattern)
    this.scheduleNextFlush();
  }

  private static scheduleNextFlush() {
    // JITTER: Adiciona um atraso aleatório entre 0 e 30 segundos
    // Isso evita que, se o bot reiniciar, o flush de Missão e XP (que também é 5m)
    // aconteçam exatamente no mesmo milissegundo.
    const jitter = Math.floor(Math.random() * 30000); 
    const delay = this.CACHE_FLUSH_INTERVAL + jitter;

    setTimeout(async () => {
        if (!this.isFlushing) {
            await this.flushCache();
        }
        this.scheduleNextFlush();
    }, delay);
  }

  private static async loadRotationState() {
    try {
      const dateState = await db.read(async (prisma) =>
        prisma.systemState.findUnique({ where: { key: "missions_date" } }),
      );
      const missionsState = await db.read(async (prisma) =>
        prisma.systemState.findUnique({ where: { key: "missions_active" } }),
      );

      if (dateState) this.lastRotationDate = dateState.value;
      if (missionsState) this.activeMissions = missionsState.value.split(",");
    } catch (e) {
      logger.warn("Failed to load rotation state");
    }
  }

  private static async saveRotationState() {
    await db.write(async (prisma) => {
      await prisma.systemState.upsert({
        where: { key: "missions_date" },
        update: { value: this.lastRotationDate },
        create: { key: "missions_date", value: this.lastRotationDate },
      });

      await prisma.systemState.upsert({
        where: { key: "missions_active" },
        update: { value: this.activeMissions.join(",") },
        create: {
          key: "missions_active",
          value: this.activeMissions.join(","),
        },
      });
    });
  }

  private static getTodayDate(): string {
    return new Date().toISOString().split("T")[0];
  }

  private static async checkRotation() {
    const today = this.getTodayDate();
    if (this.lastRotationDate !== today) {
      logger.info("🔄 Rotating Daily Missions...");

      const shuffled = [...MISSION_POOL].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3);

      this.lastRotationDate = today;
      this.activeMissions = selected.map((m) => m.id);

      await this.saveRotationState();

      // Use DB Manager for DeleteMany
      await db.write(async (prisma) => {
        await prisma.missionProgress.deleteMany({});
      });

      await this.updateChannelBoard();
    }
  }

  static async updateChannelBoard() {
    if (!this.client) return;
    const guild = this.client.guilds.cache.first();
    if (!guild) return;

    const channel = guild.channels.cache.find(
      (c) => c.name === "📅-missões",
    ) as TextChannel;
    if (!channel) return;

    const activeMissions = this.getActiveMissions();

    const embed = new EmbedBuilder()
      .setTitle(`📅 MISSÕES DIÁRIAS: ${this.lastRotationDate}`)
      .setDescription(
        "Complete os desafios abaixo para ganhar XP extra!\nAs missões resetam todos os dias à meia-noite.",
      )
      .setColor("#FFD700")
      .setImage(
        "https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg",
      )
      .setFooter({
        text: 'Clique em "Ver Meu Progresso" para checar seus status.',
        iconURL: guild.iconURL() || undefined,
      });

    activeMissions.forEach((m, index) => {
      let icon = "🎯";
      if (m.type === MissionType.VOICE) icon = "🎙️";
      if (m.type === MissionType.MESSAGE) icon = "💬";
      if (m.type === MissionType.STREAM) icon = "🎥";

      embed.addFields({
        name: `${icon} Missão ${index + 1}: ${m.title}`,
        value: `📝 ${m.description}\n🎁 Recompensa: **${m.rewardXp} XP**`,
      });
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("check_mission_progress")
        .setLabel("📋 Ver Meu Progresso / Resgatar")
        .setStyle(ButtonStyle.Primary),
    );

    const messages = await channel.messages.fetch({ limit: 1 });
    const lastMsg = messages.first();

    if (lastMsg && lastMsg.author.id === this.client.user?.id) {
      await lastMsg.edit({ embeds: [embed], components: [row] });
    } else {
      await channel.send({ embeds: [embed], components: [row] });
    }
  }

  static getActiveMissions(): MissionTemplate[] {
    return MISSION_POOL.filter((m) => this.activeMissions.includes(m.id));
  }

  static async track(userId: string, type: MissionType, amount: number) {
    const active = this.getActiveMissions();

    active.forEach((mission) => {
        if (mission.type === type) {
            const key = `${userId}_${mission.id}`;
            const cached = this.progressCache.get(key) || { amount: 0, lastUpdate: Date.now() };
            
            // Acumula no cache
            cached.amount += amount;
            cached.lastUpdate = Date.now();
            this.progressCache.set(key, cached);
        }
    });

    // Flush Trigger por Tamanho
    if (this.progressCache.size >= this.CACHE_MAX_SIZE) {
        if (!this.isFlushing) this.flushCache();
    }
  }

  private static async flushCache() {
    if (this.progressCache.size === 0) return;
    if (this.isFlushing) return; // Proteção extra

    this.isFlushing = true;
    
    try {
        logger.info(`💾 Flushing Mission Cache (${this.progressCache.size} entries)...`);
        
        const entries = Array.from(this.progressCache.entries());
        this.progressCache.clear(); // Limpa cache para novos acumulados

        // EXECUÇÃO SEQUENCIAL RIGOROSA (1 por vez)
        // Sacrificamos performance por estabilidade total do pool
        for (const [key, data] of entries) {
            const [userId, missionId] = key.split('_');
            
            let saved = false;
            
            // Loop Infinito até salvar (ou erro fatal não relacionado a conexão)
            while (!saved) {
                try {
                    // Usar db.prisma diretamente
                    
                    // 1. Garante User - REMOVIDO para otimização
                    // ...

                    // 2. Busca Progresso Atual
                    const progress = await db.prisma.missionProgress.findUnique({
                        where: { userId_missionId: { userId, missionId } }
                    });

                    if (progress && progress.completed) {
                        saved = true;
                        break; 
                    }

                    const current = progress ? progress.progress : 0;
                    const newAmount = current + data.amount;

                    // 3. Atualiza
                    await db.prisma.missionProgress.upsert({
                        where: { userId_missionId: { userId, missionId } },
                        update: { progress: newAmount },
                        create: { userId, missionId, progress: newAmount }
                    });
                    
                    saved = true; // Sucesso

                } catch (error: any) {
                    // Se for erro de Foreign Key (User not found), tenta criar e retry
                    if (error.code === 'P2003') {
                         try {
                            await db.prisma.user.create({ data: { id: userId } });
                         } catch (e) {} 
                         continue; // Tenta de novo imediatamente
                    }

                    // Se for erro de conexão, espera e tenta de novo (INFINITO)
                    const isConnectionError = 
                        error.code === 'P1001' || 
                        error.code === 'P1002' || 
                        error.code === 'P1017' || 
                        error.message?.includes('Can\'t reach database server');

                    if (isConnectionError) {
                        logger.warn(`⚠️ Database unreachable flushing mission for ${userId}. Retrying in 5s...`);
                        await new Promise(res => setTimeout(res, 5000));
                        // Loop continua...
                    } else {
                        // Erro desconhecido/fatal (ex: schema invalido), loga e pula
                        logger.error(`❌ Fatal error flushing mission for ${userId}: ${error.message}`);
                        saved = true; // Força saída para não travar fila
                    }
                }
            }
            
            // Pausa minúscula entre cada item para não saturar CPU/Rede
            await new Promise(res => setTimeout(res, 50));
        }

        // FORÇAR LIMPEZA DE CONEXÕES OCIOSAS APÓS FLUSH
        // Isso garante que se alguma conexão ficou "presa" no pool, ela seja devolvida/fechada.
        // O $disconnect não é ideal aqui pois fecha o pool todo.
        // O melhor é confiar no idle_timeout=20 que configuramos.
        // Mas podemos logar o sucesso.
        logger.info("✅ Mission Cache Flush Complete");
    } catch (e) {
        logger.error(`Error during flush: ${e}`);
    } finally {
        this.isFlushing = false;
    }
  }

  static async getProgressEmbed(member: GuildMember) {
    const userId = member.id;
    const active = this.getActiveMissions();

    const embed = new EmbedBuilder()
      .setTitle(`📊 Progresso de ${member.user.username}`)
      .setDescription("Acompanhe suas missões diárias em tempo real.")
      .setColor("#0099FF")
      .setTimestamp();

    if (active.length === 0) {
      embed.setDescription("Nenhuma missão ativa no momento.");
      return embed;
    }

    // Fetch all progress for user
    const userProgress = await db.read(async (prisma) =>
      prisma.missionProgress.findMany({
        where: { userId },
      }),
    );

    for (const mission of active) {
      const p = userProgress.find((up) => up.missionId === mission.id);
      const current = p ? p.progress : 0;
      const claimed = p ? p.completed : false; // We use 'completed' flag as 'claimed' in this logic or add a claimed field?
      // Schema has 'completed'. Let's assume completed = claimed for simplicity or check if current >= target AND completed = true.
      // Wait, schema: completed Boolean @default(false).
      // Usually completed means finished requirements. Claimed is separate.
      // But let's map: completed = REWARD CLAIMED.

      const percent = Math.min(current / mission.target, 1);
      const isFinished = current >= mission.target;

      const barSize = 10;
      const filled = Math.floor(barSize * percent);
      const empty = barSize - filled;
      const bar = "`[" + "█".repeat(filled) + "░".repeat(empty) + "]`";
      const percentageText = `${Math.floor(percent * 100)}%`;

      let statusText = `${bar} **${percentageText}**\n${current} / ${mission.target}`;

      if (claimed) {
        statusText = "✅ **CONCLUÍDO & RESGATADO**";
      } else if (isFinished) {
        statusText =
          "🔓 **PRONTO PARA RESGATAR!**\n*Clique em Atualizar para receber*";
      }

      embed.addFields({
        name: `${mission.title}`,
        value: statusText,
        inline: false,
      });
    }

    return embed;
  }

  static async claimRewards(member: GuildMember): Promise<string[]> {
    const userId = member.id;
    const active = this.getActiveMissions();
    const claimedNames: string[] = [];

    // Read Progress
    const userProgress = await db.read(async (prisma) =>
      prisma.missionProgress.findMany({
        where: { userId },
      }),
    );

    for (const mission of active) {
      const p = userProgress.find((up) => up.missionId === mission.id);

      if (p && p.progress >= mission.target && !p.completed) {
        // Claim! (WRITE)
        await db.write(async (prisma) => {
          await prisma.missionProgress.update({
            where: { id: p.id },
            data: { completed: true },
          });
        });

        await XpManager.addXp(member, mission.rewardXp);
        claimedNames.push(`${mission.title} (+${mission.rewardXp} XP)`);
      }
    }

    return claimedNames;
  }
}
