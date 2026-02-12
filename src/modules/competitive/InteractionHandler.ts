import { Interaction, ButtonInteraction, ModalSubmitInteraction, CacheType, StringSelectMenuInteraction, EmbedBuilder } from "discord.js";
import { TeamManager } from "./TeamManager";
import { WalletManager } from "./WalletManager";
import { PaymentManager } from "./PaymentManager";
import { CompetitiveUI } from "./ui/CompetitiveUI";
import { db } from "../../core/DatabaseManager";
import { EmbedFactory } from "../../utils/EmbedFactory";

export class CompetitiveInteractionHandler {
    
    static async handle(interaction: Interaction) {
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
                        await this.handleTeams(interaction); // Show list of teams + Create Button
                        break;
                    case "comp_create_team_btn": // Inside Team Panel
                        await interaction.showModal(CompetitiveUI.getCreateTeamModal());
                        break;
                    case "comp_refresh_arena":
                        // Re-render Arena
                        break;
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
        const history = await WalletManager.getHistory(i.user.id);

        const embed = new EmbedBuilder()
            .setTitle(`Carteira de ${i.user.username}`)
            .setDescription(`**Saldo Atual:** R$ ${(wallet.credits/100).toFixed(2)}\n**Ganhos:** R$ ${(wallet.winnings/100).toFixed(2)}`)
            .setColor("#00FF00")
            .setFooter({ text: "BlueZone Competitive" })
            .setTimestamp();

        // Add Deposit/Withdraw Buttons here...
        // For MVP, just showing balance.
        await i.reply({ embeds: [embed], ephemeral: true });
    }

    private static async handleTeams(i: ButtonInteraction) {
        // Fetch User Teams
        const members = await db.read(async (prisma) => {
            return await prisma.compTeamMember.findMany({
                where: { userId: i.user.id },
                include: { team: true }
            });
        });

        let desc = members.length === 0 ? "Você não está em nenhum time." : "";
        members.forEach(m => {
            desc += `• **${m.team.name}** (${m.team.mode}) - ${m.team.roleId ? '✅ Cargo Ativo' : '⚠️ Sem Cargo'}\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle("Meus Times")
            .setDescription(desc)
            .setColor("#0099FF")
            .setFooter({ text: "BlueZone Competitive" })
            .setTimestamp();

        // Add Create Button
        const row: any = {
            type: 1,
            components: [
                { type: 2, style: 3, label: "Criar Novo Time", custom_id: "comp_create_team_btn", emoji: "⚔️" }
            ]
        };

        await i.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    private static async handleCreateTeamSubmit(i: ModalSubmitInteraction) {
        const name = i.fields.getTextInputValue("team_name");
        const modeRaw = i.fields.getTextInputValue("team_mode").toUpperCase();
        
        if (modeRaw !== "SQUAD" && modeRaw !== "DUO") {
            throw new Error("Modo inválido. Use SQUAD ou DUO.");
        }

        await i.deferReply({ ephemeral: true });

        const team = await TeamManager.createTeam(i.user.id, name, modeRaw, i.guild!);

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

        // Send QR Code
        // Ideally send image buffer, but URL for now
        await i.editReply({
            content: `✅ **Pedido de Depósito Criado**\nValor: R$ ${amount.toFixed(2)}\n\nCopie e Cole:\n\`\`\`${result.qrCode}\`\`\``,
            // files: [result.qrCodeImage] // If OpenPix returns direct image URL
        });
    }
}
