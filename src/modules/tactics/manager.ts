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

  // Helper to wrap text
  private static wrapText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';

    for(let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      }
      else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
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

      // 5. Draw Info Panel (Overlay)
      const panelHeight = 250;
      const panelY = 1000 - panelHeight;

      // Semi-transparent background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(0, panelY, 1000, panelHeight);

      // Top Border Color based on Danger
      let dangerColor = '#FFFFFF';
      if (location.danger.includes('EXTREMO') || location.danger.includes('SUICÍDIO')) dangerColor = '#FF0000'; // Red
      else if (location.danger.includes('ALTO')) dangerColor = '#FFA500'; // Orange
      else if (location.danger.includes('MÉDIO')) dangerColor = '#FFFF00'; // Yellow
      else dangerColor = '#00FF00'; // Green

      ctx.fillStyle = dangerColor;
      ctx.fillRect(0, panelY, 1000, 10); // 10px strip

      // Draw Stats
      ctx.font = 'bold 30px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      
      const startX = 50;
      const startY = panelY + 60;
      const lineHeight = 45;

      // Column 1: Stats
      ctx.fillText(`📍 Local: ${locationName}`, startX, startY);
      ctx.fillText(`💰 Loot: ${location.loot}`, startX, startY + lineHeight);
      ctx.fillText(`🚗 Veículos: ${location.vehicles}`, startX, startY + (lineHeight * 2));
      
      // Danger with Color
      ctx.fillStyle = dangerColor;
      ctx.fillText(`🔥 Perigo: ${location.danger}`, startX, startY + (lineHeight * 3));

      // Column 2: Coach Tip (Wrapped)
      ctx.fillStyle = '#CCCCCC';
      ctx.font = 'italic 28px Arial';
      const tipX = 500;
      const tipY = startY;
      const maxWidth = 450;
      
      this.wrapText(ctx, `💡 Dica do Coach: "${location.tips}"`, tipX, tipY, maxWidth, 35);

      // 6. Draw Rotation Arrows (Dashed lines to center)
      // Simple visual flair: Arrow from Drop point towards map center (500,500)
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([20, 15]);
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#FFFFFF';
      ctx.moveTo(location.x, location.y);
      ctx.lineTo(500, 500); // Center of map
      ctx.stroke();
      
      // Draw Arrowhead at center
      // ... (Skipping complex arrowhead for now, just the line implies direction)
      ctx.restore();

      // 7. Return Attachment
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
