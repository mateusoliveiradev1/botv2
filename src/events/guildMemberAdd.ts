import {
  Events,
  GuildMember,
  TextChannel,
  AttachmentBuilder,
  EmbedBuilder,
} from "discord.js";
import { BotEvent } from "../types";
import { CanvasHelper } from "../utils/canvas";
import { LogManager, LogType, LogLevel } from "../modules/logger/LogManager";
import logger from "../core/logger";

const event: BotEvent = {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember) {
    logger.info(`New Member: ${member.user.tag}`);

    // 1. Audit Log (Green)
    await LogManager.log({
      guild: member.guild,
      type: LogType.MEMBER,
      level: LogLevel.SUCCESS,
      title: "Membro Entrou",
      description: `Novo operador identificado no perímetro.`,
      target: member.user,
      fields: [
        {
          name: "Conta Criada em",
          value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: "Total de Membros",
          value: `${member.guild.memberCount}`,
          inline: true,
        },
      ],
    });

    // 2. Auto Role (Recruta)
    const role = member.guild.roles.cache.find(
      (r) => r.name === "🏳️ Recruta",
    );
    if (role) await member.roles.add(role);

    // 3. Welcome Image (Canal Público)
    const channel = member.guild.channels.cache.find(
      (c) => c.name === "👋-boas-vindas",
    ) as TextChannel;
    if (channel) {
      const buffer = await CanvasHelper.generateWelcomeImage(
        member.user.username,
        member.guild.memberCount,
        member.user.displayAvatarURL({ extension: "png" }),
      );

      const attachment = new AttachmentBuilder(buffer, { name: "welcome.png" });
      
      const welcomeEmbed = new EmbedBuilder()
        .setTitle('🪂 NOVO SOBREVIVENTE NA ÁREA!')
        .setDescription(`**${member.user.username}** saltou na ilha. Preparem os equipamentos!`)
        .setColor('#F2A900') // Gold PUBG
        .setImage('attachment://welcome.png')
        .setFooter({ text: 'BLUEZONE SENTINEL • SISTEMA DE SEGURANÇA' })
        .setTimestamp();

      await channel.send({
        content: `👋 Olá, **${member}**!`,
        embeds: [welcomeEmbed],
        files: [attachment],
      });
    }

    // 4. DM Welcome (Onboarding)
    try {
      const embed = new EmbedBuilder()
        .setTitle("👋 Bem-vindo à BlueZone!")
        .setDescription(
          `Olá **${member.user.username}**! Obrigado por se juntar à nossa força-tarefa.\n\n**Para começar:**`,
        )
        .setColor("#0099FF")
        .addFields(
          {
            name: "📜 Regras",
            value:
              "Leia e aceite as regras em `#📜-regras` para liberar seu acesso.",
            inline: false,
          },
          {
            name: "🎮 Vincular Conta",
            value:
              "Use `/vincular` no servidor para conectar seu perfil do PUBG.",
            inline: false,
          },
        )
        .setFooter({ text: "Nos vemos no campo de batalha!" })
        .setTimestamp();

      await member.send({ embeds: [embed] });
    } catch (e) {
      // Ignora se DM estiver fechada
    }
  },
};

export default event;
