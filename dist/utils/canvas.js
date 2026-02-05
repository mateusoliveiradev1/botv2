"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanvasHelper = void 0;
const canvas_1 = require("canvas");
class CanvasHelper {
    // Helper para desenhar polígono (Hexágono)
    static drawPolygon(ctx, x, y, radius, sides, rotate = 0) {
        if (sides < 3)
            return;
        const a = (Math.PI * 2) / sides;
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            ctx.lineTo(x + radius * Math.cos(a * i + rotate), y + radius * Math.sin(a * i + rotate));
        }
        ctx.closePath();
    }
    static async generateWelcomeImage(username, memberCount, avatarURL) {
        const width = 1024;
        const height = 500;
        const canvas = (0, canvas_1.createCanvas)(width, height);
        const ctx = canvas.getContext("2d");
        // --- 1. BACKGROUND (Estilo "Loading Screen" PUBG) ---
        try {
            // Usar uma imagem mais "Battle Royale" (Erangel ou Miramar vibes)
            // Fallback para imagem clássica se link quebrar
            const background = await (0, canvas_1.loadImage)("https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg");
            // Filtro de Cor (Tint Amarelo/Laranja queimado - Identidade PUBG)
            ctx.drawImage(background, 0, -100, width, height + 200);
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = 'rgba(242, 169, 0, 0.1)'; // Tint leve
            ctx.fillRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'source-over';
        }
        catch (e) {
            ctx.fillStyle = "#1a1a1a";
            ctx.fillRect(0, 0, width, height);
        }
        // Vinheta Pesada (Foco no Centro)
        const vignette = ctx.createRadialGradient(width / 2, height / 2, 300, width / 2, height / 2, width);
        vignette.addColorStop(0, "rgba(0,0,0,0.2)");
        vignette.addColorStop(0.8, "rgba(0,0,0,0.8)");
        vignette.addColorStop(1, "rgba(0,0,0,0.95)");
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);
        // Efeito "Scanlines" (TV Antiga/Monitor Tático)
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        for (let i = 0; i < height; i += 4) {
            ctx.fillRect(0, i, width, 2);
        }
        // --- 2. ELEMENTOS GRÁFICOS (HUD Tático) ---
        // Linha de Status Superior
        ctx.fillStyle = "#F2A900";
        ctx.fillRect(0, 0, width, 6);
        // Label de Sistema (Canto Superior Esquerdo)
        ctx.fillStyle = "#F2A900";
        ctx.font = "bold 16px Arial";
        ctx.fillText("BLUEZONE SENTINEL // SISTEMA ONLINE", 30, 35);
        // Decoração Tech (Cantos)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 2;
        // Canto Inferior Esquerdo
        ctx.beginPath();
        ctx.moveTo(30, height - 80);
        ctx.lineTo(30, height - 30);
        ctx.lineTo(80, height - 30);
        ctx.stroke();
        // Canto Inferior Direito
        ctx.beginPath();
        ctx.moveTo(width - 30, height - 80);
        ctx.lineTo(width - 30, height - 30);
        ctx.lineTo(width - 80, height - 30);
        ctx.stroke();
        // --- 3. AVATAR CENTRAL (Estilo "Loot Crate") ---
        const avatarSize = 200;
        const cx = width / 2;
        const cy = height / 2 - 50;
        // Glow do Avatar (Aura de Loot Lendário)
        ctx.save();
        ctx.shadowColor = "#F2A900";
        ctx.shadowBlur = 60;
        ctx.beginPath();
        ctx.arc(cx, cy, avatarSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fill();
        ctx.restore();
        // Borda Externa Rotacionada (Decoração)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 4);
        ctx.strokeStyle = "rgba(242, 169, 0, 0.3)";
        ctx.lineWidth = 2;
        ctx.strokeRect(-avatarSize / 2 - 15, -avatarSize / 2 - 15, avatarSize + 30, avatarSize + 30);
        ctx.restore();
        // Avatar Circular com Borda Grossa
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, avatarSize / 2, 0, Math.PI * 2);
        ctx.clip();
        if (avatarURL) {
            try {
                const avatar = await (0, canvas_1.loadImage)(avatarURL.replace(".webp", ".png"));
                ctx.drawImage(avatar, cx - avatarSize / 2, cy - avatarSize / 2, avatarSize, avatarSize);
            }
            catch (e) {
                ctx.fillStyle = "#333";
                ctx.fillRect(cx - avatarSize / 2, cy - avatarSize / 2, avatarSize, avatarSize);
            }
        }
        ctx.restore();
        // Anel do Avatar
        ctx.beginPath();
        ctx.arc(cx, cy, avatarSize / 2, 0, Math.PI * 2);
        ctx.strokeStyle = "#F2A900";
        ctx.lineWidth = 6;
        ctx.stroke();
        // Ícone de "Capacete Nível 3" (Simulado com texto/forma se não tiver imagem asset)
        // Vamos colocar uma badge "LVL 1" pequena
        ctx.fillStyle = "#F2A900";
        ctx.beginPath();
        ctx.arc(cx, cy + avatarSize / 2, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("1", cx, cy + avatarSize / 2);
        // --- 4. TEXTOS (PT-BR e Impactantes) ---
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        // "NOVO SOBREVIVENTE" (Estilo Stencil)
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = "bold 20px Arial";
        // Espaçamento simulado
        const label = "NOVO SOBREVIVENTE DETECTADO";
        ctx.fillText(label.split('').join(' '), cx, cy + 140);
        // NOME DO USUÁRIO (Gigante e Branco)
        ctx.shadowColor = "rgba(0,0,0,1)";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "900 64px Arial"; // Fonte bem grossa
        let displayUser = username.toUpperCase();
        if (displayUser.length > 14)
            displayUser = displayUser.substring(0, 14) + "...";
        ctx.fillText(displayUser, cx, cy + 200);
        // SUBTÍTULO COM CONTAGEM
        // Estilo "Squad Member"
        const countText = `RECRUTA Nº ${memberCount.toString().padStart(4, '0')}`;
        // Fundo da badge inferior
        const badgeWidth = 300;
        ctx.fillStyle = "rgba(242, 169, 0, 0.15)";
        ctx.fillRect(cx - badgeWidth / 2, cy + 225, badgeWidth, 36);
        // Bordas laterais da badge
        ctx.fillStyle = "#F2A900";
        ctx.fillRect(cx - badgeWidth / 2, cy + 225, 4, 36);
        ctx.fillRect(cx + badgeWidth / 2 - 4, cy + 225, 4, 36);
        ctx.fillStyle = "#F2A900";
        ctx.font = "bold 18px Arial";
        ctx.shadowBlur = 0;
        ctx.fillText(countText, cx, cy + 250);
        return canvas.toBuffer();
    }
    static async generateRankingImage(ranking, botAvatarURL) {
        // Mantendo a lógica do Ranking intacta (que já é boa), apenas garantindo que esteja aqui
        const cardHeight = 100;
        const cardGap = 20;
        const headerHeight = 180;
        const width = 1200;
        const height = headerHeight + (ranking.length * (cardHeight + cardGap)) + 50;
        const canvas = (0, canvas_1.createCanvas)(width, height);
        const ctx = canvas.getContext('2d');
        // Background Dark
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, width, height);
        const bgGradient = ctx.createRadialGradient(width / 2, 0, 0, width / 2, 0, width);
        bgGradient.addColorStop(0, '#1a1a2e');
        bgGradient.addColorStop(1, '#050505');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        // Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let i = -width; i < width * 2; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i - height, height);
            ctx.stroke();
        }
        // Header
        ctx.save();
        ctx.shadowColor = '#F2A900';
        ctx.shadowBlur = 50;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 72px Arial';
        ctx.fillText('RANKING', 140, 100);
        ctx.restore();
        ctx.fillStyle = '#F2A900';
        ctx.font = 'bold 22px Arial';
        ctx.fillText('TEMPORADA ATUAL • ELITE GLOBAL', 145, 140); // Traduzido
        // Cards (Simplificado para brevidade, mantendo lógica original)
        // ... (Mantendo restante da lógica de cards, assumindo que já estava correta no arquivo anterior)
        // Vou reincluir a lógica dos cards para garantir que o arquivo fique completo e funcional
        // Pré-carregar
        const avatarPromises = ranking.map(async (entry) => {
            try {
                const url = entry.avatar_url || 'https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg';
                return await (0, canvas_1.loadImage)(url);
            }
            catch (e) {
                return null;
            }
        });
        let logoPromise = botAvatarURL ? (0, canvas_1.loadImage)(botAvatarURL).catch(() => null) : Promise.resolve(null);
        const [avatars, headerLogo] = await Promise.all([Promise.all(avatarPromises), logoPromise]);
        // Logo
        if (headerLogo) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(80, 80, 45, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(headerLogo, 35, 35, 90, 90);
            ctx.restore();
        }
        // Loop Jogadores
        const startY = headerHeight;
        for (let index = 0; index < ranking.length; index++) {
            const entry = ranking[index];
            const avatarImg = avatars[index];
            const y = startY + (index * (cardHeight + cardGap));
            const x = 50;
            const cardWidth = width - 100;
            // Colors
            let baseColor = 'rgba(255, 255, 255, 0.1)';
            let strokeColor = 'rgba(255, 255, 255, 0.05)';
            if (index === 0) {
                baseColor = 'rgba(255, 215, 0, 0.2)';
                strokeColor = '#FFD700';
            }
            // Card Body
            const cardGradient = ctx.createLinearGradient(x, y, x + cardWidth, y);
            cardGradient.addColorStop(0, baseColor);
            cardGradient.addColorStop(1, 'rgba(0,0,0,0.4)');
            ctx.fillStyle = cardGradient;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(x, y, cardWidth, cardHeight, 10);
            ctx.fill();
            ctx.stroke();
            // Rank #
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${index + 1}`, x + 50, y + 65);
            // Name
            ctx.textAlign = 'left';
            ctx.font = 'bold 28px Arial';
            ctx.fillText(entry.player_name.toUpperCase(), x + 150, y + 60);
            // RP
            ctx.textAlign = 'right';
            ctx.font = 'bold 30px Arial';
            ctx.fillStyle = '#F2A900';
            ctx.fillText(`${entry.total_rp} RP`, x + cardWidth - 30, y + 60);
        }
        return canvas.toBuffer();
    }
}
exports.CanvasHelper = CanvasHelper;
