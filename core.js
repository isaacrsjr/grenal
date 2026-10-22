/* Funções compartilhadas pela página e pelo script do GitHub Actions. */
(function (root) {
  var NAMES = {"819":"Flamengo","874":"Corinthians","1936":"Internacional","2022":"Cruzeiro","2026":"São Paulo","2029":"Palmeiras","2674":"Santos","3445":"Fluminense","3454":"Vasco","3456":"Coritiba","3457":"Vitória","3458":"Athletico-PR","4936":"Remo","6079":"Bragantino","6086":"Botafogo","6273":"Grêmio","7632":"Atlético-MG","9169":"Mirassol","9318":"Chapecoense","9967":"Bahia"};
  var TEAMS = Object.keys(NAMES);
  var BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard';
  var GRE = '6273', INT = '1936', SIMS = 20000, SEED = 20260101;

  // Semana = segunda a domingo no horário de Brasília (UTC-3)
  function weekStartMs(ms){var d=new Date(ms-3*36e5);var day=(d.getUTCDay()+6)%7;return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-day)+3*36e5}
  function weekKey(ms){return new Date(weekStartMs(ms)).toISOString().slice(0,10)}

  function mergeEvents(games, json, found){
    var n=0;(json.events||[]).forEach(function(e){try{
      var c=e.competitions[0];
      var h=c.competitors.find(function(x){return x.homeAway==='home'}),a=c.competitors.find(function(x){return x.homeAway==='away'});
      var k=h.team.id+'-'+a.team.id;var done=e.status&&e.status.type&&e.status.type.completed?1:0;var cur=games[k];
      if(cur&&cur[1]===1&&!done)return;
      var nv=[e.date,done,done?+h.score:0,done?+a.score:0];
      if(!cur||cur[0]!==nv[0]||cur[1]!==nv[1]||cur[2]!==nv[2]||cur[3]!==nv[3]){
        if(done&&!(cur&&cur[1]===1))found.push((NAMES[h.team.id]||h.team.displayName)+' '+nv[2]+'×'+nv[3]+' '+(NAMES[a.team.id]||a.team.displayName));
        games[k]=nv;n++}
    }catch(_){}});return n}

  function lastCompleted(games){var l='2026-01-01';Object.keys(games).forEach(function(k){var g=games[k];if(g[1]===1&&g[0]>l)l=g[0]});return l}

  /* Busca na ESPN os dias desde o último resultado salvo. fetchJson(url) -> Promise<json> */
  async function fetchUpdates(games, fetchJson, now, onProgress){
    var found=[];var j0=await fetchJson(BASE);mergeEvents(games,j0,found);
    var from=new Date(Date.parse(lastCompleted(games))-2*864e5).toISOString().slice(0,10);
    var to=new Date(now+864e5).toISOString().slice(0,10);
    var cal=((j0.leagues&&j0.leagues[0]&&j0.leagues[0].calendar)||[]).map(function(c){return (typeof c==='string'?c:(c.startDate||c.value||'')).slice(0,10)});
    var days=Array.from(new Set(cal)).filter(function(d){return d>=from&&d<=to}).sort().slice(-30);
    for(var i=0;i<days.length;i++){if(onProgress)onProgress(days[i],i,days.length);
      mergeEvents(games,await fetchJson(BASE+'?dates='+days[i].replace(/-/g,'')),found)}
    return found;
  }

  function snapFrom(r,week){var probs={},exp={};TEAMS.forEach(function(t){probs[t]=+r.probs[t].toFixed(4);exp[t]=+r.expPts[t].toFixed(1)});
    return {week:week,played:r.played,probs:probs,expPts:exp,pts:{'6273':r.table[GRE].p,'1936':r.table[INT].p},sims:SIMS}}

  /* Preenche semanas sem ponto e recalcula a semana atual. Devolve {snaps, cur, changed} */
  async function updateSnapshots(games, snaps, now, Model, source, onTick){
    snaps=snaps.slice().sort(function(a,b){return a.week<b.week?-1:1});
    var have={};snaps.forEach(function(s){have[s.week]=1});
    var lastWeek=snaps.length?snaps[snaps.length-1].week:null;var changed=[];
    var run=function(cut){return Model.run(games,TEAMS,cut,SIMS,SEED)};
    if(lastWeek){for(var w=Date.parse(lastWeek+'T03:00:00Z')+7*864e5;w<weekStartMs(now);w+=7*864e5){
      var k=new Date(w).toISOString().slice(0,10);if(have[k])continue;var rw=run(w+7*864e5-1);
      var prev=snaps[snaps.length-1];if(!prev||rw.played>prev.played){var sn=snapFrom(rw,k);sn.source=source;snaps.push(sn);changed.push(sn)}
      if(onTick)await onTick()}}
    var cur=run(now);var cw=weekKey(now);var sc=snapFrom(cur,cw);sc.source=source;sc.updatedAt=new Date(now).toISOString();
    snaps=snaps.filter(function(s){return s.week!==cw});snaps.push(sc);changed.push(sc);
    snaps.sort(function(a,b){return a.week<b.week?-1:1});
    return {snaps:snaps,cur:cur,changed:changed};
  }

  root.RebaixCore={NAMES:NAMES,TEAMS:TEAMS,BASE:BASE,GRE:GRE,INT:INT,SIMS:SIMS,SEED:SEED,weekStartMs:weekStartMs,weekKey:weekKey,mergeEvents:mergeEvents,fetchUpdates:fetchUpdates,updateSnapshots:updateSnapshots,lastCompleted:lastCompleted};
})(typeof window!=='undefined'?window:module.exports);
