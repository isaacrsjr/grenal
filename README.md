# Gre-Nal na Degola

Painel com a chance de Grêmio e Internacional caírem para a Série B no Brasileirão 2026.

- **Modelo:** força de ataque e defesa de cada clube (Poisson, com mando de campo e peso maior para jogos recentes) e 20.000 simulações dos jogos restantes. Rebaixamento = terminar entre o 17º e o 20º lugar.
- **Dados:** placar público da ESPN (`site.api.espn.com`). Os escudos também vêm da ESPN (`a.espncdn.com`).

## Como publicar no GitHub Pages

1. Crie um repositório público no GitHub (ex.: `gre-nal-na-degola`).
2. Envie todos os arquivos desta pasta, **incluindo a pasta oculta `.github`**. Pelo site: *Add file → Upload files* e arraste o conteúdo da pasta. Pelo terminal:
   ```bash
   git init && git add . && git commit -m "Painel Gre-Nal na Degola"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/gre-nal-na-degola.git
   git push -u origin main
   ```
3. Em **Settings → Pages**, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`. Em um ou dois minutos o site fica em `https://SEU_USUARIO.github.io/gre-nal-na-degola/`.
4. Em **Settings → Actions → General → Workflow permissions**, marque **Read and write permissions**, para a atualização automática conseguir salvar os dados.
5. Em **Actions → Atualizar resultados → Run workflow**, rode uma vez para testar.

## Como a atualização funciona

- **Automática:** o GitHub Actions roda todo dia às 03h17 (Brasília). Ele busca os resultados novos, recalcula e grava em `data/games.json` e `data/snapshots.json`. Esse histórico é o que todo mundo que abre o site vê. O GitHub pausa tarefas agendadas de repositórios sem atividade por 60 dias; por isso, se passarem 45 dias sem commit (ex.: entressafra), o próprio Actions grava um commit vazio para manter a agenda ativa.
- **Botão "Atualizar resultados":** faz a mesma busca na hora, direto do navegador de quem clicou. O resultado fica salvo só nesse navegador, até a próxima atualização automática.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | a página |
| `model.js` | modelo e simulação |
| `core.js` | busca na ESPN e cálculo do histórico semanal (usado pela página e pelo Actions) |
| `scripts/update.js` | script do Actions (`node scripts/update.js`, Node 18+) |
| `.github/workflows/atualizar.yml` | agenda diária |
| `data/` | jogos e histórico semanal |
