"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const manager_1 = require("../modules/xp/manager");
const manager_2 = require("../modules/missions/manager");
const constants_1 = require("../modules/missions/constants");
const AutoMod_1 = require("../modules/moderation/AutoMod");
const event = {
    name: discord_js_1.Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild)
            return;
        // 1. Auto-Mod (Advanced)
        // Se o AutoMod agir (retornar true), paramos o processamento aqui (sem XP, sem missões)
        const punished = await AutoMod_1.AutoMod.handle(message);
        if (punished)
            return;
        // 2. XP System
        // Random amount 15-25
        const amount = Math.floor(Math.random() * 10) + 15;
        await manager_1.XpManager.addXp(message.member, amount);
        // 3. Mission Tracking
        manager_2.MissionManager.track(message.author.id, constants_1.MissionType.MESSAGE, 1);
    },
};
exports.default = event;
