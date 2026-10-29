# Gre-Nal na Degola

Painel com a chance de Grêmio e Internacional caírem para a Série B no Brasileirão 2026. É um site estático (HTML + JS puro, sem build nem dependências), publicado no GitHub Pages e atualizado todo dia pelo GitHub Actions.

## O que o painel mostra

- **Chance de queda** de Grêmio e Inter: posição atual, variação em relação à semana anterior, pontos atuais e projetados, e a distribuição da posição final nas simulações.
- **Evolução semanal** dessa chance ao longo do campeonato.
- **Risco de todos os clubes** de terminar no Z-4.
- **Classificação** atual, com os últimos 5 resultados de cada clube (V/E/D; o detalhe dos jogos aparece ao passar o mouse) e os pontos projetados (média das simulações). No celular, os últimos 5 ficam embaixo do nome e as colunas V e Proj. somem para a tabela caber na tela.
- **Simulador dos jogos que faltam** para a dupla Gre-Nal: em cada jogo, a chance de vitória, empate e derrota e a chance de queda se cada resultado acontecer. Dá para fixar resultados e ver a chance de queda dos dois clubes recalculada na hora; as escolhas ficam salvas só no navegador de quem usa.
- **Como a conta é feita**, no fim da página: o passo a passo do cálculo em linguagem simples, com os números de agora (notas de ataque e defesa, gols esperados do próximo jogo, temporadas sorteadas, contagem das quedas), em abas para a chance atual, o simulador e jogos ao vivo, e a atualização.

Passe o mouse sobre gráficos e tabelas para ver os detalhes. Os escudos vêm da ESPN (`a.espncdn.com`).

O topo da página, abaixo do status da atualização, mostra o total de visitas, contado pelo [GoatCounter](https://www.goatcounter.com) (sem cookies; painel em `isaacrsjr.goatcounter.com`). O código do site fica na constante `GOATCOUNTER` do `index.html`; deixá-la vazia desliga o contador.

## Como é calculado

1. **Força dos clubes:** cada time recebe uma força de ataque e uma de defesa, estimadas por um modelo de Poisson a partir dos jogos já disputados, com mando de campo. Jogos recentes pesam mais (meia-vida de 180 dias), e todo clube começa com o equivalente a 10 jogos "médios", para o modelo não exagerar no início do campeonato.
2. **Simulação:** os jogos restantes são simulados 20.000 vezes (Monte Carlo, com semente fixa, então o mesmo conjunto de jogos sempre dá o mesmo resultado).
3. **Rebaixamento:** fração das simulações em que o clube termina entre o 17º e o 20º lugar. Desempate: pontos, vitórias, saldo, gols pró e, por fim, sorteio.

Os parâmetros ficam no topo de `model.js` (`HALF_LIFE_DAYS`, `PRIOR_GAMES`) e de `core.js` (`SIMS`, `SEED`).

## Rodar localmente

A página carrega `data/*.json` com `fetch`, então precisa de um servidor HTTP. Abrir o `index.html` direto (`file://`) não funciona.

```bash
python3 -m http.server 8000
# ou: npx serve .
```

Depois é só abrir `http://localhost:8000`.

Para atualizar os dados na sua máquina (Node 18+, sem `npm install`):

```bash
node scripts/update.js
```

O script busca os resultados novos na ESPN, recalcula e regrava `data/games.json` e `data/snapshots.json`. É o mesmo que o Actions roda.

## Como a atualização funciona

- **Automática:** o GitHub Actions roda todo dia às 03h17 (Brasília), busca os resultados novos, recalcula e faz commit em `data/`. Esse histórico é o que todo mundo que abre o site vê. O GitHub pausa tarefas agendadas de repositórios sem atividade por 60 dias; por isso, se passarem 45 dias sem commit (ex.: entressafra), o próprio Actions grava um commit vazio para manter a agenda ativa.
- **Botão "Atualizar resultados":** faz a mesma busca na hora, direto do navegador de quem clicou. O resultado fica salvo só nesse navegador (`localStorage`), até a próxima atualização automática.
- **Jogos em andamento:** se houver jogos rolando quando alguém clica em "Atualizar resultados", o placar e o minuto de cada um entram no cálculo: o jogo parte do placar atual e só o tempo que falta é simulado. Esses jogos aparecem numa faixa "Ao vivo" no topo, e a classificação passa a mostrar a situação de agora, como se os jogos terminassem com o placar atual (com setas de quem subiu ou desceu e o placar ao lado de quem está em campo). O placar parcial nunca é gravado em `data/` nem no histórico semanal, só os resultados finais.
- **Histórico semanal:** cada semana (segunda a domingo, horário de Brasília) guarda o último cálculo feito nela. Se alguma semana ficar sem atualização, o ponto dela é recalculado retroativamente com os jogos daquela época.

Fonte dos placares: API pública da ESPN (`site.api.espn.com`, liga `bra.1`).

## Como publicar no GitHub Pages

1. Crie um repositório público no GitHub (ex.: `gre-nal-na-degola`).
2. Envie todos os arquivos desta pasta, **incluindo a pasta oculta `.github`** e o arquivo `.nojekyll`. Pelo site: *Add file → Upload files* e arraste o conteúdo da pasta. Pelo terminal:
   ```bash
   git init && git add . && git commit -m "Painel Gre-Nal na Degola"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/gre-nal-na-degola.git
   git push -u origin main
   ```
3. Em **Settings → Pages**, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`. Em um ou dois minutos o site fica em `https://SEU_USUARIO.github.io/gre-nal-na-degola/`.
4. Em **Settings → Actions → General → Workflow permissions**, marque **Read and write permissions**, para a atualização automática conseguir salvar os dados.
5. Em **Actions → Atualizar resultados → Run workflow**, rode uma vez para testar.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | a página (HTML, CSS e o código da interface) |
| `model.js` | modelo de Poisson e simulação Monte Carlo |
| `core.js` | clubes, busca na ESPN e cálculo do histórico semanal (usado pela página e pelo Actions) |
| `scripts/update.js` | script do Actions (`node scripts/update.js`, Node 18+) |
| `.github/workflows/atualizar.yml` | agenda diária |
| `data/games.json` | todos os jogos: `"mandante-visitante": [data, encerrado (0/1), gols mandante, gols visitante]`, com os IDs de clube da ESPN |
| `data/snapshots.json` | um ponto por semana: chance de queda e pontos esperados de cada clube |
| `.nojekyll` | faz o GitHub Pages servir os arquivos sem processar com Jekyll |

## Para outra temporada

Os clubes estão fixos em `NAMES`, no topo de `core.js` (ID da ESPN → nome), e Grêmio (`6273`) e Inter (`1936`) aparecem nas constantes `GRE` e `INT`. Para uma nova temporada:

1. Atualize a lista de clubes em `core.js` (os IDs aparecem na resposta da API da ESPN).
2. Troque o ano nos textos de `index.html` (`<meta name="description">` e o subtítulo "Brasileirão Série A 2026").
3. Zere os dados: `data/games.json` com `{"games": {}}` e `data/snapshots.json` com `[]`.
4. Rode `node scripts/update.js`. O gráfico semanal recomeça a partir da semana atual.
