"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptService = void 0;
const discord_js_1 = require("discord.js");
class TranscriptService {
    static async generate(channel) {
        const messages = await channel.messages.fetch({ limit: 100 });
        const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        let content = `TRANSCRIPT: ${channel.name}\n`;
        content += `GENERATED: ${new Date().toLocaleString()}\n`;
        content += `SERVER: ${channel.guild.name}\n`;
        content += '----------------------------------------\n\n';
        sorted.forEach(msg => {
            const time = msg.createdAt.toLocaleString();
            const author = msg.author.tag;
            const text = msg.content || '[No Text Content]';
            const attachments = msg.attachments.size > 0 ? ` [${msg.attachments.size} Attachment(s)]` : '';
            content += `[${time}] ${author}: ${text}${attachments}\n`;
        });
        content += '\n----------------------------------------\n';
        content += 'END OF TRANSCRIPT';
        return new discord_js_1.AttachmentBuilder(Buffer.from(content, 'utf-8'), { name: `transcript-${channel.name}.txt` });
    }
}
exports.TranscriptService = TranscriptService;
