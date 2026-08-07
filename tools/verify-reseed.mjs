import fs from 'node:fs';
const SUPA = 'https://mcqtxelqgvwomxhslqdq.supabase.co';
const KEY = 'sb_publishable_tKekItUKXUYVnGgZulRmSg_mXDN48fq';
globalThis.window = globalThis;
await import('../db/seed.js');
const seed = globalThis.SEED_DATA;

function canon(v){
  if(Array.isArray(v)) return v.map(canon);
  if(v && typeof v==='object') return Object.keys(v).sort().reduce((o,k)=>{o[k]=canon(v[k]);return o;},{});
  return v;
}
const res = await fetch(`${SUPA}/rest/v1/referencias?select=conteudo&order=sort_order.asc`, { headers:{ apikey:KEY, Authorization:`Bearer ${KEY}` }});
const rows = await res.json();
const got = rows.map(r=>r.conteudo);
console.log('HTTP', res.status, '| banco:', got.length, '| seed:', seed.length);
let diffs=0;
for(let i=0;i<Math.max(seed.length,got.length);i++){
  if(JSON.stringify(canon(seed[i]))!==JSON.stringify(canon(got[i]))){ diffs++; console.log('DIFF', i, seed[i]?.id, got[i]?.id); }
}
console.log(diffs===0 && got.length===seed.length ? '✅ PARIDADE PERFEITA: banco == seed (61)' : `❌ ${diffs} diferença(s)`);

// escrita anônima deve estar BLOQUEADA
const w = await fetch(`${SUPA}/rest/v1/referencias`, {
  method:'POST', headers:{ apikey:KEY, Authorization:`Bearer ${KEY}`, 'Content-Type':'application/json' },
  body: JSON.stringify({ id:'x-test', grupo:'x', nome:'x', sort_order:999, conteudo:{} })
});
console.log(w.status===401||w.status===403 ? '✅ escrita anônima BLOQUEADA (RLS ok)' : `⚠️ escrita retornou ${w.status} — revisar!`);
