/* Modelo de rebaixamento — Poisson com força de ataque/defesa + Monte Carlo.
   games: { "h-a": [dateISO, done(0/1), hs, as] } ; teams: [ids] */
(function (root) {
  var HALF_LIFE_DAYS = 180, PRIOR_GAMES = 10, ITER = 40;
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  function poisson(l, r){var L=Math.exp(-l),k=0,p=1;do{k++;p*=r();}while(p>L);return k-1;}

  function fit(played, teams, refMs){
    var att={},def={},i,t;
    teams.forEach(function(t){att[t]=1;def[t]=1;});
    var W=0,HG=0,AG=0;
    var rows=played.map(function(g){var age=Math.max(0,(refMs-Date.parse(g.date))/864e5);var w=Math.pow(0.5,age/HALF_LIFE_DAYS);W+=w;HG+=w*g.hs;AG+=w*g.as;return {h:g.h,a:g.a,hs:g.hs,as:g.as,w:w};});
    var bh=W?HG/W:1.4, ba=W?AG/W:1.0;
    for(i=0;i<ITER;i++){
      var gf={},xf={},ga={},xa={};
      teams.forEach(function(t){gf[t]=PRIOR_GAMES*(bh+ba)/2;xf[t]=PRIOR_GAMES*(bh+ba)/2;ga[t]=gf[t];xa[t]=gf[t];});
      rows.forEach(function(r){
        gf[r.h]+=r.w*r.hs; xf[r.h]+=r.w*bh*def[r.a];
        gf[r.a]+=r.w*r.as; xf[r.a]+=r.w*ba*def[r.h];
        ga[r.h]+=r.w*r.as; xa[r.h]+=r.w*ba*att[r.a];
        ga[r.a]+=r.w*r.hs; xa[r.a]+=r.w*bh*att[r.h];
      });
      teams.forEach(function(t){att[t]=gf[t]/xf[t];def[t]=ga[t]/xa[t];});
    }
    return {att:att,def:def,bh:bh,ba:ba};
  }

  function lambdas(m,h,a){return [m.bh*m.att[h]*m.def[a], m.ba*m.att[a]*m.def[h]];}

  function wdl(l1,l2,h0,a0){h0=h0||0;a0=a0||0;var p=[0,0,0],f1=[],f2=[],k;for(k=0;k<=10;k++){f1[k]=Math.exp(-l1)*Math.pow(l1,k)/fact(k);f2[k]=Math.exp(-l2)*Math.pow(l2,k)/fact(k);}
    for(var x=0;x<=10;x++)for(var y=0;y<=10;y++){var q=f1[x]*f2[y],X=x+h0,Y=y+a0;if(X>Y)p[0]+=q;else if(X==Y)p[1]+=q;else p[2]+=q;}var s=p[0]+p[1]+p[2];return [p[0]/s,p[1]/s,p[2]/s];}
  function fact(n){var r=1;for(var i=2;i<=n;i++)r*=i;return r;}

  /* Sorteia um placar condicionado ao resultado pedido (0 mandante, 1 empate, 2 visitante) */
  /* h0/a0: gols já marcados (jogo em andamento) */
  function poissonOutcome(l1,l2,want,r,h0,a0){h0=h0||0;a0=a0||0;
    for(var i=0;i<80;i++){var x=h0+poisson(l1,r),y=a0+poisson(l2,r);if((x>y?0:x===y?1:2)===want)return [x,y];}
    var m=Math.max(h0,a0);return want===0?[Math.max(h0,a0+1),a0]:want===1?[m,m]:[h0,Math.max(a0,h0+1)];}
  /* fração do jogo que falta, a partir do minuto (com ~3 min de acréscimos) */
  function leftFrac(min){return Math.max(0.02,Math.min(1,(93-min)/93));}

  /* cutoffMs: games dated <= cutoff and done count as played
     opts.fixed: { "h-a": 0|1|2 } resultado imposto a jogos restantes (0 mandante, 1 empate, 2 visitante)
     opts.track: ["h-a", ...] jogos cujo resultado é cruzado com o rebaixamento de opts.trackTeams
     opts.live: { "h-a": {hs, as, min} } jogos em andamento: parte do placar atual e simula só o tempo que falta */
  function run(games, teams, cutoffMs, nSims, seed, opts){
    opts=opts||{};
    var played=[],remaining=[],k;
    var base={};teams.forEach(function(t){base[t]={p:0,w:0,gd:0,gf:0,j:0};});
    teams.forEach(function(h){teams.forEach(function(a){if(h===a)return;var g=games[h+'-'+a];
      if(g&&g[1]===1&&Date.parse(g[0])<=cutoffMs){played.push({date:g[0],h:h,a:a,hs:g[2],as:g[3]});}
      else remaining.push({h:h,a:a,date:g?g[0]:null});});});
    played.forEach(function(g){var H=base[g.h],A=base[g.a];H.j++;A.j++;H.gf+=g.hs;A.gf+=g.as;H.gd+=g.hs-g.as;A.gd+=g.as-g.hs;
      if(g.hs>g.as){H.p+=3;H.w++;}else if(g.hs<g.as){A.p+=3;A.w++;}else{H.p++;A.p++;}});
    var model=fit(played,teams,cutoffMs);
    var live=opts.live||{};
    var lv=remaining.map(function(g){var L=live[g.h+'-'+g.a];return L?{hs:L.hs,as:L.as,f:leftFrac(L.min)}:null;});
    var lam=remaining.map(function(g,k){var l=lambdas(model,g.h,g.a);return lv[k]?[l[0]*lv[k].f,l[1]*lv[k].f]:l;});
    var rnd=mulberry32(seed||12345);
    var n=teams.length, rel={}, pts={}, posHist={};
    teams.forEach(function(t){rel[t]=0;pts[t]=0;posHist[t]=new Array(n).fill(0);});
    var idx={};teams.forEach(function(t,i){idx[t]=i;});
    var P=new Float64Array(n),Wn=new Float64Array(n),GD=new Float64Array(n),GF=new Float64Array(n),TB=new Float64Array(n),order=teams.map(function(_,i){return i;});
    var fixed=opts.fixed||{}, fx=remaining.map(function(g){var v=fixed[g.h+'-'+g.a];return v===0||v===1||v===2?v:-1;});
    var tkTeams=(opts.trackTeams||[]).map(function(t){return idx[t];});
    var tk=[];(opts.track||[]).forEach(function(key){for(var j=0;j<remaining.length;j++)if(remaining[j].h+'-'+remaining[j].a===key)tk.push({key:key,k:j,n:[0,0,0],rel:tkTeams.map(function(){return [0,0,0];})});});
    var oc=new Int8Array(remaining.length),relNow=new Uint8Array(n);
    for(var s=0;s<nSims;s++){
      for(var i=0;i<n;i++){var b=base[teams[i]];P[i]=b.p;Wn[i]=b.w;GD[i]=b.gd;GF[i]=b.gf;TB[i]=rnd();}
      for(k=0;k<remaining.length;k++){var g=remaining[k],hi=idx[g.h],ai=idx[g.a],x,y;
        var h0=lv[k]?lv[k].hs:0,a0=lv[k]?lv[k].as:0;
        if(fx[k]<0){x=h0+poisson(lam[k][0],rnd);y=a0+poisson(lam[k][1],rnd);}else{var sc=poissonOutcome(lam[k][0],lam[k][1],fx[k],rnd,h0,a0);x=sc[0];y=sc[1];}
        oc[k]=x>y?0:x===y?1:2;
        GF[hi]+=x;GF[ai]+=y;GD[hi]+=x-y;GD[ai]+=y-x;if(x>y){P[hi]+=3;Wn[hi]++;}else if(x<y){P[ai]+=3;Wn[ai]++;}else{P[hi]++;P[ai]++;}}
      order.sort(function(a,b){return P[b]-P[a]||Wn[b]-Wn[a]||GD[b]-GD[a]||GF[b]-GF[a]||TB[b]-TB[a];});
      for(var r=0;r<n;r++){var t=teams[order[r]];posHist[t][r]++;relNow[order[r]]=r>=n-4?1:0;if(r>=n-4)rel[t]++;pts[t]+=P[order[r]];}
      for(var q=0;q<tk.length;q++){var o=oc[tk[q].k];tk[q].n[o]++;for(var z=0;z<tkTeams.length;z++)tk[q].rel[z][o]+=relNow[tkTeams[z]];}
    }
    var out={probs:{},expPts:{},posHist:{},table:{},played:played.length,remaining:remaining.length,model:model};
    teams.forEach(function(t){out.probs[t]=rel[t]/nSims;out.expPts[t]=pts[t]/nSims;out.posHist[t]=posHist[t].map(function(c){return c/nSims;});out.table[t]=base[t];});
    /* cond["h-a"] = { n:[mandante,empate,visitante], rel:{ clube:[...] } } — simulações por resultado e quedas em cada uma */
    out.cond={};tk.forEach(function(c){var rl={};(opts.trackTeams||[]).forEach(function(t,z){rl[t]=c.rel[z];});out.cond[c.key]={n:c.n,rel:rl};});
    out.remainingGames=remaining.map(function(g,k){var p=wdl(lam[k][0],lam[k][1],lv[k]?lv[k].hs:0,lv[k]?lv[k].as:0);var r={h:g.h,a:g.a,date:g.date,pH:p[0],pD:p[1],pA:p[2]};if(lv[k])r.live=live[g.h+'-'+g.a];return r;});
    out.live=lv.filter(Boolean).length;
    return out;
  }
  root.RebaixModel={run:run,fit:fit,wdl:wdl,leftFrac:leftFrac};
})(typeof window!=='undefined'?window:module.exports);
