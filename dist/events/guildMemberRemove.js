"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const LogManager_1 = require("../modules/logger/LogManager");
const logger_1 = __importDefault(require("../core/logger"));
const event = {
    name: discord_js_1.Events.GuildMemberRemove,
    async execute(member) {
        if (member.user.bot)
            return;
        logger_1.default.info(`Member Left: ${member.user.tag}`);
        // Audit Log (Red)
        await LogManager_1.LogManager.log({
            guild: member.guild,
            type: LogManager_1.LogType.MEMBER,
            level: LogManager_1.LogLevel.DANGER,
            title: 'Membro Saiu',
            description: `Operador abandonou o posto ou foi desconectado.`,
            target: member.user,
            fields: [
                { name: 'Total de Membros', value: `${member.guild.memberCount}`, inline: true }
            ]
        });
    },
};
exports.default = event;
