"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TacticsManager = void 0;
const canvas_1 = require("canvas");
const discord_js_1 = require("discord.js");
const maps_1 = require("./maps");
const logger_1 = __importDefault(require("../../core/logger"));
class TacticsManager {
    // Helper to load image with timeout
    static async loadImageWithTimeout(url, timeout = 5000) {
        return Promise.race([
            (0, canvas_1.loadImage)(url),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Image load timeout')), timeout))
        ]);
    }
    static async generateDropMap(mapName, locationName, clanLogoUrl) {
        try {
            // 1. Get Map Data
            const mapKey = mapName.toUpperCase();
            const mapData = maps_1.MAPS[mapKey];
            if (!mapData) {
                logger_1.default.error(`Map not found: ${mapName}`);
                return null;
            }
            const location = mapData.locations[locationName];
            if (!location) {
                logger_1.default.error(`Location not found: ${locationName} in ${mapName}`);
                return null;
            }
            // 2. Setup Canvas
            const canvas = (0, canvas_1.createCanvas)(1000, 1000); // Standardize size
            const ctx = canvas.getContext('2d');
            // 3. Load Map Image (with robust fallback)
            try {
                logger_1.default.info(`Loading map image: ${mapData.image}`);
                const mapImage = await this.loadImageWithTimeout(mapData.image, 8000); // 8s timeout for big maps
                ctx.drawImage(mapImage, 0, 0, 1000, 1000);
            }
            catch (e) {
                logger_1.default.error(e, `Failed to load map image for ${mapName}. Using fallback.`);
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
                logger_1.default.info(`Loading clan logo: ${clanLogoUrl}`);
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
            }
            catch (e) {
                logger_1.default.error(e, 'Failed to load clan logo. Drawing fallback marker.');
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
            return new discord_js_1.AttachmentBuilder(canvas.toBuffer(), { name: filename });
        }
        catch (error) {
            logger_1.default.error(error, 'Error generating drop map');
            return null;
        }
    }
}
exports.TacticsManager = TacticsManager;
