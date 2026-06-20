# RadRef — Referências em Ultrassonografia

App de **referência rápida em ultrassonografia** (medidas normais, técnica de exame,
calculadoras e referências bibliográficas). PWA instalável no celular e no desktop,
funciona **offline**, com conteúdo servido pelo **Supabase**.

> ⚠️ **Ferramenta educacional.** Os valores são referências da literatura e **não
> substituem o julgamento clínico**. Sempre confirme com a fonte primária citada.

---

## Stack

- **Front-end:** HTML + CSS + JavaScript puro (sem build, sem framework).
- **PWA:** `manifest.webmanifest` + `sw.js` (service worker, offline-first).
- **Banco de dados:** [Supabase](https://supabase.com) (Postgres) — tabela `referencias`,
  leitura pública via Row Level Security (RLS).
- **Hospedagem:** [Vercel](https://vercel.com) (site estático, deploy automático a cada push).

## Estrutura

```
index.html                 # shell do app + estilos + meta tags PWA
js/config.js               # URL + chave pública do Supabase (anon/publishable)
js/seed.js                 # dados embarcados (fonte da verdade + fallback OFFLINE)
js/app.js                  # lógica de render, cálculos e sync com o Supabase
sw.js                      # service worker (cache offline)
manifest.webmanifest       # manifesto PWA
icons/                     # ícones do app (gerados a partir de icons/icon.svg)
db/
  seed.generated.json      # snapshot do seed (gerado a partir de js/seed.js)
tools/verify-seed.mjs      # confere que o banco == seed
vercel.json                # headers/config de deploy
```

## Como os dados funcionam

1. Ao abrir, o app mostra **imediatamente** os dados embarcados (`js/seed.js`) ou o
   último cache — então funciona **sem internet**.
2. Em segundo plano, busca a versão fresca da tabela `referencias` no Supabase e
   re-renderiza. O resultado fica em cache (localStorage + service worker) para o
   próximo carregamento offline.
3. As **calculadoras** (idade gestacional, volumes) e os **ícones** são lógica/asset
   do app (`js/app.js`), ligados a cada item pelo `id`. Por isso o conteúdo no banco é
   100% serializável (sem funções).

### Editar o conteúdo

- **Rápido (recomendado):** edite na tabela `referencias` do painel do Supabase
  (coluna `conteudo`, em JSON). A mudança aparece no app no próximo carregamento.
- **No código:** edite `js/seed.js`, regenere o snapshot e re-popule o banco:
  ```bash
  node -e "require('./js/seed.js');require('fs').writeFileSync('db/seed.generated.json',JSON.stringify(globalThis.SEED_DATA))"
  node tools/verify-seed.mjs   # confere paridade banco x app
  ```

## Rodar localmente

O app usa caminhos absolutos (`/js/...`, `/sw.js`), então sirva a partir da raiz:

```bash
python3 -m http.server 5173
# abra http://localhost:5173
```

## Deploy

Hospedado na Vercel como site estático (sem etapa de build). Cada `git push` na
branch principal dispara um novo deploy automaticamente.

## Banco de dados (Supabase)

- Projeto: **medultra** (`sa-east-1`).
- Tabela `referencias`: `id`, `grupo`, `regiao`, `nome`, `abbr`, `sort_order`,
  `conteudo` (jsonb), `updated_at`.
- **RLS:** somente leitura pública (`select`). Escrita só pelo painel/admin.
- A chave em `js/config.js` é a **publishable/anon** — pública por design. A
  `service_role` key é secreta e **nunca** deve ir para o repositório.

## Licença

Projeto pessoal / educacional.
