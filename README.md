# Rotina da Casa

App web para organizar as tarefas da casa e os cuidados do Hagrid e da Hermione, com lista de compras, registro de compras e relatórios dos dias. Funciona em qualquer navegador e pode ser adicionado à tela de início do celular como um app.

## Como funciona

- `index.html`: o app inteiro (tela, estilos e lógica).
- `api/store.js`: API que guarda os dados num banco Redis (Upstash) da Vercel.
- `api/_seed.json`: dados que já existiam no Claude. São importados automaticamente na primeira vez que o app abre com o banco vazio.
- O acesso é protegido por um PIN, definido na variável `APP_PIN`.

## Publicar na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe este repositório. Não precisa mudar nenhuma configuração de build.
2. No projeto criado, abra **Storage** → **Create Database** → **Upstash for Redis** (Marketplace) e conecte ao projeto. A Vercel cria sozinha as variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN`.
3. Em **Settings → Environment Variables**, crie `APP_PIN` com o PIN que você quer usar (por exemplo, 4 a 6 números).
4. Em **Deployments**, faça um **Redeploy** para as variáveis valerem.
5. Abra o endereço do projeto (algo como `rotina-da-casa.vercel.app`), digite o PIN e pronto.

## Atalho no celular

- **iPhone (Safari):** Compartilhar → Adicionar à Tela de Início.
- **Android (Chrome):** menu ⋮ → Adicionar à tela inicial / Instalar app.

## Observações

- Mantenha o repositório **privado**: o arquivo `api/_seed.json` tem os seus dados.
- Os dados ficam sincronizados entre aparelhos; o app atualiza sozinho a cada 20 segundos e quando você volta para ele.
