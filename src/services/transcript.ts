import { TextChannel, AttachmentBuilder } from 'discord.js';

export class TranscriptService {
  static async generate(channel: TextChannel): Promise<AttachmentBuilder> {
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

    return new AttachmentBuilder(Buffer.from(content, 'utf-8'), { name: `transcript-${channel.name}.txt` });
  }
}
