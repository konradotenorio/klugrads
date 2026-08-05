// Verifica paridade: dados no Supabase (via REST, chave pública) == seed.generated.json
import fs from 'node:fs';

const SUPA_URL = 'https://mcqtxelqgvwomxhslqdq.supabase.co';
const KEY = 'sb_publishable_tKekItUKXUYVnGgZulRmSg_mXDN48fq';
const seed = JSON.parse(fs.readFileSync(new URL('../db/seed.generated.json', import.meta.url), 'utf8'));

const endpoint = `${SUPA_URL}/rest/v1/referencias?select=conteudo&order=sort_order.asc`;
const res = await fetch(endpoint, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
console.log('HTTP', res.status, res.statusText);
if (!res.ok) { console.log('corpo:', await res.text()); process.exit(1); }

const rows = await res.json();
const got = rows.map((r) => r.conteudo);
console.log('linhas no banco:', got.length, '| seed:', seed.length);

// Canonicaliza: ordena chaves de objetos recursivamente (jsonb não preserva
// ordem de chaves), mas mantém a ordem dos arrays (que é significativa).
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    return Object.keys(v).sort().reduce((o, k) => { o[k] = canon(v[k]); return o; }, {});
  }
  return v;
}

let diffs = 0;
for (let i = 0; i < Math.max(seed.length, got.length); i++) {
  const a = JSON.stringify(canon(seed[i]));
  const b = JSON.stringify(canon(got[i]));
  if (a !== b) {
    diffs++;
    console.log('DIFF idx', i, seed[i]?.id, '!=', got[i]?.id);
    console.log('  seed:', a);
    console.log('  banco:', b);
  }
}
console.log(diffs === 0 && got.length === seed.length
  ? '✅ PARIDADE PERFEITA: banco == app'
  : `❌ ${diffs} diferença(s)`);
process.exit(diffs === 0 && got.length === seed.length ? 0 : 1);
