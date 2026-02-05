"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MISSION_POOL = exports.MissionType = void 0;
var MissionType;
(function (MissionType) {
    MissionType["MESSAGE"] = "MESSAGE";
    MissionType["VOICE"] = "VOICE";
    MissionType["STREAM"] = "STREAM";
})(MissionType || (exports.MissionType = MissionType = {}));
exports.MISSION_POOL = [
    // --- CHAT MISSIONS ---
    {
        id: 'chat_novato',
        type: MissionType.MESSAGE,
        title: '🗣️ Comunicação Básica',
        description: 'Envie 10 mensagens em qualquer canal de texto.',
        target: 10,
        rewardXp: 50
    },
    {
        id: 'chat_fofoqueiro',
        type: MissionType.MESSAGE,
        title: '🗣️ Frequência Aberta',
        description: 'Envie 50 mensagens para a equipe.',
        target: 50,
        rewardXp: 150
    },
    {
        id: 'chat_debatedor',
        type: MissionType.MESSAGE,
        title: '🗣️ Relatório de Campo',
        description: 'Contribua com 100 mensagens no servidor.',
        target: 100,
        rewardXp: 300
    },
    {
        id: 'chat_ativo',
        type: MissionType.MESSAGE,
        title: '🗣️ Operador Ativo',
        description: 'Mantenha a comunicação: 30 mensagens.',
        target: 30,
        rewardXp: 100
    },
    // --- VOICE MISSIONS ---
    {
        id: 'voice_briefing',
        type: MissionType.VOICE,
        title: '🎙️ Briefing Matinal',
        description: 'Fique 15 minutos em canais de voz.',
        target: 15,
        rewardXp: 75
    },
    {
        id: 'voice_operador',
        type: MissionType.VOICE,
        title: '🎙️ Operador de Rádio',
        description: 'Participe de chamadas por 30 minutos.',
        target: 30,
        rewardXp: 150
    },
    {
        id: 'voice_comandante',
        type: MissionType.VOICE,
        title: '🎙️ Comando Central',
        description: 'Lidere o esquadrão por 60 minutos em voz.',
        target: 60,
        rewardXp: 300
    },
    {
        id: 'voice_maratona',
        type: MissionType.VOICE,
        title: '🎙️ Maratona de Combate',
        description: 'Sobreviva 120 minutos em canais de voz.',
        target: 120,
        rewardXp: 500
    },
    // --- STREAM MISSIONS ---
    {
        id: 'stream_tactical',
        type: MissionType.STREAM,
        title: '🎥 Transmissão Tática',
        description: 'Compartilhe sua tela/jogo por 15 minutos.',
        target: 15,
        rewardXp: 100
    },
    {
        id: 'stream_live',
        type: MissionType.STREAM,
        title: '🎥 Ao Vivo do Front',
        description: 'Faça uma stream de 45 minutos para o clã.',
        target: 45,
        rewardXp: 250
    }
];
