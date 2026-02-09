import {
    ButtonInteraction,
    StringSelectMenuInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    ButtonStyle,
    GuildMember,
    TextChannel,
    MessageFlags
} from 'discord.js';
import { EconomyManager } from './EconomyManager';
import { SHOP_ITEMS, SHOP_CATEGORIES, ShopItem } from './constants';
import { XpManager } from '../xp/manager';
import logger from '../../core/logger';
import { db } from '../../core/DatabaseManager';

export class ShopManager {

    /**
     * Sends the main shop panel to a channel
     */
    static async sendPanel(channel: TextChannel) {
        // Clear old messages
        try {
            await channel.bulkDelete(5);
        } catch (e) {}

        const embed = new EmbedBuilder()
            .setTitle('🏦 BLUEZONE MARKETPLACE')
            .setDescription(
                "Bem-vindo ao posto de trocas, **Sobrevivente**.\n" +
                "Utilize seus **Blue Coins (BC)** para adquirir vantagens táticas e títulos de prestígio.\n\n" +
                "📡 **STATUS**: `🟢 SISTEMA ONLINE`\n" +
                "💼 **ECONOMIA**: `ESTÁVEL`\n\n" +
                "*Clique nos botões abaixo para interagir.*"
            )
            .setColor('#00BFFF')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/2454/2454282.png')
            .setImage('https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg') // Placeholder
            .setFooter({ text: 'Sistema Econômico Seguro v1.0 • BlueZone Sentinel' });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('shop_open_market')
                .setLabel('ABRIR MERCADO')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🛒'),
            new ButtonBuilder()
                .setCustomId('shop_balance')
                .setLabel('MINHA CARTEIRA')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('💳'),
            new ButtonBuilder()
                .setCustomId('shop_daily')
                .setLabel('RESGATAR DAILY')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎁')
        );

        await channel.send({ embeds: [embed], components: [row] });
    }

    /**
     * Main Interaction Handler
     */
    static async handleInteraction(interaction: ButtonInteraction | StringSelectMenuInteraction) {
        if (!interaction.customId.startsWith('shop_')) return;

        const { customId } = interaction;

        // 1. Open Market (Send Category Select)
        if (customId === 'shop_open_market') {
            await this.sendCategoryMenu(interaction);
            return;
        }

        // 2. Check Balance
        if (customId === 'shop_balance') {
            await this.showBalance(interaction);
            return;
        }

        // 3. Claim Daily
        if (customId === 'shop_daily') {
            await this.handleDaily(interaction);
            return;
        }

        // 4. Category Selected -> Show Items
        if (customId === 'shop_cat_select' && interaction.isStringSelectMenu()) {
            await this.sendItemMenu(interaction);
            return;
        }

        // 5. Item Selected -> Show Confirmation
        if (customId === 'shop_item_select' && interaction.isStringSelectMenu()) {
            await this.showConfirmation(interaction);
            return;
        }

        // 6. Confirm Buy
        if (customId.startsWith('shop_confirm_buy_')) {
            await this.processPurchase(interaction);
            return;
        }

        // 7. Cancel Buy
        if (customId === 'shop_cancel') {
            await interaction.update({ content: '❌ Operação cancelada.', embeds: [], components: [] });
            return;
        }
    }

    private static async sendCategoryMenu(interaction: any) {
        const select = new StringSelectMenuBuilder()
            .setCustomId('shop_cat_select')
            .setPlaceholder('📂 Selecione uma Categoria')
            .addOptions(
                Object.values(SHOP_CATEGORIES).map(cat => ({
                    label: cat.label,
                    value: cat.value,
                    description: cat.description,
                    emoji: cat.emoji
                }))
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

        await interaction.reply({
            content: '🛒 **O que você está procurando hoje?**',
            components: [row],
            flags: MessageFlags.Ephemeral
        });
    }

    private static async sendItemMenu(interaction: StringSelectMenuInteraction) {
        const categoryKey = interaction.values[0];
        const items = SHOP_ITEMS.filter(i => i.category === categoryKey);

        if (items.length === 0) {
            await interaction.update({ content: '❌ Nenhum item nesta categoria.', components: [] });
            return;
        }

        // Pagination check (if > 25, split - but we have 10 per cat so it fits)
        const select = new StringSelectMenuBuilder()
            .setCustomId('shop_item_select')
            .setPlaceholder('📦 Escolha o produto')
            .addOptions(
                items.map(item => ({
                    label: `${item.name} (${item.price} BC)`,
                    value: item.id,
                    description: item.description,
                    emoji: item.emoji
                }))
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

        await interaction.update({
            content: `📂 **Categoria: ${SHOP_CATEGORIES[categoryKey as keyof typeof SHOP_CATEGORIES].label}**\nSelecione um item abaixo:`,
            components: [row]
        });
    }

    private static async showConfirmation(interaction: StringSelectMenuInteraction) {
        const itemId = interaction.values[0];
        const item = SHOP_ITEMS.find(i => i.id === itemId);

        if (!item) {
            await interaction.update({ content: '❌ Item não encontrado.', components: [] });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`📦 Confirmar Compra: ${item.name}`)
            .setDescription(
                `**Descrição:** ${item.description}\n` +
                `**Preço:** 💰 \`${item.price} BC\`\n\n` +
                `Você tem certeza que deseja adquirir este item?`
            )
            .setColor('#FFFF00');

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`shop_confirm_buy_${item.id}`)
                .setLabel('✅ CONFIRMAR COMPRA')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('shop_cancel')
                .setLabel('❌ CANCELAR')
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.update({
            content: '',
            embeds: [embed],
            components: [row]
        });
    }

    private static async processPurchase(interaction: any) {
        const itemId = interaction.customId.replace('shop_confirm_buy_', '');
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        const userId = interaction.user.id;
        const member = interaction.member as GuildMember;

        if (!item) return;

        await interaction.deferUpdate();

        // 1. Check Balance
        const balance = await EconomyManager.getBalance(userId);
        if (balance < item.price) {
            await interaction.editReply({
                content: `🚫 **Saldo Insuficiente!**\nVocê precisa de **${item.price} BC**, mas tem apenas **${balance} BC**.\nFaça o Daily ou interaja no chat para ganhar mais.`,
                embeds: [],
                components: []
            });
            return;
        }

        // 2. Pre-Check (Roles)
        if (item.type === 'ROLE' && item.roleName) {
            const role = interaction.guild?.roles.cache.find((r: any) => r.name === item.roleName);
            if (!role) {
                await interaction.editReply({ content: '❌ Erro: O cargo deste item não existe no servidor. Contate um Admin.', embeds: [], components: [] });
                return;
            }
            if (member.roles.cache.has(role.id)) {
                await interaction.editReply({ content: '⚠️ **Você já possui este item!** Compra cancelada.', embeds: [], components: [] });
                return;
            }
        }

        // 3. Deduct Balance (Atomic-ish)
        const success = await EconomyManager.removeBalance(userId, item.price, `Compra: ${item.name}`, interaction.guild, interaction.user);
        
        if (!success) {
            await interaction.editReply({ content: '❌ Erro na transação. Tente novamente.', embeds: [], components: [] });
            return;
        }

        // 4. Deliver Item
        try {
            // A. XP
            if (item.type === 'XP' && item.value) {
                await XpManager.addXp(member, item.value);
            }

            // B. Role
            if (item.type === 'ROLE' && item.roleName) {
                const role = interaction.guild?.roles.cache.find((r: any) => r.name === item.roleName);
                if (role) await member.roles.add(role);
            }

            // C. Inventory (For All items to track history, or just collectibles)
            // Let's track everything in inventory for history
            await db.write(async (prisma) => {
                await prisma.userInventory.create({
                    data: {
                        userId,
                        itemId: item.id
                    }
                });
            });

            // Success Message
            const newBalance = await EconomyManager.getBalance(userId);
            
            await interaction.editReply({
                content: `🎉 **SUCESSO!** Você comprou **${item.name}**.\n💰 Novo Saldo: \`${newBalance} BC\``,
                embeds: [],
                components: []
            });

        } catch (error) {
            logger.error(error, `Error delivering item ${item.id} to ${userId}`);
            // Refund? Maybe later manually. Log is there.
            await interaction.editReply({ content: '⚠️ Houve um erro na entrega do item, mas o valor foi debitado. Contate o suporte.', embeds: [], components: [] });
        }
    }

    private static async showBalance(interaction: any) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const balance = await EconomyManager.getBalance(interaction.user.id);
        
        await interaction.editReply({
            content: `💳 **Sua Carteira**\n\n💰 Saldo Atual: **${balance} BC** (Blue Coins)`
        });
    }

    private static async handleDaily(interaction: any) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const result = await EconomyManager.claimDaily(interaction.user.id, interaction.guild);

        if (result.success) {
            await interaction.editReply({
                content: `🎁 **DAILY RESGATADO!**\n\n💰 Você recebeu **200 BC**!\nVolte amanhã para mais.`
            });
        } else {
            const hours = Math.ceil((result.cooldown || 0) / (1000 * 60 * 60));
            await interaction.editReply({
                content: `⏳ **Você já pegou seu prêmio hoje!**\nVolte em aproximadamente **${hours} horas**.`
            });
        }
    }
}
