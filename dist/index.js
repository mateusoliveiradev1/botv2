"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("./core/client");
const logger_1 = __importDefault(require("./core/logger"));
const client = new client_1.BlueZoneClient();
process.on('unhandledRejection', (error) => {
    logger_1.default.error(error, '❌ Unhandled Rejection:');
});
process.on('uncaughtException', (error) => {
    logger_1.default.error(error, '❌ Uncaught Exception:');
});
client.start().catch((err) => {
    logger_1.default.error(err, '❌ Failed to start bot:');
});
