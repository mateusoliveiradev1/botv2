import { EmbedBuilder, Colors, ColorResolvable } from 'discord.js';

export class EmbedFactory {
    private static readonly COLORS = {
        PRIMARY: '#00BFFF' as ColorResolvable, // BlueZone Neon
        SUCCESS: '#00FF00' as ColorResolvable, // Verde Tático
        ERROR: '#FF0000' as ColorResolvable,   // Alerta Vermelho
        WARNING: '#FFA500' as ColorResolvable, // Laranja
        INFO: '#00BFFF' as ColorResolvable,    // Azul Info
        GOLD: '#FFD700' as ColorResolvable     // Dourado (Premium)
    };

    private static readonly FOOTER = {
        text: 'BlueZone Sentinel • v1.0',
        iconURL: 'https://cdn-icons-png.flaticon.com/512/2454/2454282.png' // Ícone padrão se não tiver guild icon
    };

    /**
     * Cria um embed padrão do sistema (Azul)
     */
    static createDefault(title: string, description: string) {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(this.COLORS.PRIMARY)
            .setFooter(this.FOOTER)
            .setTimestamp();
    }

    /**
     * Cria um embed de sucesso (Verde)
     */
    static createSuccess(title: string, description: string) {
        return new EmbedBuilder()
            .setTitle(`✅ ${title}`)
            .setDescription(description)
            .setColor(this.COLORS.SUCCESS)
            .setFooter(this.FOOTER)
            .setTimestamp();
    }

    /**
     * Cria um embed de erro (Vermelho)
     */
    static createError(title: string, description: string) {
        return new EmbedBuilder()
            .setTitle(`🚫 ${title}`)
            .setDescription(description)
            .setColor(this.COLORS.ERROR)
            .setFooter(this.FOOTER)
            .setTimestamp();
    }

    /**
     * Cria um embed de aviso (Laranja)
     */
    static createWarning(title: string, description: string) {
        return new EmbedBuilder()
            .setTitle(`⚠️ ${title}`)
            .setDescription(description)
            .setColor(this.COLORS.WARNING)
            .setFooter(this.FOOTER)
            .setTimestamp();
    }

    /**
     * Cria um embed "Premium" (Dourado) para itens raros ou anúncios especiais
     */
    static createPremium(title: string, description: string) {
        return new EmbedBuilder()
            .setTitle(`💎 ${title}`)
            .setDescription(description)
            .setColor(this.COLORS.GOLD)
            .setFooter(this.FOOTER)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3112/3112946.png') // Ícone de medalha
            .setTimestamp();
    }

    /**
     * Cria um embed estilo "Relatório Militar" (Tabelado/Limpo)
     */
    static createReport(title: string, fields: { name: string, value: string, inline?: boolean }[]) {
        const embed = new EmbedBuilder()
            .setTitle(`📂 RELATÓRIO: ${title}`)
            .setColor(this.COLORS.PRIMARY)
            .setFooter({ text: `Protocolo de Registro • ${new Date().toLocaleTimeString()}` })
            .setTimestamp();

        fields.forEach(f => embed.addFields(f));
        return embed;
    }
}
