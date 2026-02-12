import { 
    CommandInteraction, 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    TextChannel
} from "discord.js";
import { CompetitiveUI } from "../../modules/competitive/ui/CompetitiveUI";
import { db } from "../../core/DatabaseManager";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setup-competitivo")
        .setDescription("Instala os painéis competitivos no canal atual.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName("tipo")
                .setDescription("Qual painel instalar?")
                .setRequired(true)
                .addChoices(
                    { name: "Hub (Perfil & Times)", value: "HUB" },
                    { name: "Arena (Lobby Partidas)", value: "ARENA" }
                )
        ),

    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        const type = interaction.options.getString("tipo");
        const channel = interaction.channel as TextChannel;

        await interaction.deferReply({ ephemeral: true });

        try {
            if (type === "HUB") {
                const { embeds, components } = CompetitiveUI.getHubPanel();
                await channel.send({ embeds, components });
                await interaction.editReply("✅ Painel **HUB** instalado com sucesso!");
            } else if (type === "ARENA") {
                // Fetch active matches
                const matches = await db.read(async (prisma) => {
                    return await prisma.compMatch.findMany({
                        where: { status: "OPEN" },
                        include: { entries: true }
                    });
                });

                const { embeds, components } = CompetitiveUI.getArenaPanel(matches);
                await channel.send({ embeds, components });
                await interaction.editReply("✅ Painel **ARENA** instalado com sucesso!");
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply("❌ Erro ao instalar painel.");
        }
    }
};
