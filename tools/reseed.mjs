// Re-seed pontual da tabela referencias com os itens do seed (modelo novo).
// Requer a política de escrita temporária ATIVA. Roda via chave publishable.
import fs from 'node:fs';
const SUPA = 'https://mcqtxelqgvwomxhslqdq.supabase.co';
const KEY = 'sb_publishable_tKekItUKXUYVnGgZulRmSg_mXDN48fq';
const rows = JSON.parse(fs.readFileSync('/tmp/rows.json', 'utf8'));

const res = await fetch(`${SUPA}/rest/v1/referencias`, {
  method: 'POST',
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
  body: JSON.stringify(rows),
});
console.log('POST status:', res.status, res.statusText);
if (!res.ok) { console.log('erro:', (await res.text()).slice(0, 600)); process.exit(1); }

const r2 = await fetch(`${SUPA}/rest/v1/referencias?select=id`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'count=exact', Range: '0-0' },
});
console.log('count (content-range):', r2.headers.get('content-range'));
