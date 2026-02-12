import { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    User
} from "discord.js";

export class CompetitiveUI {
    /**
     * 1. HUB PANEL (Profile, Teams, Wallet)
     */
    static getHubPanel() {
        const embed = new EmbedBuilder()
            .setTitle("🛡️ BLUEZONE COMPETITIVE HUB")
            .setDescription("Gerencie sua carreira competitiva, times e carteira aqui.\n\n**Recursos Disponíveis:**")
            .setColor("#F2A900")
            .setThumbnail("https://cdn-icons-png.flaticon.com/512/3112/3112946.png")
            .addFields(
                { name: "👥 Meus Times", value: "Crie ou gerencie seus times para Duo/Squad.", inline: true },
                { name: "💳 Carteira Digital", value: "Depósitos Pix, Saques e Extrato.", inline: true },
                { name: "📊 Estatísticas", value: "Seu histórico de partidas e ganhos.", inline: true }
            )
            .setImage("https://media.discordapp.net/attachments/1056363060592386109/1179470650577883206/Banner_Competitive.png?ex=6579e563&is=65677063&hm=...") // Keep placeholder or update if user provides
            .setFooter({ text: "Sistema de Competição BlueZone v2.0" });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("comp_profile").setLabel("Meu Perfil & Carteira").setStyle(ButtonStyle.Primary).setEmoji("💳"),
            new ButtonBuilder().setCustomId("comp_teams").setLabel("Gerenciar Times").setStyle(ButtonStyle.Success).setEmoji("👥"),
            new ButtonBuilder().setCustomId("comp_history").setLabel("Histórico").setStyle(ButtonStyle.Secondary).setEmoji("📜")
        );

        return { embeds: [embed], components: [row] };
    }

    /**
     * 2. ARENA PANEL (Lobby)
     */
    static getArenaPanel(matches: any[]) { 
        const embed = new EmbedBuilder()
            .setTitle("⚔️ ARENA DE BATALHA")
            .setDescription("Inscrições abertas para partidas e campeonatos.\nEscolha uma partida abaixo para participar.")
            .setColor("#FF0000")
            .setThumbnail("https://cdn-icons-png.flaticon.com/512/2314/2314523.png")
            .setFooter({ text: "Clique em 'Atualizar' para ver novos status." });

        if (matches.length === 0) {
            embed.addFields({ name: "🚫 Nenhuma partida aberta", value: "Fique atento aos anúncios no canal de novidades!" });
        } else {
            matches.forEach(m => {
                const type = m.mode;
                const cost = m.entryCost > 0 ? `R$ ${(m.entryCost/100).toFixed(2)}` : "GRÁTIS";
                const pool = `R$ ${(m.prizePool/100).toFixed(2)}`;
                const slots = `${m.entries.length}/${m.maxTeams}`;
                const statusEmoji = m.status === "OPEN" ? "🟢" : "🔴";
                
                embed.addFields({
                    name: `${statusEmoji} [${m.id.slice(0,4)}] ${type} | ${cost}`,
                    value: `>>> 🏆 Prêmio: **${pool}**\n👥 Vagas: **${slots}**\n🕒 Status: ${m.status}`
                });
            });
        }

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("comp_join_match").setLabel("Inscrever Time/Solo").setStyle(ButtonStyle.Danger).setEmoji("🏆").setDisabled(matches.length === 0),
            new ButtonBuilder().setCustomId("comp_refresh_arena").setLabel("Atualizar").setStyle(ButtonStyle.Secondary).setEmoji("🔄")
        );

        return { embeds: [embed], components: [row] };
    }

    /**
     * 3. PROFILE PANEL (Ephemeral)
     */
    static getProfilePanel(user: User, wallet: any) {
        const embed = new EmbedBuilder()
            .setTitle(`👤 Perfil de ${user.username}`)
            .setColor("#00FF00")
            .setThumbnail(user.displayAvatarURL())
            .setDescription("Resumo financeiro e estatístico.")
            .addFields(
                { name: "💰 Saldo (Créditos)", value: `\`R$ ${(wallet.credits/100).toFixed(2)}\``, inline: true },
                { name: "🏆 Ganhos (Prêmios)", value: `\`R$ ${(wallet.winnings/100).toFixed(2)}\``, inline: true },
                { name: "📅 Registrado em", value: `<t:${Math.floor(wallet.updatedAt.getTime()/1000)}:R>`, inline: false }
            )
            .setFooter({ text: "Use os botões abaixo para movimentar sua conta." });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("comp_modal_deposit_btn").setLabel("Depositar (Pix)").setStyle(ButtonStyle.Success).setEmoji("💸"),
            new ButtonBuilder().setCustomId("comp_withdraw_btn").setLabel("Sacar").setStyle(ButtonStyle.Danger).setEmoji("🏦").setDisabled(true) // Disabled for MVP
        );

        return { embeds: [embed], components: [row] };
    }

    /**
     * 4. HISTORY PANEL (Ephemeral)
     */
    static getHistoryPanel(history: any[]) {
        const embed = new EmbedBuilder()
            .setTitle("📜 Histórico de Transações")
            .setColor("#CCCCCC")
            .setFooter({ text: "Últimas 10 movimentações" });

        if (history.length === 0) {
            embed.setDescription("Nenhuma movimentação encontrada.");
        } else {
            const lines = history.map(h => {
                const icon = h.amount > 0 ? "📈" : "📉";
                const amount = `R$ ${(Math.abs(h.amount)/100).toFixed(2)}`;
                return `${icon} **${h.type}**: ${amount} - *${h.description}* (<t:${Math.floor(h.createdAt.getTime()/1000)}:d>)`;
            });
            embed.setDescription(lines.join("\n"));
        }

        return { embeds: [embed] };
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
