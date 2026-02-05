"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const canvas_1 = require("../utils/canvas");
const LogManager_1 = require("../modules/logger/LogManager");
const logger_1 = __importDefault(require("../core/logger"));
const event = {
    name: discord_js_1.Events.GuildMemberAdd,
    async execute(member) {
        logger_1.default.info(`New Member: ${member.user.tag}`);
        // 1. Audit Log (Green)
        await LogManager_1.LogManager.log({
            guild: member.guild,
            type: LogManager_1.LogType.MEMBER,
            level: LogManager_1.LogLevel.SUCCESS,
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
        // 2. Auto Role (Visitante)
        const role = member.guild.roles.cache.find((r) => r.name === "🏳️ Visitante");
        if (role)
            await member.roles.add(role);
        // 3. Welcome Image (Canal Público)
        const channel = member.guild.channels.cache.find((c) => c.name === "👋-boas-vindas");
        if (channel) {
            const buffer = await canvas_1.CanvasHelper.generateWelcomeImage(member.user.username, member.guild.memberCount, member.user.displayAvatarURL({ extension: "png" }));
            const attachment = new discord_js_1.AttachmentBuilder(buffer, { name: "welcome.png" });
            const welcomeEmbed = new discord_js_1.EmbedBuilder()
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
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle("👋 Bem-vindo à BlueZone!")
                .setDescription(`Olá **${member.user.username}**! Obrigado por se juntar à nossa força-tarefa.\n\n**Para começar:**`)
                .setColor("#0099FF")
                .addFields({
                name: "📜 Regras",
                value: "Leia e aceite as regras em `#📜-regras` para liberar seu acesso.",
                inline: false,
            }, {
                name: "🎮 Vincular Conta",
                value: "Use `/vincular` no servidor para conectar seu perfil do PUBG.",
                inline: false,
            })
                .setFooter({ text: "Nos vemos no campo de batalha!" })
                .setTimestamp();
            await member.send({ embeds: [embed] });
        }
        catch (e) {
            // Ignora se DM estiver fechada
        }
    },
};
exports.default = event;
