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
            // 2. Load Images
            // In production, mapData.image should be a local file path or a high-res URL
            // Since we don't have the files yet, we'll draw a colored background as placeholder if URL fails, 
            // but let's try to load the URL provided in maps.ts (which is currently a placeholder banner)
            const canvas = (0, canvas_1.createCanvas)(1000, 1000); // Standardize size
            const ctx = canvas.getContext('2d');
            // Draw Map Background
            try {
                const mapImage = await (0, canvas_1.loadImage)(mapData.image);
                ctx.drawImage(mapImage, 0, 0, 1000, 1000); // Stretch to fit
            }
            catch (e) {
                // Fallback
                ctx.fillStyle = '#2B2D31';
                ctx.fillRect(0, 0, 1000, 1000);
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '50px Arial';
                ctx.fillText(`MAPA: ${mapName}`, 350, 500);
            }
            // 3. Draw Clan Logo at Location
            try {
                const logo = await (0, canvas_1.loadImage)(clanLogoUrl);
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
            }
            catch (e) {
                logger_1.default.error(e, 'Failed to load clan logo');
            }
            // 4. Return Attachment
            return new discord_js_1.AttachmentBuilder(canvas.toBuffer(), { name: `drop-${mapName}-${locationName}.png` });
        }
        catch (error) {
            logger_1.default.error(error, 'Error generating drop map');
            return null;
        }
    }
}
exports.TacticsManager = TacticsManager;
