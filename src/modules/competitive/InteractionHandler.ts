import { 
    Interaction, 
    ButtonInteraction, 
    ModalSubmitInteraction, 
    StringSelectMenuInteraction, 
    EmbedBuilder,
    StringSelectMenuBuilder,
    ActionRowBuilder
} from "discord.js";
import { TeamManager } from "./TeamManager";
import { WalletManager } from "./WalletManager";
import { PaymentManager } from "./PaymentManager";
import { MatchManager } from "./MatchManager";
import { CompetitiveUI } from "./ui/CompetitiveUI";
import { db } from "../../core/DatabaseManager";
import { EmbedFactory } from "../../utils/EmbedFactory";

export class CompetitiveInteractionHandler {
    
    static async handle(interaction: Interaction) {
        // Handle Select Menus too
        if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isStringSelectMenu()) return;

        const { customId } = interaction;

        try {
            // --- BUTTONS ---
            if (interaction.isButton()) {
                switch (customId) {
                    case "comp_profile":
                        await this.handleProfile(interaction);
                        break;
                    case "comp_teams":
                        await this.handleTeams(interaction);
                        break;
                    case "comp_history":
                        await this.handleHistory(interaction);
                        break;
                    case "comp_create_team_btn":
                        await interaction.showModal(CompetitiveUI.getCreateTeamModal());
                        break;
                    case "comp_refresh_arena":
                        await this.handleRefreshArena(interaction);
                        break;
                    case "comp_join_match":
                        await this.handleJoinMatch(interaction);
                        break;
                    case "comp_modal_deposit_btn":
                        await interaction.showModal(CompetitiveUI.getDepositModal());
                        break;
                    case "comp_withdraw_btn":
                         await interaction.reply({ content: "⚠️ Saques manuais apenas. Contate um admin.", ephemeral: true });
                         break;
                }
            }

            // --- SELECT MENUS ---
            if (interaction.isStringSelectMenu()) {
                if (customId === "comp_select_match") {
                    await this.handleSelectMatch(interaction);
                }
                if (customId === "comp_select_team_for_match") {
                    await this.handleSelectTeamForMatch(interaction);
                }
            }

            // --- MODALS ---
            if (interaction.isModalSubmit()) {
                if (customId === "comp_modal_create_team") {
                    await this.handleCreateTeamSubmit(interaction);
                }
                if (customId === "comp_modal_deposit") {
                    await this.handleDepositSubmit(interaction);
                }
            }

        } catch (error) {
            console.error("Competitive Interaction Error:", error);
            const reply = (error as Error).message;
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: `❌ ${reply}`, ephemeral: true });
            } else {
                await interaction.reply({ content: `❌ ${reply}`, ephemeral: true });
            }
        }
    }

    // --- HANDLERS ---

    private static async handleProfile(i: ButtonInteraction) {
        const wallet = await WalletManager.getWallet(i.user.id);
        const { embeds, components } = CompetitiveUI.getProfilePanel(i.user, wallet);
        await i.reply({ embeds, components, ephemeral: true });
    }

    private static async handleHistory(i: ButtonInteraction) {
        const history = await WalletManager.getHistory(i.user.id);
        const { embeds } = CompetitiveUI.getHistoryPanel(history);
        await i.reply({ embeds, ephemeral: true });
    }

    private static async handleTeams(i: ButtonInteraction) {
        const members = await db.read(async (prisma) => {
            return await prisma.compTeamMember.findMany({
                where: { userId: i.user.id },
                include: { team: true }
            });
        });

        let desc = members.length === 0 ? "Você não está em nenhum time." : "";
        members.forEach(m => {
            const logo = m.team.roleId ? "✅" : "⚠️";
            desc += `• **${m.team.name}** (${m.team.mode}) - ${logo} Cargo\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle("Meus Times")
            .setDescription(desc)
            .setColor("#0099FF")
            .setFooter({ text: "BlueZone Competitive" })
            .setTimestamp();

        const row: any = {
            type: 1,
            components: [
                { type: 2, style: 3, label: "Criar Novo Time", custom_id: "comp_create_team_btn", emoji: "⚔️" }
            ]
        };

        await i.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    private static async handleRefreshArena(i: ButtonInteraction) {
        await i.deferUpdate(); // Acknowledge
        const matches = await db.read(async (prisma) => {
            return await prisma.compMatch.findMany({
                where: { status: "OPEN" },
                include: { entries: true }
            });
        });

        const { embeds, components } = CompetitiveUI.getArenaPanel(matches);
        await i.editReply({ embeds, components });
    }

    private static async handleJoinMatch(i: ButtonInteraction) {
        // 1. Get Open Matches
        const matches = await db.read(async (prisma) => {
            return await prisma.compMatch.findMany({ where: { status: "OPEN" } });
        });

        if (matches.length === 0) {
            throw new Error("Nenhuma partida aberta no momento.");
        }

        // 2. Select Menu for Match
        const options = matches.map(m => ({
            label: `${m.mode} #${m.id.slice(0,4)}`,
            description: `Custo: R$ ${(m.entryCost/100).toFixed(2)} | Vagas: ${m.maxTeams}`,
            value: m.id
        }));

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("comp_select_match")
                .setPlaceholder("Selecione a partida")
                .addOptions(options)
        );

        await i.reply({ content: "Selecione a partida que deseja participar:", components: [row], ephemeral: true });
    }

    private static async handleSelectMatch(i: StringSelectMenuInteraction) {
        const matchId = i.values[0];
        
        // Get Match details to know mode
        const match = await db.read(async (prisma) => {
            return await prisma.compMatch.findUnique({ where: { id: matchId } });
        });

        if (!match) throw new Error("Partida não encontrada.");

        // If SOLO, register directly (create a dummy team or handle user entry)
        // Per plan: SOLO uses "Team of 1".
        // But for MVP, let's ask user to pick a team if SQUAD/DUO.
        
        // Fetch User Teams matching mode
        const members = await db.read(async (prisma) => {
            return await prisma.compTeamMember.findMany({
                where: { 
                    userId: i.user.id,
                    team: { mode: match.mode } 
                },
                include: { team: true }
            });
        });

        if (members.length === 0) {
            // If SOLO, allow creating a team on the fly? Or just error?
            // User needs to create a team first.
            throw new Error(`Você precisa criar um time de ${match.mode} primeiro em "Gerenciar Times".`);
        }

        const options = members.map(m => ({
            label: m.team.name,
            value: m.teamId,
            description: `Capitão: ${m.team.captainId === i.user.id ? "Sim" : "Não"}`
        }));

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("comp_select_team_for_match")
                .setPlaceholder(`Selecione seu time ${match.mode}`)
                .addOptions(options)
        );

        // Store matchId in a way... or just pass it? 
        // Hack: Store matchId in the select menu ID? No.
        // Better: Use a cache or encode matchId in value `matchId_teamId`.
        // Let's re-map options to include matchId
        const optionsWithMatch = options.map(o => ({
            ...o,
            value: `${matchId}|${o.value}`
        }));

        const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("comp_select_team_for_match")
                .setPlaceholder(`Selecione seu time ${match.mode}`)
                .addOptions(optionsWithMatch)
        );

        await i.update({ content: `Partida selecionada: **${match.mode}**. Agora escolha seu time:`, components: [row2] });
    }

    private static async handleSelectTeamForMatch(i: StringSelectMenuInteraction) {
        const [matchId, teamId] = i.values[0].split("|");

        await i.deferUpdate();

        // Check if user is captain? MatchManager checks.
        // Call MatchManager
        await MatchManager.registerEntry(matchId, teamId, i.user.id);

        await i.editReply({ content: `✅ **Inscrição Realizada!**\nSeu time foi inscrito na partida com sucesso. Boa sorte!`, components: [] });
    }

    private static async handleCreateTeamSubmit(i: ModalSubmitInteraction) {
        const name = i.fields.getTextInputValue("team_name");
        const modeRaw = i.fields.getTextInputValue("team_mode").toUpperCase();
        
        if (modeRaw !== "SQUAD" && modeRaw !== "DUO") {
            throw new Error("Modo inválido. Use SQUAD ou DUO.");
        }

        await i.deferReply({ ephemeral: true });

        const team = await TeamManager.createTeam(i.user.id, name, modeRaw as "SQUAD" | "DUO", i.guild!);

        await i.editReply({ 
            content: `✅ Time **${team.name}** criado com sucesso!\nO cargo <@&${team.roleId}> foi atribuído a você.` 
        });
    }

    private static async handleDepositSubmit(i: ModalSubmitInteraction) {
        const amountRaw = i.fields.getTextInputValue("deposit_amount");
        const amount = parseFloat(amountRaw.replace(",", "."));
        
        if (isNaN(amount) || amount < 1) throw new Error("Valor inválido (Mínimo R$ 1,00)");

        await i.deferReply({ ephemeral: true });

        const result = await PaymentManager.createDeposit(i.user.id, Math.round(amount * 100));

        await i.editReply({
            content: `✅ **Pedido de Depósito Criado**\nValor: R$ ${amount.toFixed(2)}\n\nCopie e Cole:\n\`\`\`${result.qrCode}\`\`\``,
        });
    }
}
