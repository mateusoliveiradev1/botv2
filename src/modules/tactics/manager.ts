import { createCanvas, loadImage, registerFont } from 'canvas';
import { AttachmentBuilder } from 'discord.js';
import { MAPS } from './maps';
import logger from '../../core/logger';
import path from 'path';

export class TacticsManager {
  
  // Helper to load image with timeout
  private static async loadImageWithTimeout(url: string, timeout = 5000): Promise<any> {
    return Promise.race([
        loadImage(url),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Image load timeout')), timeout))
    ]);
  }

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

      // 2. Setup Canvas
      const canvas = createCanvas(1000, 1000); // Standardize size
      const ctx = canvas.getContext('2d');

      // 3. Load Map Image (with robust fallback)
      try {
        logger.info(`Loading map image: ${mapData.image}`);
        const mapImage = await this.loadImageWithTimeout(mapData.image, 8000); // 8s timeout for big maps
        ctx.drawImage(mapImage, 0, 0, 1000, 1000); 
      } catch (e) {
        logger.error(e, `Failed to load map image for ${mapName}. Using fallback.`);
        // Fallback Gradient Background
        const grd = ctx.createLinearGradient(0, 0, 1000, 1000);
        grd.addColorStop(0, "#202225");
        grd.addColorStop(1, "#2f3136");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 1000, 1000);
        
        // Map Name Text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(mapName.toUpperCase(), 500, 500);
        ctx.font = '30px Arial';
        ctx.fillText('(Imagem do mapa indisponível)', 500, 550);
      }

      // 4. Draw Clan Logo at Location
      try {
        logger.info(`Loading clan logo: ${clanLogoUrl}`);
        // Use a default icon if clanLogoUrl is suspiciously long or fails (CDN issues)
        // But try to load first
        const logo = await this.loadImageWithTimeout(clanLogoUrl, 5000);
        
        const logoSize = 120; // Slightly bigger
        const x = location.x - (logoSize / 2);
        const y = location.y - (logoSize / 2);

        // Draw Glow
        ctx.save();
        ctx.shadowColor = '#FFD700'; // Gold glow
        ctx.shadowBlur = 20;
        ctx.drawImage(logo, x, y, logoSize, logoSize);
        ctx.restore();
        
      } catch (e) {
        logger.error(e, 'Failed to load clan logo. Drawing fallback marker.');
        // Fallback Marker (Red Circle)
        const x = location.x;
        const y = location.y;
        
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'white';
        ctx.stroke();
      }

      // 5. Draw Location Name Label
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 10;
      ctx.font = 'bold 40px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 6;
      ctx.textAlign = 'center';
      
      const labelY = location.y + 80; // Below logo
      ctx.strokeText(locationName, location.x, labelY);
      ctx.fillText(locationName, location.x, labelY);

      // 6. Return Attachment with SANITIZED name
      // Spaces in filename cause Discord embed errors
      const sanitizedLocation = locationName.replace(/ /g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const filename = `drop-${mapName}-${sanitizedLocation}.png`;
      
      return new AttachmentBuilder(canvas.toBuffer(), { name: filename });

    } catch (error) {
      logger.error(error, 'Error generating drop map');
      return null;
    }
  }
}
