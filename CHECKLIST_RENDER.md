# 🚀 Checklist de Deploy no Render

Se o seu bot não está ficando online ou não está enviando mensagens, verifique estes pontos críticos:

## 1. Variáveis de Ambiente no Render (CRÍTICO)
O arquivo `.env` do seu computador **NÃO** é enviado para o Render (ele é bloqueado pelo `.gitignore` por segurança). Você precisa configurar as variáveis manualmente no site.

1. Acesse o [Dashboard do Render](https://dashboard.render.com/).
2. Clique no seu serviço **bluezone-sentinel**.
3. Vá na aba **Environment**.
4. Adicione as seguintes variáveis:
   - `DISCORD_BOT_TOKEN`: (Seu token do bot - comece com `MT...` ou similar)
   - `CLIENT_ID`: (ID do Bot/Aplicação)
   - `GUILD_ID`: (ID do Servidor)
   - `LOG_CHANNEL_ID`: (ID do canal de logs)
   - `NODE_ENV`: `production`

> ⚠️ **Sem o TOKEN, o bot inicia, dá erro e desliga imediatamente.**

---

## 2. Permissões no Discord Developer Portal (CRÍTICO)
Para o bot saber quando alguém entra no servidor (`guildMemberAdd`), você precisa ativar uma permissão especial.

1. Acesse o [Discord Developer Portal](https://discord.com/developers/applications).
2. Selecione sua aplicação.
3. No menu lateral, clique em **Bot**.
4. Role até a seção **Privileged Gateway Intents**.
5. ATIVE as opções:
   - ✅ **PRESENCE INTENT**
   - ✅ **SERVER MEMBERS INTENT** (Essencial para boas-vindas!)
   - ✅ **MESSAGE CONTENT INTENT**
6. Clique em **Save Changes**.

---

## 3. Nome do Canal de Boas-Vindas
O código do bot procura EXATAMENTE por um canal com este nome:
`👋-boas-vindas`

- Se o canal se chamar apenas `boas-vindas` ou `welcome`, **não vai funcionar**.
- Renomeie o canal no Discord ou copie e cole o nome acima.

---

## 4. Como ver o erro real?
Se ainda não funcionar:
1. No painel do Render, vá na aba **Logs**.
2. Procure por mensagens em vermelho.
3. Se vir `Error: Invalid environment variables`, volte para o passo 1.
