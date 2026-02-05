import fs from 'fs';
import path from 'path';
import Fuse from 'fuse.js';
import logger from '../core/logger'; // Caminho corrigido

interface FAQEntry {
  id: string;
  questions: string[];
  answer: string;
}

class FAQService {
  private fuse: Fuse<FAQEntry> | null = null;
  private knowledgeBase: FAQEntry[] = [];

  constructor() {
    this.loadKnowledgeBase();
  }

  private loadKnowledgeBase() {
    try {
      const filePath = path.join(process.cwd(), 'data', 'faq_knowledge.json');
      const data = fs.readFileSync(filePath, 'utf-8');
      this.knowledgeBase = JSON.parse(data);

      // Configuração do Fuse.js para busca fuzzy "inteligente"
      this.fuse = new Fuse(this.knowledgeBase, {
        keys: ['questions'], // Buscar nas perguntas
        threshold: 0.5,      // Aumentado para 0.5 para ser mais tolerante (antes 0.4)
        includeScore: true,
        ignoreLocation: true, // Ignorar onde a palavra está na frase
        minMatchCharLength: 3
      });

      logger.info(`🧠 FAQ Knowledge Base loaded with ${this.knowledgeBase.length} entries.`);
    } catch (error) {
      logger.error(error, 'Failed to load FAQ Knowledge Base');
    }
  }

  public search(query: string): { found: boolean; answer?: string; score?: number } {
    if (!this.fuse) return { found: false };

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

export const faqService = new FAQService();