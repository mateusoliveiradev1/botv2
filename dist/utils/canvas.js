"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanvasHelper = void 0;
const canvas_1 = require("canvas");
class CanvasHelper {
    static async generateWelcomeImage(username, memberCount, avatarURL) {
        const width = 1024;
        const height = 450;
        const canvas = (0, canvas_1.createCanvas)(width, height);
        const ctx = canvas.getContext("2d");
        // 1. Background Dinâmico
        try {
            // Usar uma imagem de mapa tático ou fundo oficial mais escuro
            const background = await (0, canvas_1.loadImage)("https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg");
            // Efeito de Zoom/Crop central
            ctx.drawImage(background, 0, -100, width, height + 200);
            // Overlay Gradiente (Dark Gradient) para destacar o texto
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, "rgba(0, 0, 0, 0.9)"); // Esquerda bem escura
            gradient.addColorStop(0.6, "rgba(0, 0, 0, 0.7)");
            gradient.addColorStop(1, "rgba(0, 0, 0, 0.4)"); // Direita mais transparente
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            // Adicionar textura de "Grid" tático (linhas finas)
            ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
            ctx.lineWidth = 1;
            for (let i = 0; i < width; i += 40) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, height);
                ctx.stroke();
            }
            for (let i = 0; i < height; i += 40) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(width, i);
                ctx.stroke();
            }
        }
        catch (e) {
            ctx.fillStyle = "#0f0f0f";
            ctx.fillRect(0, 0, width, height);
        }
        // 2. Elementos de Design (Barra Lateral Amarela)
        ctx.fillStyle = "#F2A900";
        ctx.fillRect(0, 0, 15, height); // Barra esquerda
        // 3. Avatar (Esquerda)
        const avatarSize = 220;
        const avatarX = 80;
        const avatarY = (height - avatarSize) / 2;
        if (avatarURL) {
            try {
                // Sombra do Avatar
                ctx.save();
                ctx.shadowColor = "#F2A900";
                ctx.shadowBlur = 20;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                // Clip Hexagonal ou Circular
                ctx.beginPath();
                ctx.arc(avatarX + avatarSize / 2, height / 2, avatarSize / 2, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                const avatar = await (0, canvas_1.loadImage)(avatarURL.replace(".webp", ".png"));
                ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
                ctx.restore();
                // Borda do Avatar
                ctx.beginPath();
                ctx.arc(avatarX + avatarSize / 2, height / 2, avatarSize / 2, 0, Math.PI * 2, true);
                ctx.strokeStyle = "#F2A900";
                ctx.lineWidth = 6;
                ctx.stroke();
            }
            catch (e) {
                console.error("Error loading avatar", e);
            }
        }
        // 4. Textos (Direita/Centro)
        const textX = 340;
        // "NOVO OPERADOR DETECTADO"
        ctx.fillStyle = "#F2A900";
        ctx.font = "bold 24px Arial"; // Ou uma fonte mono se tiver
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 5;
        ctx.fillText("NOVO OPERADOR DETECTADO", textX, 150);
        // Nome do Usuário (Grande e Branco)
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 72px Arial";
        ctx.shadowColor = "rgba(0,0,0,1)";
        ctx.shadowBlur = 10;
        // Truncar nome se for muito longo
        let displayName = username.toUpperCase();
        if (displayName.length > 12) {
            ctx.font = "bold 55px Arial";
        }
        if (displayName.length > 18) {
            displayName = displayName.substring(0, 16) + "...";
        }
        ctx.fillText(displayName, textX, 230);
        // "Bem-vindo ao Squad"
        ctx.fillStyle = "#BBBBBB";
        ctx.font = "30px Arial";
        ctx.fillText("BEM-VINDO AO SQUAD", textX, 280);
        // Contador de Membros (Badge estilizada)
        const badgeY = 340;
        // Fundo da badge
        ctx.fillStyle = "rgba(242, 169, 0, 0.2)"; // Amarelo transparente
        ctx.fillRect(textX, badgeY, 280, 40);
        ctx.strokeStyle = "#F2A900";
        ctx.lineWidth = 2;
        ctx.strokeRect(textX, badgeY, 280, 40);
        // Texto da badge
        ctx.fillStyle = "#F2A900";
        ctx.font = "bold 20px Arial";
        ctx.fillText(`OPERADOR Nº ${memberCount}`, textX + 20, badgeY + 27);
        return canvas.toBuffer();
    }
    static async generateRankingImage(ranking, botAvatarURL) {
        const cardHeight = 100; // Aumentado para caber stats
        const cardGap = 20;
        const headerHeight = 180;
        const width = 1200; // Mais largo para caber mais info
        const height = headerHeight + (ranking.length * (cardHeight + cardGap)) + 50;
        const canvas = (0, canvas_1.createCanvas)(width, height);
        const ctx = canvas.getContext('2d');
        // 1. Background Ultra Premium (Dark Tech)
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, width, height);
        // Gradiente de Fundo
        const bgGradient = ctx.createRadialGradient(width / 2, 0, 0, width / 2, 0, width);
        bgGradient.addColorStop(0, '#1a1a2e');
        bgGradient.addColorStop(1, '#050505');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        // Grid Hexagonal
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let i = -width; i < width * 2; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i - height, height);
            ctx.stroke();
        }
        // 2. Header Minimalista
        // Glow no título
        ctx.save();
        ctx.shadowColor = '#F2A900';
        ctx.shadowBlur = 50;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 72px Arial';
        ctx.fillText('LEADERBOARD', 140, 100);
        ctx.restore();
        // Subtítulo
        ctx.fillStyle = '#F2A900';
        ctx.font = 'bold 22px Arial';
        ctx.fillText('SEASON 2026 • GLOBAL ELITE', 145, 140);
        // Barra decorativa
        const barGrad = ctx.createLinearGradient(width - 400, 0, width, 0);
        barGrad.addColorStop(0, 'rgba(242, 169, 0, 0)');
        barGrad.addColorStop(1, '#F2A900');
        ctx.fillStyle = barGrad;
        ctx.fillRect(width - 400, 95, 350, 5);
        // 3. Cards dos Jogadores
        const startY = headerHeight;
        // Pré-carregar avatares em paralelo
        const avatarPromises = ranking.map(async (entry) => {
            try {
                const url = entry.avatar_url || 'https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg';
                return await (0, canvas_1.loadImage)(url);
            }
            catch (e) {
                return null; // Falha silenciosa, retornará null
            }
        });
        // Carregar logo do header (Bot Avatar ou Fallback)
        let logoPromise = Promise.resolve(null);
        if (botAvatarURL) {
            logoPromise = (0, canvas_1.loadImage)(botAvatarURL).catch(() => null);
        }
        else {
            logoPromise = (0, canvas_1.loadImage)('https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg').catch(() => null);
        }
        const [avatars, headerLogo] = await Promise.all([
            Promise.all(avatarPromises),
            logoPromise
        ]);
        // Desenhar Logo no Header se carregou
        if (headerLogo) {
            ctx.save();
            // Sombra do Logo
            ctx.shadowColor = '#F2A900';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(80, 80, 45, 0, Math.PI * 2); // Levemente maior
            ctx.clip();
            ctx.drawImage(headerLogo, 35, 35, 90, 90); // Centralizado
            ctx.restore();
            // Borda do Logo
            ctx.beginPath();
            ctx.arc(80, 80, 45, 0, Math.PI * 2);
            ctx.strokeStyle = '#F2A900';
            ctx.lineWidth = 4;
            ctx.stroke();
        }
        else {
            // Fallback: Ícone de Troféu se não tiver logo
            ctx.save();
            ctx.translate(60, 45);
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.fillStyle = '#F2A900';
            ctx.moveTo(10, 0);
            ctx.lineTo(70, 0);
            ctx.bezierCurveTo(70, 40, 60, 50, 40, 50);
            ctx.bezierCurveTo(20, 50, 10, 40, 10, 0);
            ctx.fill();
            ctx.fillStyle = '#C68E17';
            ctx.fillRect(25, 50, 30, 10);
            ctx.fillRect(15, 60, 50, 5);
            ctx.restore();
        }
        for (let index = 0; index < ranking.length; index++) {
            const entry = ranking[index];
            const avatarImg = avatars[index]; // Imagem pré-carregada
            const y = startY + (index * (cardHeight + cardGap));
            const x = 50;
            const cardWidth = width - 100;
            // Cores baseadas no rank
            let baseColor = 'rgba(255, 255, 255, 0.1)';
            let glowColor = 'transparent';
            let strokeColor = 'rgba(255, 255, 255, 0.05)';
            if (index === 0) {
                baseColor = 'rgba(255, 215, 0, 0.2)';
                glowColor = '#FFD700';
                strokeColor = '#FFD700';
            }
            else if (index === 1) {
                baseColor = 'rgba(192, 192, 192, 0.15)';
                glowColor = '#C0C0C0';
                strokeColor = '#C0C0C0';
            }
            else if (index === 2) {
                baseColor = 'rgba(205, 127, 50, 0.15)';
                glowColor = '#CD7F32';
                strokeColor = '#CD7F32';
            }
            // Card Background
            const cardGradient = ctx.createLinearGradient(x, y, x + cardWidth, y);
            cardGradient.addColorStop(0, baseColor);
            cardGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
            ctx.save();
            if (index < 3) {
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = 15;
            }
            ctx.fillStyle = cardGradient;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = index < 3 ? 2 : 1;
            ctx.beginPath();
            ctx.roundRect(x, y, cardWidth, cardHeight, 12);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            // Rank Number
            ctx.fillStyle = index < 3 ? '#FFFFFF' : '#666';
            ctx.font = '900 42px Arial';
            ctx.textAlign = 'center';
            if (index === 0)
                ctx.fillText('👑', x + 50, y + 65);
            else
                ctx.fillText(`${index + 1}`, x + 50, y + 65);
            // Avatar (Círculo)
            const avatarSize = 60;
            const avatarX = x + 90;
            const avatarY = y + (cardHeight - avatarSize) / 2;
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.clip();
            if (avatarImg) {
                ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
            }
            else {
                // Fallback placeholder
                ctx.fillStyle = '#333';
                ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
                ctx.fillStyle = '#666';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('?', avatarX + avatarSize / 2, avatarY + 40);
            }
            ctx.restore();
            // Borda do Avatar
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.stroke();
            // Nome e Clan
            ctx.textAlign = 'left';
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 28px Arial';
            let displayName = entry.player_name.toUpperCase();
            if (entry.clan_tag)
                displayName = `[${entry.clan_tag}] ${displayName}`;
            ctx.fillText(displayName, x + 170, y + 45);
            // Rank Name (Menor, abaixo do nome)
            ctx.fillStyle = '#AAAAAA';
            ctx.font = '16px Arial';
            ctx.fillText(entry.current_rank.toUpperCase(), x + 170, y + 70);
            // --- STATS GRID (Direita) ---
            const statsX = x + cardWidth - 450;
            // 1. K/D Ratio
            if (entry.kd_ratio !== undefined) {
                ctx.textAlign = 'center';
                ctx.fillStyle = '#F2A900';
                ctx.font = 'bold 24px Arial';
                ctx.fillText(entry.kd_ratio.toFixed(2), statsX, y + 45);
                ctx.fillStyle = '#666';
                ctx.font = '12px Arial';
                ctx.fillText('K/D RATIO', statsX, y + 65);
            }
            // 2. Wins
            if (entry.wins !== undefined) {
                ctx.textAlign = 'center';
                ctx.fillStyle = '#00FFCC';
                ctx.font = 'bold 24px Arial';
                ctx.fillText(`${entry.wins}`, statsX + 120, y + 45);
                ctx.fillStyle = '#666';
                ctx.font = '12px Arial';
                ctx.fillText('WINS', statsX + 120, y + 65);
            }
            // 3. Total Kills (ou Matches se kills não vier)
            const thirdStat = entry.total_kills || entry.matches_played || 0;
            const thirdLabel = entry.total_kills ? 'KILLS' : 'MATCHES';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FF4444';
            ctx.font = 'bold 24px Arial';
            ctx.fillText(`${thirdStat}`, statsX + 240, y + 45);
            ctx.fillStyle = '#666';
            ctx.font = '12px Arial';
            ctx.fillText(thirdLabel, statsX + 240, y + 65);
            // RP (Extrema Direita, bem grande)
            ctx.textAlign = 'right';
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 36px Arial';
            ctx.fillText(`${entry.total_rp}`, x + cardWidth - 30, y + 60);
            ctx.fillStyle = '#444';
            ctx.font = 'bold 14px Arial';
            ctx.fillText('RP', x + cardWidth - 10, y + 60);
        }
        // Footer
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = '14px Arial';
        ctx.fillText('BLUEZONE SENTINEL SYSTEM • UPDATED REAL-TIME', width / 2, height - 20);
        return canvas.toBuffer();
    }
}
exports.CanvasHelper = CanvasHelper;
