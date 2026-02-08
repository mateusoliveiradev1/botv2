import {
  Guild,
  TextChannel,
  AttachmentBuilder,
  ChannelType,
  OverwriteType,
} from "discord.js";
import prisma from "../../core/prisma";
import logger from "../../core/logger";
import { BackupData } from "./types";

export class BackupManager {
  static async runBackup(guild: Guild, type: "AUTO" | "MANUAL" = "AUTO") {
    logger.info(`[Backup] Starting ${type} backup for ${guild.name}...`);

    try {
      // 1. Generate Snapshot
      const data = await this.generateSnapshot(guild);
      const json = JSON.stringify(data, null, 2);
      const buffer = Buffer.from(json, "utf-8");
      const sizeKB = (buffer.length / 1024).toFixed(2);

      // 2. Save to Database (Fail-Safe)
      let dbStatus = "✅ Database";
      try {
        if (prisma.serverBackup) {
          await prisma.serverBackup.create({
            data: {
              guildId: guild.id,
              type,
              data: data as any, // Prisma Json type (Postgres)
              size: buffer.length,
            },
          });

          // Retention Policy: Keep last 5
          const backups = await prisma.serverBackup.findMany({
            where: { guildId: guild.id },
            orderBy: { createdAt: "desc" },
          });

          if (backups.length > 5) {
            const toDelete = backups.slice(5);
            await prisma.serverBackup.deleteMany({
              where: { id: { in: toDelete.map((b) => b.id) } },
            });
          }
        } else {
          dbStatus = "⚠️ DB Table Missing";
        }
      } catch (dbError) {
        logger.error(
          dbError,
          "[Backup] Database save failed (Fail-Safe Triggered)",
        );
        dbStatus = "❌ Database (Ignored)";
      }

      // 3. Send to Vault Channel
      let vaultStatus = "✅ Vault";
      const vaultChannel = guild.channels.cache.find(
        (c) => c.name === "🔒-backup-vault",
      ) as TextChannel;

      if (vaultChannel) {
        const attachment = new AttachmentBuilder(buffer, {
          name: `backup-${Date.now()}.json`,
        });
        await vaultChannel.send({
          content: `📦 **Backup Automático**\n📅 Data: <t:${Math.floor(Date.now() / 1000)}:F>\n💾 Tamanho: ${sizeKB} KB\n🛡️ Tipo: ${type}`,
          files: [attachment],
        });
      } else {
        vaultStatus = "❌ Vault (Channel Not Found)";
        logger.warn("[Backup] Vault channel not found");
      }

      // 4. Log to Audit (Black Box)
      const logChannel = guild.channels.cache.find(
        (c) => c.name === "🛡️-caixa-preta",
      ) as TextChannel;
      if (logChannel) {
        await logChannel.send(
          `🛡️ **SYSTEM BACKUP:** Processo finalizado.\n> Status: ${dbStatus} | ${vaultStatus}\n> Tamanho: ${sizeKB} KB`,
        );
      }

      // 5. Audit Log DB
      try {
        await prisma.auditLog.create({
          data: {
            guildId: guild.id,
            type: "SYSTEM_BACKUP",
            title: "Backup Realizado",
            description: `Status: ${dbStatus} | ${vaultStatus}`,
            executorId: "SYSTEM",
          },
        });
      } catch (e) {
          // Ignore audit log error
      }

      logger.info("[Backup] Completed successfully.");
    } catch (error) {
      logger.error(error, "[Backup] Critical Failure");
    }
  }

  private static async generateSnapshot(guild: Guild): Promise<BackupData> {
    await guild.roles.fetch();
    await guild.channels.fetch();

    const roles = guild.roles.cache.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      position: r.position,
      permissions: r.permissions.bitfield.toString(),
    }));

    const channels = guild.channels.cache
      .filter((c) => !c.isThread()) // Ignore Threads
      .map((c) => {
        // Safe overwrite mapping
        // Cast to any to avoid complex type checks for now, knowing non-threads usually have overwrites
        // Or check if permissionOverwrites exists
        const overwrites =
          "permissionOverwrites" in c
            ? (c as any).permissionOverwrites.cache.map((o: any) => ({
                id: o.id,
                type: o.type === OverwriteType.Role ? 0 : 1,
                allow: o.allow.bitfield.toString(),
                deny: o.deny.bitfield.toString(),
              }))
            : [];

        return {
          id: c.id,
          name: c.name,
          type: c.type,
          parentId: c.parentId,
          position: "position" in c ? (c as any).position : 0,
          topic: (c as TextChannel).topic || null,
          permissionOverwrites: overwrites,
        };
      });

    return {
      timestamp: new Date().toISOString(),
      guild: {
        name: guild.name,
        id: guild.id,
        icon: guild.iconURL(),
      },
      roles,
      channels,
    };
  }
}
