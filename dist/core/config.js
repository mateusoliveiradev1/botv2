"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
const logger_1 = __importDefault(require("./logger"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    DISCORD_BOT_TOKEN: zod_1.z.string().min(1, 'Discord Bot Token is required'),
    CLIENT_ID: zod_1.z.string().optional(),
    GUILD_ID: zod_1.z.string().optional(),
    LOG_CHANNEL_ID: zod_1.z.string().optional(),
    NODE_ENV: zod_1.z.enum(['development', 'production']).default('development'),
});
const parseEnv = () => {
    try {
        return envSchema.parse(process.env);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            logger_1.default.error({ err: error.format() }, '❌ Invalid environment variables:');
        }
        process.exit(1);
    }
};
exports.config = parseEnv();
