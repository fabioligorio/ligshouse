# LigsHouse — contexto para o Claude

App web pessoal do Fabio para organizar a casa e os cuidados dos cachorros **Hagrid** e **Hermione**. Interface toda em português do Brasil, pensada primeiro para celular (atalho na tela de início).

## Estrutura

- `index.html` — o app inteiro: HTML, CSS e JavaScript puro, sem build nem dependências. Fontes do Google Fonts (Bricolage Grotesque e Figtree).
- `api/store.js` — função serverless da Vercel (Node, CommonJS). Guarda os dados no Upstash Redis pela REST API (`KV_REST_API_URL`/`KV_REST_API_TOKEN` ou `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`). Protegida pelo cabeçalho `x-pin`, comparado com a variável `APP_PIN`.
- `api/_seed.json` — dados exportados da primeira versão (feita como artifact no claude.ai). Importados uma única vez quando o banco está vazio (chave `rc:seeded`).
- `manifest.webmanifest`, `icon*.png`, `icon.svg`, `apple-touch-icon.png` — instalação como app no celular.

## Dados

Cada coleção é um hash no Redis com prefixo `rc:` (`rc:pets`, `rc:tasks`, ...); cada documento é um JSON.

- `pets/{id}` — `{name, species, notes, createdAt}`
- `tasks/{id}` — `{title, area: 'casa'|'pet', petId (id do animal ou '__all' = todos os cachorros), category (chave fixa ou 'custom:Nome'), turno: 'manha'|'tarde'|'noite'|'livre', freq: {type: 'daily'|'weekdays'|'interval'|'date', days?, every?, start?, date?}, lastDone 'YYYY-MM-DD'|null, history: [datas], createdAt}`
- `compras/{id}` — item da lista: `{name, qty, list: 'casa'|'pets', bought, boughtAt, createdAt}`
- `historico/{id}` — compra fechada: `{date, total (número em reais), store, items: [{name, qty, list}], createdAt}`
- `dias/{YYYY-MM-DD}` — registro do dia para relatórios: `{date, total, done, completo, tasks: [{id, title, area, pet, cat, turno, done}]}`
- `memoria/geral` — sugestões de preenchimento: `{tasks, compras: {casa, pets}, qtys, lojas, petNames, notes, cats}`

No cliente, `createStore()` imita uma API de documentos (`collection().onSnapshot`, `doc().set/update/delete`, `add`): aplica a escrita na hora (otimista), envia para `/api/store` em fila e recarrega tudo a cada 20 s e quando o app volta ao foco.

## Funcionalidades

- **Hoje**: tarefas do dia separadas em blocos Casa (verde) e Animais (amarelo), por turno, com atrasadas e progresso.
- **Próximos**: agenda dos próximos 14 dias.
- **Animais**: ficha de cada cachorro (último banho, último passeio, próximo veterinário).
- **Compras**: listas Casa e Cachorros, fechar compra (itens + valor + data + local) e histórico por mês.
- **Rotinas**: todas as tarefas para editar.
- **Relatórios**: conclusão por período, por área, categoria e tarefa, gasto em compras e dia a dia.
- Todo campo de texto sugere o que já foi usado antes (memória em `memoria/geral`).

## Publicação

Repositório privado no GitHub → projeto na Vercel com Upstash Redis conectado e a variável `APP_PIN`. Detalhes no README.

## Ideias para continuar

- Notificações de lembrete (Web Push ou app nativo com Capacitor).
- Exportar relatórios em PDF/planilha.
- Gráficos de gastos por mês.
