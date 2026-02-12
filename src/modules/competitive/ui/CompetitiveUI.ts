import { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} from "discord.js";

export class CompetitiveUI {
    /**
     * 1. HUB PANEL (Profile, Teams, Wallet)
     */
    static getHubPanel() {
        const embed = new EmbedBuilder()
            .setTitle("🛡️ BLUEZONE COMPETITIVE HUB")
            .setDescription("Gerencie sua carreira competitiva, times e carteira aqui.")
            .setColor("#F2A900")
            .addFields(
                { name: "👥 Meus Times", value: "Crie ou gerencie seus times para Duo/Squad.", inline: true },
                { name: "💳 Carteira Digital", value: "Depósitos Pix, Saques e Extrato.", inline: true },
                { name: "📊 Estatísticas", value: "Seu histórico de partidas e ganhos.", inline: true }
            )
            .setImage("https://media.discordapp.net/attachments/1056363060592386109/1179470650577883206/Banner_Competitive.png?ex=6579e563&is=65677063&hm=..."); // Placeholder

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("comp_profile").setLabel("👤 Meu Perfil & Carteira").setStyle(ButtonStyle.Primary).setEmoji("💳"),
            new ButtonBuilder().setCustomId("comp_teams").setLabel("🛡️ Gerenciar Times").setStyle(ButtonStyle.Success).setEmoji("👥"),
            new ButtonBuilder().setCustomId("comp_history").setLabel("📜 Histórico").setStyle(ButtonStyle.Secondary)
        );

        return { embeds: [embed], components: [row] };
    }

    /**
     * 2. ARENA PANEL (Lobby)
     */
    static getArenaPanel(matches: any[]) { // Replace any with proper type later
        const embed = new EmbedBuilder()
            .setTitle("⚔️ ARENA DE BATALHA")
            .setDescription("Inscrições abertas para partidas e campeonatos.")
            .setColor("#FF0000")
            .setFooter({ text: "Clique em 'Inscrever' para participar." });

        if (matches.length === 0) {
            embed.addFields({ name: "🚫 Nenhuma partida aberta", value: "Fique atento aos anúncios!" });
        } else {
            matches.forEach(m => {
                const type = m.mode;
                const cost = m.entryCost > 0 ? `R$ ${(m.entryCost/100).toFixed(2)}` : "GRÁTIS";
                const pool = `R$ ${(m.prizePool/100).toFixed(2)}`;
                const slots = `${m.entries.length}/${m.maxTeams}`;
                
                embed.addFields({
                    name: `🟢 [${m.id.slice(0,4)}] ${type} (${cost})`,
                    value: `🏆 Prêmio: **${pool}**\n👥 Vagas: **${slots}**\n🕒 Status: ${m.status}`
                });
            });
        }

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("comp_join_match").setLabel("🏆 Inscrever Time/Solo").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("comp_refresh_arena").setLabel("🔄 Atualizar").setStyle(ButtonStyle.Secondary)
        );

        return { embeds: [embed], components: [row] };
    }

    /**
     * MODALS
     */
    static getCreateTeamModal() {
        const modal = new ModalBuilder().setCustomId("comp_modal_create_team").setTitle("Criar Novo Time");
        const nameInput = new TextInputBuilder()
            .setCustomId("team_name")
            .setLabel("Nome do Time")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Ex: Team Liquid")
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(30);
        
        const modeInput = new TextInputBuilder()
            .setCustomId("team_mode")
            .setLabel("Modo (SQUAD ou DUO)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("SQUAD")
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(modeInput)
        );
        return modal;
    }

    static getDepositModal() {
        const modal = new ModalBuilder().setCustomId("comp_modal_deposit").setTitle("Depositar via Pix");
        const amountInput = new TextInputBuilder()
            .setCustomId("deposit_amount")
            .setLabel("Valor (R$)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("10.00")
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput));
        return modal;
    }
}
