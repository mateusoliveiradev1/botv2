# 🛡️ BlueZone Sentinel (V2)

<div align="center">

![BlueZone Sentinel](https://wstatic-prod.pubg.com/web/live/static/og/img-og-pubg.jpg)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PUBG API](https://img.shields.io/badge/PUBG_API-F2A900?style=for-the-badge&logo=pubg&logoColor=white)](https://developer.pubg.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

**O Sistema Operacional Definitivo para Comunidades Competitivas de PUBG.**
*Gerenciamento de Clãs, Rankings em Tempo Real, Missões Diárias e Moderação Militar.*

[Features](#-features) • [Instalação](#-instalação) • [Comandos](#-comandos) • [Contribuição](#-contribuição)

</div>

---

## 📋 Sobre o Projeto

O **BlueZone Sentinel** não é apenas um bot, é uma infraestrutura completa para transformar servidores de Discord em verdadeiros QGs Militares. Projetado para a comunidade **Hawk Esports** e adaptável para qualquer clã competitivo.

Ele integra estatísticas reais do jogo (via Lovable API/Krafton), gerencia patentes baseadas em performance e mantém a ordem com um sistema de moderação hierárquico.

## 🚀 Features

### 📡 Inteligência & Dados (Telemetry)
- **Rankings Automáticos**: Leaderboards semanais, mensais e Hall of Fame atualizados via Webhook.
- **Estatísticas em Tempo Real**: Comando `/stats` com K/D, Wins e RP direto da API.
- **Link de Conta Seguro**: Autenticação oficial via Steam/Krafton.

### 🛡️ Moderação & Segurança (Sentinel)
- **AutoMod V1**: Proteção contra Spam, Flood, Links maliciosos e palavras ofensivas.
- **Sistema de Warns**: Punições progressivas (Warn -> Timeout -> Kick -> Ban).
- **Log "Caixa Preta"**: Auditoria completa de todas as ações no servidor.
- **Canal AFK Inteligente**: Movimentação automática e detecção de ausência.

### 🎮 Gamificação (Missions)
- **Missões Diárias**: Desafios rotativos (ex: "Jogue 3 partidas", "Faça 5 kills") que valem XP.
- **Sistema de XP & Patentes**: Progressão de carreira militar (Soldado -> General).
- **Conquistas & Medalhas**: Feed automático de promoções no canal `#🏅-conquistas`.

### 🏗️ Infraestrutura (Setup)
- **Criação Automática de Canais**: Comando `/setup` monta toda a estrutura do servidor (War Room, Alojamentos, etc).
- **Tickets & Suporte**: Sistema de atendimento com canais privados temporários.
- **Voice Generator**: Canais de voz "Criar Sala" dinâmicos.

---

## 🛠️ Instalação

### Pré-requisitos
- Node.js v18+
- Discord Bot Token (Developer Portal)
- Supabase/Lovable API Key (para dados do PUBG)

### Passo a Passo

1. **Clone o repositório**
   ```bash
   git clone https://github.com/seu-usuario/bluezone-sentinel.git
   cd bluezone-sentinel
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure o ambiente**
   Crie um arquivo `.env` na raiz:
   ```env
   DISCORD_BOT_TOKEN=seu_token_aqui
   CLIENT_ID=seu_client_id
   GUILD_ID=seu_guild_id
   LOG_CHANNEL_ID=id_do_canal_logs (opcional)
   NODE_ENV=development
   ```

4. **Inicie o Bot**
   ```bash
   # Modo Desenvolvimento (Hot Reload)
   npm run dev

   # Modo Produção
   npm run build
   npm start
   ```

---

## 💻 Comandos Principais

| Categoria | Comando | Descrição |
|-----------|---------|-----------|
| **Dados** | `/stats` | Cartão de jogador com K/D e Rank |
| | `/ranking` | (Desativado - Use os canais automáticos) |
| | `/vincular` | Conecta conta PUBG |
| **Social** | `/clan` | Info do esquadrão |
| | `/conquistas`| Suas medalhas |
| **Staff** | `/warn` | Aplica advertência |
| | `/ban` | Banimento com DM de aviso |
| | `/setup` | Reconstrói a estrutura do servidor |
| **Utils** | `/ajuda` | Menu interativo de suporte |

---

## 📂 Estrutura de Diretórios

```
src/
├── commands/       # Slash Commands (Data, Mod, General)
├── events/         # Discord Events (Ready, Interaction, MemberAdd)
├── modules/        # Core Systems
│   ├── moderation/ # AutoMod & WarningManager
│   ├── missions/   # Daily Missions Logic
│   ├── ranking/    # (Integrado ao Setup)
│   ├── setup/      # Channel & Category Generator
│   └── tickets/    # Support Ticket System
├── services/       # External APIs (Lovable, News, XP)
└── utils/          # Helpers (Canvas, Embeds, Time)
```

---

## 🤝 Contribuição

1. Faça um Fork do projeto
2. Crie uma Branch para sua Feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push para a Branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

<div align="center">

**Desenvolvido com 💀 por Liiiraa & Trae AI**
*Nos vemos na Zona Azul.*

</div>
