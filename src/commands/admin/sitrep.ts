import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  TextChannel, 
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from 'discord.js';
import { SlashCommand } from '../../types';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('sitrep')
    .setDescription('Abrir painel de criação de comunicado SITREP (Admin Only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('sitrep_modal')
      .setTitle('📢 Criar Comunicado SITREP');

    const tituloInput = new TextInputBuilder()
      .setCustomId('sitrep_titulo')
      .setLabel('Título do Comunicado')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Manutenção Extraordinária')
      .setRequired(true);

    const mensagemInput = new TextInputBuilder()
      .setCustomId('sitrep_mensagem')
      .setLabel('Mensagem (Suporta Markdown)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Ex: Os servidores ficarão offline por 2h...')
      .setRequired(true);

    const imagemInput = new TextInputBuilder()
      .setCustomId('sitrep_imagem')
      .setLabel('URL da Imagem (Opcional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('https://...')
      .setRequired(false);

    const mencaoInput = new TextInputBuilder()
      .setCustomId('sitrep_mencao')
      .setLabel('Menção (Opcional: @everyone ou @here)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('@everyone')
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(tituloInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(mensagemInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(imagemInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(mencaoInput)
    );

    await interaction.showModal(modal);
  }
};

export default command;
