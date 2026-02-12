import { 
    Interaction, 
    ButtonInteraction, 
    ModalSubmitInteraction, 
    StringSelectMenuInteraction, 
    EmbedBuilder,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
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
                // Team Management Actions (with ID params)
                if (customId.startsWith("comp_manage_team:")) {
                    const teamId = customId.split(":")[1];
                    await this.handleManageTeam(interaction, teamId);
                    return;
                }
                if (customId.startsWith("comp_invite_member:")) {
                    const teamId = customId.split(":")[1];
                    await interaction.showModal(CompetitiveUI.getInviteMemberModal(teamId));
                    return;
                }
                if (customId.startsWith("comp_set_logo:")) {
                    const teamId = customId.split(":")[1];
                    await interaction.showModal(CompetitiveUI.getLogoModal(teamId));
                    return;
                }
                if (customId.startsWith("comp_delete_team:")) {
                    const teamId = customId.split(":")[1];
                    await this.handleDeleteTeam(interaction, teamId);
                    return;
                }

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
                if (customId === "comp_select_team_manage") {
                    await this.handleManageTeam(interaction, interaction.values[0]);
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
                if (customId.startsWith("comp_modal_invite:")) {
                    const teamId = customId.split(":")[1];
                    await this.handleInviteSubmit(interaction, teamId);
                }
                if (customId.startsWith("comp_modal_logo:")) {
                    const teamId = customId.split(":")[1];
                    await this.handleLogoSubmit(interaction, teamId);
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

    private static async handleTeams(i: ButtonInteraction) {
        const members = await db.read(async (prisma) => {
            return await prisma.compTeamMember.findMany({
                where: { userId: i.user.id },
                include: { team: true }
            });
        });

        let desc = members.length === 0 ? "Você não está em nenhum time." : "";
        const options = members.map(m => ({
            label: m.team.name,
            value: m.teamId,
            description: `${m.team.mode} - ${m.team.roleId ? '✅ Ativo' : '⚠️ Pendente'}`,
            emoji: m.team.mode === "SQUAD" ? "🛡️" : "⚔️"
        }));

        const embed = new EmbedBuilder()
            .setTitle("Meus Times")
            .setDescription("Selecione um time abaixo para gerenciar (convidar, editar, sair) ou crie um novo.")
            .setColor("#0099FF")
            .setFooter({ text: "BlueZone Competitive" })
            .setTimestamp();

        const components: any[] = [];

        if (options.length > 0) {
            components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("comp_select_team_manage")
                    .setPlaceholder("Selecione um time para gerenciar")
                    .addOptions(options)
            ));
        }

        components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("comp_create_team_btn").setLabel("Criar Novo Time").setStyle(ButtonStyle.Success).setEmoji("⚔️")
        ));

        await i.reply({ embeds: [embed], components, ephemeral: true });
    }

    private static async handleManageTeam(i: Interaction, teamId: string) {
        const team = await db.read(async (prisma) => {
            return await prisma.compTeam.findUnique({
                where: { id: teamId },
                include: { members: true }
            });
        });

        if (!team) throw new Error("Time não encontrado.");

        // Check ownership
        const isCaptain = team.captainId === i.user.id;
        if (!isCaptain) throw new Error("Apenas o capitão pode gerenciar o time.");

        const { embeds, components } = CompetitiveUI.getTeamManagementPanel(team);
        
        if (i.isButton() || i.isStringSelectMenu()) {
            await i.update({ embeds, components });
        } else {
            // Fallback
            if (i.isRepliable()) await i.reply({ embeds, components, ephemeral: true });
        }
    }

    private static async handleInviteSubmit(i: ModalSubmitInteraction, teamId: string) {
        const targetId = i.fields.getTextInputValue("invite_user_id");
        
        await i.deferReply({ ephemeral: true });

        // Validate user exists in guild
        try {
            await i.guild?.members.fetch(targetId);
        } catch {
            throw new Error("Usuário não encontrado no servidor.");
        }

        await TeamManager.addMember(teamId, targetId, i.guild!);
        await i.editReply(`✅ Usuário <@${targetId}> adicionado ao time com sucesso!`);
    }

    private static async handleLogoSubmit(i: ModalSubmitInteraction, teamId: string) {
        const url = i.fields.getTextInputValue("logo_url");
        
        // Basic URL validation
        if (!url.match(/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i)) {
            throw new Error("URL inválida. Deve ser um link direto de imagem (jpg, png, etc).");
        }

        await i.deferReply({ ephemeral: true });
        await TeamManager.updateLogo(teamId, url, i.guild!);
        await i.editReply("✅ Logo atualizada com sucesso! (Pode levar alguns minutos para atualizar no Discord)");
    }

    private static async handleDeleteTeam(i: ButtonInteraction, teamId: string) {
        await i.deferReply({ ephemeral: true });
        await TeamManager.deleteTeam(teamId, i.guild!);
        await i.editReply("✅ Time excluído e cargo removido.");
    }

    // ... [Rest of existing methods: handleProfile, handleHistory, handleRefreshArena, handleJoinMatch, etc]
    
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
            throw new Error(`Você precisa criar um time de ${match.mode} primeiro em "Gerenciar Times".`);
        }

        const options = members.map(m => ({
            label: m.team.name,
            value: m.teamId,
            description: `Capitão: ${m.team.captainId === i.user.id ? "Sim" : "Não"}`
        }));

        // Store matchId in a way... or just pass it? 
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
