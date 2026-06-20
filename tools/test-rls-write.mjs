// Confirma que a chave publishable/anon NÃO consegue escrever (RLS bloqueia).
const SUPA_URL = 'https://ulmosuquzrkzsrmszexr.supabase.co';
const KEY = 'sb_publishable_LmS-FkJRp6a2ReFp494d_Q_h6FuDAdp';

const res = await fetch(`${SUPA_URL}/rest/v1/referencias`, {
  method: 'POST',
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify({ id: 'rls-test-DELETE-ME', grupo: 'x', nome: 'x', sort_order: 999, conteudo: { id: 'x' } }),
});

console.log('POST (insert) status:', res.status, res.statusText);
console.log('resposta:', (await res.text()).slice(0, 300));
console.log(
  res.status === 401 || res.status === 403
    ? '✅ ESCRITA BLOQUEADA pelo RLS (esperado)'
    : '⚠️ ATENÇÃO: escrita NÃO bloqueada — revisar policies!'
);
