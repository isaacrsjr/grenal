// Atualiza data/games.json e data/snapshots.json a partir do placar público da ESPN.
// Uso: node scripts/update.js   (Node 18+)
const fs = require('fs');
const path = require('path');
const { RebaixModel } = require('../model.js');
const { RebaixCore } = require('../core.js');

const DATA = path.join(__dirname, '..', 'data');
const gamesFile = path.join(DATA, 'games.json');
const snapsFile = path.join(DATA, 'snapshots.json');

async function fetchJson(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'gre-nal-na-degola' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      if (i === 2) throw e;
      await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
    }
  }
}

(async () => {
  const doc = JSON.parse(fs.readFileSync(gamesFile, 'utf8'));
  const snaps = JSON.parse(fs.readFileSync(snapsFile, 'utf8'));
  const before = JSON.stringify(doc.games);
  const now = Date.now();
  const found = await RebaixCore.fetchUpdates(doc.games, fetchJson, now, (d, i, n) => console.log(`lendo ${d} (${i + 1}/${n})`));
  console.log(found.length ? 'novos resultados: ' + found.join(', ') : 'nenhum resultado novo');
  const hasWeek = snaps.some((s) => s.week === RebaixCore.weekKey(now));
  if (JSON.stringify(doc.games) === before && hasWeek) {
    console.log('nada mudou desde a última atualização');
    return;
  }
  const res = await RebaixCore.updateSnapshots(doc.games, snaps, now, RebaixModel, 'GitHub Actions');
  doc.updatedAt = new Date(now).toISOString();
  fs.writeFileSync(gamesFile, JSON.stringify(doc));
  fs.writeFileSync(snapsFile, JSON.stringify(res.snaps));
  const c = res.cur;
  console.log(`Grêmio ${(c.probs['6273'] * 100).toFixed(1)}%  Inter ${(c.probs['1936'] * 100).toFixed(1)}%  (${c.played} jogos)`);
})().catch((e) => { console.error(e); process.exit(1); });
