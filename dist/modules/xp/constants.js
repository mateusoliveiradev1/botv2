"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XP_RATES = exports.XP_LEVELS = void 0;
exports.XP_LEVELS = [
    { level: 1, xp: 0, role: '🎒 Survivor' },
    { level: 5, xp: 500, role: '🔧 Scavenger' },
    { level: 10, xp: 1500, role: '🔫 Skirmisher' },
    { level: 20, xp: 4000, role: '🎯 Specialist' },
    { level: 40, xp: 10000, role: '🎖️ Expert' },
    { level: 80, xp: 25000, role: '🦁 Lone Survivor' },
    { level: 100, xp: 50000, role: '🍗 Chicken Dinner' },
];
exports.XP_RATES = {
    MESSAGE_MIN: 15,
    MESSAGE_MAX: 25,
    VOICE_PER_10MIN: 50,
    COOLDOWN: 60 * 1000, // 1 min
};
