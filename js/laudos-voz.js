/* =========================================================================
   KlugRads — Ditado por voz nos laudos estruturados
   ---------------------------------------------------------------------------
   Painel acima dos itens do laudo:
     • microfone (reconhecimento de voz do próprio navegador, pt-BR — Chrome,
       Edge e Safari; no Chrome o áudio é processado pelo Google, por isso o
       aviso de não ditar dados do paciente);
     • campo para digitar a frase (funciona em qualquer navegador).
   Cada frase ditada é organizada por REGRAS, sem IA:
     1. comandos: "próximo item", "item anterior", "conclusão", "apagar",
        "abrir fígado", "parar ditado";
     2. órgão citado ("hepático", "rim direito"…) → item do laudo;
     3. achado ("hemangioma", "cisto"…) → frase da biblioteca daquele item;
     4. medidas ("1,1 x 1,2 cm"), segmento, lado e escolhas → campos da frase;
     5. sem frase reconhecida → vai como texto livre em "Achados adicionais".
   Carregar depois de laudos.js e das bibliotecas de frases.
   ========================================================================= */

const VOZ = { rec:null, on:false, interim:'', log:[], hist:[], erro:'' };
const VOZ_SR = (typeof window!=='undefined') && (window.SpeechRecognition || window.webkitSpeechRecognition);

/* ---------- normalização e números falados ---------- */
function vozNorm(t){ return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
const VOZ_NUM = {zero:0, um:1, uma:1, dois:2, duas:2, tres:3, quatro:4, cinco:5, seis:6, sete:7, oito:8, nove:9, dez:10,
  onze:11, doze:12, treze:13, quatorze:14, catorze:14, quinze:15, dezesseis:16, dezessete:17, dezoito:18, dezenove:19,
  vinte:20, trinta:30, quarenta:40, cinquenta:50, sessenta:60, setenta:70, oitenta:80, noventa:90, cem:100, cento:100};
/* "um vírgula dois por um vírgula cinco centímetros" → "1,2 x 1,5 cm" */
function vozPrepara(txt){
  let t=' '+String(txt||'').replace(/\s+/g,' ')+' ';
  // números por extenso (até 199, com "e")
  t=t.replace(/\b((?:zero|uma?|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|qu?atorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento)(?:\s+e\s+(?:uma?|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|qu?atorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa))*)\b/gi,
    m=>{ const n=vozNorm(m).split(/\s+e\s+/).reduce((a,w)=>a+(VOZ_NUM[w]||0),0); return String(n); });
  t=t.replace(/(\d)\s+v[ií]rgula\s+(\d)/gi,'$1,$2').replace(/(\d)\.(\d)/g,'$1,$2');
  t=t.replace(/(\d)\s*(?:por|vezes|x|×)\s*(\d)/gi,'$1 x $2').replace(/(\d)\s*(?:por|vezes|x|×)\s*(\d)/gi,'$1 x $2');
  t=t.replace(/\bcent[ií]metros?\b/gi,'cm').replace(/\bmil[ií]metros?\b/gi,'mm').replace(/\bcent[ií]metros c[uú]bicos\b/gi,'cm³');
  return t.trim();
}
/* primeira medida da frase: {vals:['1,1','1,2'], un:'cm'} */
function vozMedida(t){
  const re=/(\d+(?:,\d+)?)(?:\s*x\s*(\d+(?:,\d+)?))?(?:\s*x\s*(\d+(?:,\d+)?))?\s*(cm|mm)?(?![\w³²])/g; let m, cand=[];
  while((m=re.exec(t))){
    const antes=vozNorm(t.slice(Math.max(0,m.index-12), m.index));
    if(/(segmento|nivel|grau|bosniak|rads|tipo|lesao|nodulo|cisto)\s*$/.test(antes) && !m[4] && !m[2]) continue;   // "segmento 7" não é medida
    cand.push({vals:[m[1],m[2],m[3]].filter(Boolean), un:m[4]||null, peso:(m[4]?2:0)+(m[2]?1:0)});
  }
  if(!cand.length) return null;
  cand.sort((a,b)=>b.peso-a.peso); return cand[0];
}
function vozConv(v, de, para){
  if(!de || !para || de===para) return v;
  const n=parseFloat(String(v).replace(',','.')); if(isNaN(n)) return v;
  const r = de==='mm' && para==='cm' ? n/10 : n*10;
  return String(Math.round(r*100)/100).replace('.',',');
}
const VOZ_ROM = ['','I','II','III','IV','V','VI','VII','VIII'];
/* região do pâncreas dita ("porção cefálica", "cabeça", "cauda"…) */
function vozPancReg(t){ const n=vozNorm(t);
  if(/\b(porcao cefalica|cabeca|cefalic[oa])\b/.test(n)) return 'cabeça';
  if(/\bprocesso uncinado|uncinado\b/.test(n)) return 'processo uncinado';
  if(/\b(colo|istmo)\b/.test(n)) return 'colo';
  if(/\b(cauda|porcao caudal|caudal)\b/.test(n)) return 'cauda';
  if(/\b(corpo|porcao corporal)\b/.test(n)) return 'corpo';
  return null; }
function vozMaior(vals){ return vals.slice().sort((a,b)=>parseFloat(b.replace(',','.'))-parseFloat(a.replace(',','.')))[0]; }

/* ---------- órgão citado → item do laudo ---------- */
const VOZ_ORG = [
  [/\b(figado|hepatic[oa]s?)\b/, /^figado/],
  [/\b(vesicula|colelit|colecist|biliar(es)?)\b/, /^vias biliares|^vesicula/],
  [/\b(coledoco|vias biliares)\b/, /^vias biliares/],
  [/\b(porta|portal)\b/, /^vascularizacao hepatica|^veias? porta/],
  [/\b(pancreas|pancreatic[oa])\b/, /^pancreas/],
  [/\b(baco|esplenic[oa]|esplenomegalia)\b/, /^baco/],
  [/\b(adrenal|adrenais|suprarrenal)\b/, /adrena/],
  [/\brim direito\b/, /^rim direito|^rins/],
  [/\brim esquerdo\b/, /^rim esquerdo|^rins/],
  [/\b(rim|rins|renal|renais|nefrolit)\b/, /^rins?\b|^rim /],
  [/\b(ureter|ureteral)\b/, /^ureter/],
  [/\b(bexiga|vesical)\b/, /^bexiga/],
  [/\b(prostata|prostatic[oa])\b/, /^prostata/],
  [/\b(mioma|miomas|miometri\w*|adenomiose)\b/, [/^miometrio/, /^utero/]],
  [/\b(utero|uterin[oa])\b/, /^utero|^miometrio/],
  [/\b(endometri\w*)\b/, /^endometrio/],
  [/\bovario direito\b/, /^ovario direito|^ovarios/],
  [/\bovario esquerdo\b/, /^ovario esquerdo|^ovarios/],
  [/\b(ovario|ovarian[oa]|anexial)\b/, /^ovario/],
  [/\b(tireoide|tireoidian[oa])\b/, /^tireoide|^lobo|^glandula tireoide/],
  [/\b(testiculo|testicular)\b/, /^testicul/],
  [/\b(pulmao|pulmoes|pulmonar|vidro fosco|enfisema)\b/, [/^pulmoes/, /^transicao toracoabdominal/]],
  [/\b(pleura|pleural)\b/, /^espacos pleurais|pleura/],
  [/\b(mediastin\w*)\b/, /^mediastino/],
  [/\b(aorta|aortic[oa])\b/, /^aorta|^vasos$/],
  [/\b(apendic\w*|alcas?|colon|colica|intestin\w*|diverticul\w*)\b/, /^alcas|^intestino|^colon/],
  [/\b(ascite|liquido livre|peritone\w*|coleca?o)\b/, /^peritone|^peritoni|^ascite/],
  [/\b(linfonod\w*)\b/, /linfonod|^peritone|^peritoni|^mediastino/],
  [/\bmama direita\b/, /^mama direita/],
  [/\bmama esquerda\b/, /^mama esquerda/],
  [/\b(seio|seios|sinus\w*|maxilar)\b/, /^cavidades paranasais|^seios/],
  [/\b(septo nasal|desvio septal)\b/, /^septo nasal|^fossas nasais/],
  [/\b(fratura|fraturas)\b/, /^fraturas/],
  [/\b(disco|discal|protrusao|hernia discal|extrusao)\b/, /^discos/],
];
function vozItensDoLaudo(m){ return m.items.map(it=>({it, n:lauNorm(lauItemLabel(m,it)||'')})); }
function vozAchaItem(m, tn){
  const its=vozItensDoLaudo(m); let best=null;
  VOZ_ORG.forEach(([pal, lbl])=>{
    const mt=tn.match(pal); if(!mt) return;
    const lbls=[].concat(lbl); let cand=null;
    for(const l of lbls){ cand=its.find(x=>l.test(x.n) && !lauItemOutroLado(m,x.it)); if(cand) break; }
    if(cand && (!best || mt.index<best.pos || (mt.index===best.pos && mt[0].length>best.len))) best={it:cand.it, pos:mt.index, len:mt[0].length};
  });
  // também pelo próprio rótulo do item dito ("veia porta", "estruturas ósseas"…)
  if(!best) its.forEach(x=>{ if(x.n.length>3 && tn.indexOf(x.n)>=0 && !lauItemOutroLado(m,x.it)) best={it:x.it, pos:tn.indexOf(x.n)}; });
  return best && best.it;
}

/* ---------- achado → frase da biblioteca (ou controle do item estruturado) ---------- */
const VOZ_STOP = new Set(['de','do','da','dos','das','com','sem','para','por','em','no','na','nos','nas','um','uma','e','o','a','os','as','ao','padrao','varios','unico','multiplos','medida','maior','opcional','quantidade','localizacao','medindo','cerca','tipo','sugestivo','aspecto']);
/* palavras anatômicas: indicam o item, mas não o achado */
const VOZ_ANAT = /^(figado|hepatic[oa]s?|rim|rins|renal|renais|baco|esplenic[oa]|pancreas|pancreatic[oa]|vesicula|biliar|biliares|bexiga|vesical|utero|uterin[oa]|ovario|ovarian[oa]|tireoide|tireoidian[oa]|pulmao|pulmoes|pulmonar|pleura|pleural|mama|direit[oa]|esquerd[oa]|bilateral|lobo|segmento|terco|parede|polo|anterior|posterior|superior|inferior|medio|media)$/;
const VOZ_SIN = {calculo:['litiase','calculo'], calculos:['litiase','calculo'], pedra:['litiase','calculo'], cisto:['cisto','cistic'], cistos:['cisto','cistic'], cistico:['cisto','cistic'], cistica:['cisto','cistic'], nodulo:['nodulo','lesao','solid'], nodulos:['nodulo','lesao','solid'], massa:['massa','lesao','solid'],
  cefalica:['cabeca'], cefalico:['cabeca'], caudal:['cauda'], uncinado:['uncinado'], calcificado:['calcifica'], calcificacao:['calcifica'],
  gordura:['esteatose'], gorduroso:['esteatose'], esplenomegalia:['esplenomegalia','aumentad'], hepatomegalia:['hepatomegalia','aumentad'],
  aumentado:['aumentad','megalia'], aumentada:['aumentad','megalia'], dilatacao:['dilata','ectasia'], derrame:['derrame']};
function vozPalavras(t){ return vozNorm(t).replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(w=>w.length>=3 && !VOZ_STOP.has(w)); }
/* mesma palavra, ignorando gênero/plural ("moderada" = "moderado", "cisto" = "cistos") */
function vozRad(w){ return w.length>4 ? w.replace(/(os|as|es|o|a|e|s)$/,'') : w; }
function vozIgual(a,b){
  if(a===b || vozRad(a)===vozRad(b)) return true;
  const n=Math.min(a.length,b.length), x=Math.max(a.length,b.length);
  if(n>=5 && n/x>=0.6 && (a.startsWith(b)||b.startsWith(a))) return true;
  return n>=8 && a.slice(0,8)===b.slice(0,8);
}
/* quanto o nome (de frase/controle) bate com o que foi dito */
function vozScore(nome, fala, falaSin){
  const ws=vozPalavras(String(nome).replace(/\(.*?\)/g,'')); if(!ws.length) return 0;
  let sc=0, miss=0;
  ws.forEach(w=>{ if(fala.some(x=>vozIgual(w,x)) || falaSin.some(x=>x.length>=5 && (w.startsWith(x) || (x.length>=6 && w.endsWith(x))))){ sc+=3; if(fala.indexOf(w)>=0) sc+=0.5; } else miss++; });   // palavra idêntica desempata (nódulo × nódulos)
  return sc ? sc-miss*0.8 : 0;
}
function vozFala(tn){
  const fala=vozPalavras(tn).filter(w=>!VOZ_ANAT.test(w));
  const sin=[]; fala.forEach(w=>(VOZ_SIN[w]||[]).forEach(x=>sin.push(x)));
  return {fala, sin};
}
function vozFrasesDoItem(m, it){
  const lbl=lauItemLabel(m,it), mt=m.metodo==='tc' && !m.oct ? 'tcg' : m.metodo;
  const orgs = it.sk ? [it.sk] : lauFraseOrgao(lbl || String(lauItemNormal(m,it)).slice(0,60), mt);
  const itens = m.items.map(i=>lauNorm(lauItemLabel(m,i)||''));
  const lblV=lauNorm(lauItemLabel(m,it)||'');
  return lauFrasesDe(orgs).filter(f=>!(it.sk && f.s) && !(f.so && f.so.indexOf(m.id)<0) && !(f.nso && f.nso.indexOf(m.id)>=0) && !(f.lb && !f.lb.test(lblV)) && !(f.nlb && f.nlb.test(lblV)) && !(f.nm && itens.some(l=>f.nm.test(l))) && !f.kind);
}
function vozAchaFrase(m, it, tn){
  const {fala, sin}=vozFala(tn); let best=null;
  vozFrasesDoItem(m,it).forEach(f=>{
    let sc=vozScore(f.n, fala, sin); if(sc<=0) return;
    vozPalavras(f.t).slice(0,25).forEach(w=>{ if(w.length>=6 && fala.some(x=>vozIgual(w,x))) sc+=0.3; });
    if(!best || sc>best.sc) best={f, sc};
  });
  return best;
}
/* itens estruturados (US: fígado, baço, rins…): marca o controle correspondente */
function vozAchaCtrl(m, it, tn){
  if(!it.ctrls || !it.ctrls.length) return null;
  const {fala, sin}=vozFala(tn);
  const lado = /\bdireit[oa]\b/.test(tn) ? 'D' : /\besquerd[oa]\b/.test(tn) ? 'E' : null;
  let sec=null, best=null;
  it.ctrls.forEach((c,ci)=>{
    if(c.t==='head'){ sec=/direit/i.test(c.lbl)?'D':/esquerd/i.test(c.lbl)?'E':null; return; }
    if(lado && sec && sec!==lado) return;
    if(c.ind) return;   // sub-controles entram junto com o principal
    if(c.t==='check'){ const sc=vozScore(c.lbl, fala, sin); if(sc>0 && (!best||sc>best.sc)) best={sc, ci, c, v:true}; }
    if(c.t==='radio') c.opts.slice(1).forEach(o=>{ const sc=vozScore(o[1], fala, sin); if(sc>0 && (!best||sc>best.sc)) best={sc, ci, c, v:o[0]}; });
  });
  return best;
}
function vozAplicaCtrl(m, it, b, tn, t){
  const L=state.lau, s=L.v[it.k], antes=JSON.parse(JSON.stringify(s));
  s[b.c.k]=b.v;
  const med=vozMedida(t); let usou=false;
  const {fala, sin}=vozFala(tn);
  // controles que dependem do marcado (vêm logo depois, com recuo) e outros rádios ditos (ex.: grau "moderada")
  it.ctrls.forEach((c,ci)=>{
    if(!c.k || (c.show && !c.show(s))) return;
    const filho = ci>b.ci && c.ind && it.ctrls.slice(b.ci+1, ci).every(x=>x.ind);
    if(c.t==='num' && filho && med && !usou){ s[c.k]=vozConv(vozMaior(med.vals), med.un||c.unit, c.unit); usou=true; }
    else if(c.t==='select' && filho){
      const sm=tn.match(/segmento\s+(\d|[ivx]+)\b/); const seg=sm ? (/\d/.test(sm[1]) ? VOZ_ROM[+sm[1]] : sm[1].toUpperCase()) : null;
      const op=c.opts.find(o=>o[0] && ((seg && new RegExp('\\b'+seg+'\\b').test(o[0]+' '+o[1])) || vozScore(o[1], fala, sin)>=3));
      if(op) s[c.k]=op[0];
    }
    else if(c.t==='radio' && c!==b.c && c.k==='grau' && /\bgrau\s+(um|1|i|dois|2|ii|tres|3|iii)\b/.test(vozNorm(tn))){   // "grau dois" / "grau 3"
      const g={um:'1','1':'1',i:'1',dois:'2','2':'2',ii:'2',tres:'3','3':'3',iii:'3'}[vozNorm(tn).match(/\bgrau\s+(um|1|i|dois|2|ii|tres|3|iii)\b/)[1]];
      if(c.opts.some(o=>o[0]===g)) s[c.k]=g;
    }
    else if(c.t==='radio' && c!==b.c){ const op=c.opts.find(o=>vozScore(o[1], fala, [])>=3); if(op && (filho || ci>b.ci)) s[c.k]=op[0]; }
  });
  if(!usou && med && b.c.t==='radio'){ const n=it.ctrls.find(c=>c.t==='num' && (!c.show || c.show(s)) && c.unit && it.ctrls.indexOf(c)>b.ci); if(n){ s[n.k]=vozConv(vozMaior(med.vals), med.un||n.unit, n.unit); } }
  return antes;
}

/* ---------- campos da frase ---------- */
function vozPreenche(f, tn, t){
  const tpl=lauTpl(f.t); const vals=[]; const med=vozMedida(t); let medUsada=false;
  tpl.lines.forEach(toks=>toks.forEach((tk,j)=>{
    if(tk.t==='c'){   // escolha: a opção que foi dita
      const fw=vozNorm(tn).split(/[^a-z0-9]+/); fw.slice().forEach(w=>(VOZ_SIN[w]||[]).forEach(x=>fw.push(x)));
      const op=tk.o.find(o=>{ const ow=vozNorm(o).split(/\s+/).filter(w=>w.length>=3); return ow.length && ow.every(w=>fw.some(x=>vozIgual(w,x))); });
      if(op) vals[tk.i]=op; return;
    }
    if(tk.t!=='p') return;
    const prev=vozNorm((toks[j-1]&&toks[j-1].s)||'').replace(/[^a-z]/g,'');
    const nxt=(toks[j+1]&&toks[j+1].s)||''; const un=(nxt.match(/^(cm|mm)\b/)||[])[1];
    if(prev==='segmento'){ const sm=tn.match(/segmento\s+(\d|[ivx]+)\b/); if(sm) vals[tk.i]=/\d/.test(sm[1]) ? (VOZ_ROM[+sm[1]]||sm[1]) : sm[1].toUpperCase(); return; }
    if(un && med && !medUsada){
      // "XXX x XXX x XXX cm": uma medida por campo
      const antes2 = toks[j-1]&&toks[j-1].s==='x', depois2 = toks[j+1]&&toks[j+1].s==='x';
      if(antes2 || depois2) return;   // tratado abaixo (sequência de dimensões)
      const conv=med.vals.map(v=>vozConv(v, med.un||un, un));
      vals[tk.i]=conv.join(' x '); medUsada=true; return;
    }
    if(['no','na','em'].indexOf(prev)>=0){
      const lm=t.match(/\b((?:lobo|segmento|ter[çc]o|polo|c[oó]lon|parede|regi[aã]o|cadeia|bulbo|grupamento|seio)\s+[\wÀ-ÿ]+(?:\s+(?:direit[oa]|esquerd[oa]|superior|inferior|m[eé]dio|m[eé]dia|anterior|posterior))?)/i);
      if(lm){ vals[tk.i]=lm[1].toLowerCase(); return; }
      const pm=vozPancReg(t); if(pm && /pancrea/i.test(f.t)){ vals[tk.i]=pm; return; }
    }
    if(['parede','terco','lobo','grupamento','cadeia','nivel','polo','artéria','arteria','veia','espaco','regiao'].indexOf(prev)>=0){
      const re=new RegExp('\\b'+prev+'\\s+([a-z]+(?:\\s+(?:direit[oa]|esquerd[oa]|anterior|posterior|superior|inferior|medi[oa]|lateral|medial))?)');
      const mm=tn.match(re); if(mm && !VOZ_STOP.has(mm[1])) vals[tk.i]=mm[1];
    }
  }));
  // sequência "XXX x XXX x XXX cm"
  if(med && !medUsada){
    tpl.lines.forEach(toks=>{ for(let a=0;a+2<toks.length;a++){
      if(toks[a].t==='p' && toks[a+1].s==='x' && toks[a+2].t==='p'){
        const ids=[toks[a].i, toks[a+2].i]; let b=a+2; if(toks[b+1]&&toks[b+1].s==='x'&&toks[b+2]&&toks[b+2].t==='p'){ ids.push(toks[b+2].i); b+=2; }
        const un=((toks[b+1]&&toks[b+1].s)||'').match(/^(cm|mm)/); const u=un&&un[1];
        med.vals.slice(0,ids.length).forEach((v,k)=>{ vals[ids[k]]=vozConv(v, med.un||u, u); }); medUsada=true; return;
      } } });
  }
  return vals;
}

/* ---------- processamento ---------- */
function vozLog(txt, res, ok){ VOZ.log.unshift({txt, res, ok}); VOZ.log=VOZ.log.slice(0,(window.__vozLogMax||6)); vozRender(); }
function vozAbre(k){ const L=lauCur(); if(!L) return; L.open=k; lauRenderLeft(); setTimeout(()=>{ const el=document.querySelector('#lau-left .lau-it.open'); if(el) el.scrollIntoView({block:'nearest', behavior:'smooth'}); }, 30); }
function vozItensNav(m){ return m.items.filter(it=> m.oct ? lauOctOlho(it)==='d' : !lauItemOutroLado(m,it)); }
function vozProcessa(txtOrig){
  const L=lauCur(); if(!L) return; const m=lauModelo(L.model);
  const t=vozPrepara(txtOrig); const tn=vozNorm(t).trim().replace(/[.!?]+$/,'');
  if(!tn) return;
  // comandos
  if(/^(parar|pare|parar ditado|desligar microfone)$/.test(tn)){ vozParar(); vozLog(txtOrig,'microfone desligado',true); return; }
  if(/^(apagar|apaga|desfazer|desfaz|apagar ultimo|apague)$/.test(tn)){ vozDesfaz(); return; }
  if(/^(proximo|proximo item|item seguinte|seguinte)$/.test(tn) || /^(item anterior|anterior|voltar)$/.test(tn)){
    const its=vozItensNav(m); const i=its.findIndex(x=>x.k===L.open); const d=/anterior|voltar/.test(tn)?-1:1;
    const nx=its[Math.max(0, Math.min(its.length-1, (i<0 ? (d>0?0:its.length-1) : i+d)))];
    if(nx){ vozAbre(nx.k); vozLog(txtOrig,'→ '+(lauItemLabel(m,nx)||'item'),true); } return;
  }
  if(/^(conclusao|ir para conclusao|abrir conclusao)$/.test(tn)){ vozAbre('__conc'); vozLog(txtOrig,'→ conclusão',true); return; }
  const ab=tn.match(/^(abrir|abre|ir para|item)\s+(.+)$/);
  if(ab){ const it=vozAchaItem(m,' '+ab[2]+' '); if(it){ vozAbre(it.k); vozLog(txtOrig,'→ '+lauItemLabel(m,it),true); return; } }
  // achado: no item citado (ou no aberto); se não achar, procura em todos os itens
  let itOrg = vozAchaItem(m,' '+tn+' ');
  // OCT: cada item existe nos dois olhos; o ditado usa sempre o bloco do olho direito (o olho vai na própria frase)
  if(m.oct && itOrg && lauOctOlho(itOrg)!=='d'){ const lb=lauItemLabel(m,itOrg); itOrg = m.items.find(x=>lauOctOlho(x)==='d' && lauItemLabel(m,x)===lb) || itOrg; }
  const melhor = it0=>{ if(!it0) return null; const f=vozAchaFrase(m,it0,tn), c=vozAchaCtrl(m,it0,tn);
    const a = f && (!c || f.sc>=c.sc) ? {it:it0, f:f.f, sc:f.sc} : c ? {it:it0, c, sc:c.sc} : null; return a; };
  let ach = itOrg ? melhor(itOrg) : null;
  const citouOrgao = VOZ_ORG.some(([pal])=>pal.test(' '+tn+' '));   // falou um órgão que não existe neste laudo → texto livre
  if(!itOrg && !citouOrgao && (!ach || ach.sc<2)){
    // sem órgão citado: procura em todos os itens; o item aberto leva pequena vantagem
    // (com órgão citado, nunca pula para outro órgão — o que não for reconhecido vai como texto livre)
    let g=null; vozItensNav(m).forEach(x=>{ const a=melhor(x); if(!a) return; if(x.k===L.open) a.sc+=0.5; if(a.sc>=2.5 && (!g || a.sc>g.sc)) g=a; });
    if(g && (!ach || g.sc>ach.sc)) ach=g;
  }
  if(ach && ach.sc>=2 && ach.f){
    const it=ach.it, f=ach.f, i=f.i; const antes=(lauFraseList(it.k)||[]).slice();
    lauFraseToggle(it.k, i);
    const id=(lauFraseList(it.k)||[]).find(x=>antes.indexOf(x)<0);
    if(id){ L.v[it.k].__v['f'+id]=vozPreenche(f, tn, t); VOZ.hist.push({t:'frase', k:it.k, id});
      // OCT: olho falado ("no olho direito", "olho esquerdo", "ambos os olhos") vira o olho afetado da frase
      if(m.oct){ const olho = /ambos os olhos|nos dois olhos|bilateral/.test(tn) ? 'a' : /olho esquerdo|\boe\b/.test(tn) ? 'e' : /olho direito|\bod\b/.test(tn) ? 'd' : null;
        if(olho){ const bag=L.v[it.k].__v; bag['d'+id]=Object.assign({}, bag['d'+id]||{}, {olho}); } } }
    else VOZ.hist.push({t:'toggle', k:it.k, i});   // frase "substitui" já estava marcada: foi desmarcada
    L.open=it.k; lauRenderLeft(); lauPatch(it.k); lauUpdSum(it.k);
    vozLog(txtOrig, `${lauItemLabel(m,it)||'item'} → ${f.n}`, true); return;
  }
  if(ach && ach.sc>=2 && ach.c){
    const it=ach.it; const antes=vozAplicaCtrl(m, it, ach.c, tn, t);
    VOZ.hist.push({t:'ctrl', k:it.k, s:antes});
    L.open=it.k; lauRenderLeft(); lauPatch(it.k); lauUpdSum(it.k);
    const lb = ach.c.c.t==='radio' ? (ach.c.c.opts.find(o=>o[0]===ach.c.v)||[])[1] : ach.c.c.lbl;
    vozLog(txtOrig, `${lauItemLabel(m,it)||'item'} → ${lb}`, true); return;
  }
  const it=itOrg;
  // texto livre em "Achados adicionais"
  const frase = String(txtOrig).trim().replace(/^./,c=>c.toUpperCase()).replace(/([^.!?])$/,'$1.');
  const prev=L.obs||''; VOZ.hist.push({t:'obs', prev});
  lauSetObs(prev ? prev+'\n'+frase : frase); lauRenderLeft();
  vozLog(txtOrig, it ? `${lauItemLabel(m,it)}: achado não reconhecido → Achados adicionais` : 'texto livre → Achados adicionais', false);
}
function vozDesfaz(){
  const L=lauCur(); const h=VOZ.hist.pop(); if(!L || !h){ vozLog('apagar','nada para desfazer',false); return; }
  if(h.t==='frase') lauFraseDel(h.k, h.id);
  else if(h.t==='toggle') lauFraseToggle(h.k, h.i), lauRenderLeft(), lauPatch(h.k);
  else if(h.t==='obs'){ lauSetObs(h.prev); lauRenderLeft(); }
  else if(h.t==='ctrl'){ L.v[h.k]=h.s; lauRenderLeft(); lauPatch(h.k); lauUpdSum(h.k); }
  vozLog('apagar','último ditado desfeito',true);
}

/* ---------- microfone ---------- */
function vozIniciar(){
  if(!VOZ_SR){ VOZ.erro='Este navegador não tem reconhecimento de voz. Use o Chrome, o Edge ou o Safari — ou digite a frase abaixo.'; vozRender(); return; }
  if(!VOZ.rec){
    const r=new VOZ_SR(); r.lang='pt-BR'; r.continuous=true; r.interimResults=true;
    r.onresult=e=>{ if(!document.getElementById('lau-voz')){ vozParar(); return; } let interim='';
      for(let i=e.resultIndex;i<e.results.length;i++){ const res=e.results[i];
        if(res.isFinal) vozProcessa(res[0].transcript); else interim+=res[0].transcript; }
      VOZ.interim=interim; vozRenderInterim(); };
    r.onerror=e=>{
      const M={ 'not-allowed':'Microfone bloqueado. Toque no ícone ao lado do endereço do site (cadeado/ajustes) → Microfone → Permitir, e recarregue a página.',
        'service-not-allowed':'O navegador não liberou o serviço de voz (comum no Brave). Use o Chrome ou o Edge.',
        'network':'Sem conexão com o serviço de voz do navegador (rede, VPN ou firewall).',
        'audio-capture':'Nenhum microfone encontrado — confira se está conectado e não está em uso por outro programa.' };
      if(e.error==='no-speech' || e.error==='aborted') return;
      VOZ.erro = (M[e.error] || 'Erro no reconhecimento: '+e.error) + ' Diagnóstico completo em /teste-voz.';
      if(e.error!=='network') VOZ.on=false;
      vozRender(); };
    r.onend=()=>{ if(VOZ.on){ try{ r.start(); }catch(_){ } } else { VOZ.interim=''; vozRender(); } };   // o navegador encerra após silêncio: religa
    VOZ.rec=r;
  }
  VOZ.on=true; VOZ.erro=''; try{ VOZ.rec.start(); }catch(_){ } vozRender();
}
function vozParar(){ VOZ.on=false; try{ VOZ.rec && VOZ.rec.stop(); }catch(_){ } VOZ.interim=''; vozRender(); }
function vozToggle(){ VOZ.on ? vozParar() : vozIniciar(); }
function vozDigitado(ev){ if(ev && ev.key!=='Enter') return; const el=document.getElementById('voz-txt'); if(!el || !el.value.trim()) return; const v=el.value; el.value=''; vozProcessa(v); }

/* ---------- painel ---------- */
function vozHTML(){
  const L=state.lau; if(L && VOZ.model!==L.model){ VOZ.model=L.model; VOZ.log=[]; VOZ.hist=[]; VOZ.interim=''; }   // laudo novo: histórico limpo
  const mic=`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`;
  return `<div class="voz ${VOZ.on?'on':''}">
    <div class="voz-top">
      <button type="button" class="voz-mic ${VOZ.on?'on':''}" onclick="vozToggle()" title="${VOZ.on?'Parar ditado':'Ditar por voz'}">${mic}<span>${VOZ.on?'Ouvindo… toque para parar':'Ditar'}</span></button>
      <input id="voz-txt" class="lau-txt voz-in" type="text" placeholder='ou digite: "hemangioma hepático de 1,1 x 1,2 cm"' onkeydown="vozDigitado(event)">
    </div>
    <div class="voz-int" id="voz-int">${esc(VOZ.interim||'')}</div>
    ${VOZ.erro?`<div class="voz-err">${esc(VOZ.erro)}</div>`:''}
    ${VOZ.log.length?`<div class="voz-log">${VOZ.log.map(x=>`<div class="voz-li ${x.ok?'ok':'free'}"><span class="voz-q">“${esc(x.txt)}”</span><span class="voz-r">${esc(x.res)}</span></div>`).join('')}</div>`:''}
    <details class="voz-help"><summary>Como ditar</summary>
      <div>Diga o órgão e o achado com as medidas: <i>“hemangioma hepático no segmento 7 de 1,1 x 1,2 cm”</i>, <i>“cisto no rim direito de 2 cm”</i>, <i>“esteatose moderada”</i>. O achado entra na frase da biblioteca do item, com a conclusão automática; o que não for reconhecido vai para “Achados adicionais”.<br>
      Comandos: <b>próximo item</b>, <b>item anterior</b>, <b>abrir fígado</b>, <b>conclusão</b>, <b>apagar</b> (desfaz o último), <b>parar</b>.<br>
      <b>Não dite nome nem dados do paciente</b> — no Chrome o áudio é processado pelos servidores do Google.</div>
    </details>
  </div>`;
}
function vozRender(){ const el=document.getElementById('lau-voz'); if(el) el.innerHTML=vozHTML(); }
function vozRenderInterim(){ const el=document.getElementById('voz-int'); if(el) el.textContent=VOZ.interim||''; }
