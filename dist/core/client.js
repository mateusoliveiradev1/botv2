"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlueZoneClient = void 0;
const discord_js_1 = require("discord.js");
const glob_1 = require("glob");
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("./logger"));
const config_1 = require("./config");
class BlueZoneClient extends discord_js_1.Client {
    constructor() {
        super({
            intents: [
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildMembers,
                discord_js_1.GatewayIntentBits.GuildMessages,
                discord_js_1.GatewayIntentBits.MessageContent,
                discord_js_1.GatewayIntentBits.GuildVoiceStates,
                discord_js_1.GatewayIntentBits.GuildPresences,
            ],
            partials: [discord_js_1.Partials.Message, discord_js_1.Partials.Channel, discord_js_1.Partials.Reaction],
        });
        this.commands = new discord_js_1.Collection();
        this.cooldowns = new discord_js_1.Collection();
    }
    async start() {
        await this.registerModules();
        await this.login(config_1.config.DISCORD_BOT_TOKEN);
    }
    async registerModules() {
        // Commands
        this.commands.clear(); // Limpar comandos antigos antes de registrar
        const commandFiles = await (0, glob_1.glob)(path_1.default.join(__dirname, "../commands/**/*{.ts,.js}").replace(/\\/g, "/"));
        for (const file of commandFiles) {
            const command = await Promise.resolve(`${file}`).then(s => __importStar(require(s))).then((m) => m.default);
            if (!command || !command.data) {
                logger_1.default.warn(`⚠️ Command missing data: ${file}`);
                continue;
            }
            this.commands.set(command.data.name, command);
            logger_1.default.info(`✅ Command loaded: /${command.data.name}`);
        }
        // Events
        // this.removeAllListeners(); // Removido pois causava instabilidade. A duplicação foi resolvida matando processos órfãos.
        const eventFiles = await (0, glob_1.glob)(path_1.default.join(__dirname, "../events/**/*{.ts,.js}").replace(/\\/g, "/"));
        for (const file of eventFiles) {
            const event = await Promise.resolve(`${file}`).then(s => __importStar(require(s))).then((m) => m.default);
            if (!event || !event.name) {
                logger_1.default.warn(`⚠️ Event missing name: ${file}`);
                continue;
            }
            if (event.once) {
                this.once(event.name, (...args) => event.execute(...args));
            }
            else {
                this.on(event.name, (...args) => event.execute(...args));
            }
            logger_1.default.info(`✅ Event loaded: ${event.name}`);
        }
    }
}
exports.BlueZoneClient = BlueZoneClient;
