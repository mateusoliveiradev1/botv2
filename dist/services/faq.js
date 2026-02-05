"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.faqService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fuse_js_1 = __importDefault(require("fuse.js"));
const logger_1 = __importDefault(require("../core/logger")); // Caminho corrigido
class FAQService {
    fuse = null;
    knowledgeBase = [];
    constructor() {
        this.loadKnowledgeBase();
    }
    loadKnowledgeBase() {
        try {
            const filePath = path_1.default.join(process.cwd(), 'data', 'faq_knowledge.json');
            const data = fs_1.default.readFileSync(filePath, 'utf-8');
            this.knowledgeBase = JSON.parse(data);
            // Configuração do Fuse.js para busca fuzzy "inteligente"
            this.fuse = new fuse_js_1.default(this.knowledgeBase, {
                keys: ['questions'], // Buscar nas perguntas
                threshold: 0.5, // Aumentado para 0.5 para ser mais tolerante (antes 0.4)
                includeScore: true,
                ignoreLocation: true, // Ignorar onde a palavra está na frase
                minMatchCharLength: 3
            });
            logger_1.default.info(`🧠 FAQ Knowledge Base loaded with ${this.knowledgeBase.length} entries.`);
        }
        catch (error) {
            logger_1.default.error(error, 'Failed to load FAQ Knowledge Base');
        }
    }
    search(query) {
        if (!this.fuse)
            return { found: false };
        const results = this.fuse.search(query);
        if (results.length > 0) {
            const bestMatch = results[0];
            // Se o score for menor que o threshold (quanto menor, melhor no Fuse), é um match bom
            // Fuse score: 0 = perfeito, 1 = nada a ver.
            // Vamos ser um pouco rigorosos para não responder besteira.
            if (bestMatch.score !== undefined && bestMatch.score < 0.5) {
                return {
                    found: true,
                    answer: bestMatch.item.answer,
                    score: bestMatch.score
                };
            }
        }
        return { found: false };
    }
}
exports.faqService = new FAQService();
