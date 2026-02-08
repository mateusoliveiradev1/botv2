import { Client } from 'discord.js';
import logger from '../../core/logger';
import { BackupManager } from './manager';

export class BackupScheduler {
  private static interval: NodeJS.Timeout;
  private static lastRunKey: string = '';

  static init(client: Client) {
    logger.info('⏰ Starting Backup Scheduler (12h Cycle)...');
    
    // Check every minute
    this.interval = setInterval(() => {
      this.checkTime(client);
    }, 60 * 1000);
  }

  private static checkTime(client: Client) {
    const now = new Date();
    const hour = now.getHours();
    
    // Run at 00:xx and 12:xx (First minute detection logic handled by key)
    if (hour === 0 || hour === 12) {
      const key = `${now.getDate()}-${hour}`; // e.g., "7-12"
      
      if (this.lastRunKey !== key) {
        this.lastRunKey = key;
        logger.info(`⏰ Triggering Scheduled Backup for Hour ${hour}:00`);
        
        client.guilds.cache.forEach(guild => {
            BackupManager.runBackup(guild, 'AUTO');
        });
      }
    }
  }
}
