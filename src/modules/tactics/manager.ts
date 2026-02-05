import { createCanvas, loadImage, registerFont } from 'canvas';
import { AttachmentBuilder } from 'discord.js';
import { MAPS } from './maps';
import logger from '../../core/logger';
import path from 'path';

export class TacticsManager {
  
  static async generateDropMap(mapName: string, locationName: string, clanLogoUrl: string): Promise<AttachmentBuilder | null> {
    try {
      // 1. Get Map Data
      const mapKey = mapName.toUpperCase() as keyof typeof MAPS;
      const mapData = MAPS[mapKey];
      
      if (!mapData) {
        logger.error(`Map not found: ${mapName}`);
        return null;
      }

      const location = mapData.locations[locationName as keyof typeof mapData.locations];
      if (!location) {
        logger.error(`Location not found: ${locationName} in ${mapName}`);
        return null;
      }

      // 2. Load Images
      // In production, mapData.image should be a local file path or a high-res URL
      // Since we don't have the files yet, we'll draw a colored background as placeholder if URL fails, 
      // but let's try to load the URL provided in maps.ts (which is currently a placeholder banner)
      
      const canvas = createCanvas(1000, 1000); // Standardize size
      const ctx = canvas.getContext('2d');

      // Draw Map Background
      try {
        const mapImage = await loadImage(mapData.image);
        ctx.drawImage(mapImage, 0, 0, 1000, 1000); // Stretch to fit
      } catch (e) {
        // Fallback
        ctx.fillStyle = '#2B2D31';
        ctx.fillRect(0, 0, 1000, 1000);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '50px Arial';
        ctx.fillText(`MAPA: ${mapName}`, 350, 500);
      }

      // 3. Draw Clan Logo at Location
      try {
        const logo = await loadImage(clanLogoUrl);
        const logoSize = 100; // Size of the marker
        const x = location.x - (logoSize / 2); // Center it
        const y = location.y - (logoSize / 2);

        // Draw Shadow/Glow
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 15;
        
        ctx.drawImage(logo, x, y, logoSize, logoSize);
        
        // Reset Shadow
        ctx.shadowBlur = 0;

        // Draw Location Name Label
        ctx.font = 'bold 30px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.textAlign = 'center';
        
        ctx.strokeText(locationName, location.x, location.y + logoSize);
        ctx.fillText(locationName, location.x, location.y + logoSize);

      } catch (e) {
        logger.error(e, 'Failed to load clan logo');
      }

      // 4. Return Attachment
      return new AttachmentBuilder(canvas.toBuffer(), { name: `drop-${mapName}-${locationName}.png` });

    } catch (error) {
      logger.error(error, 'Error generating drop map');
      return null;
    }
  }
}
