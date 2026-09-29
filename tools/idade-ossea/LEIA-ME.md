# Idade óssea — como o app é feito e mantido

`/idade-ossea` é uma **cópia adaptada** do aplicativo de código aberto `feliperun/bone-age`
(licença MIT, commit `625898a`), que executa o modelo `ianpan/bone-age` (Ian Pan, Apache-2.0)
no navegador. Créditos e licenças: rodapé da página, `licencas/` e `app/LICENSE`.

## Pastas
- `app/` — código-fonte (Vite + TypeScript) copiado do original + as adaptações abaixo. **Não vai ao ar.**
- `../../idade-ossea/` — resultado compilado (é o que a Vercel serve). Gerado por `build.sh`. **Não edite à mão.**
- `export_model.py`, `requirements.txt` — exportam as 3 redes para ONNX (copiados do original).
- `weights-base.txt` — endereço público dos pesos (R2). `build.sh` embute esse endereço no app.
- `pagina-klugrads/` — a primeira página própria (sem uso hoje), guardada para reaproveitar ideias (leitura de DICOM, etc.).

## Adaptações em relação ao original (tudo o mais é idêntico)
1. **Sem imagem de exemplo**: botão "Analisar um exemplo", o código dele e a cópia de `example.tif` foram removidos
   (nenhuma imagem médica é hospedada). Testes e2e removidos por dependerem dela.
2. **Rodando em `/idade-ossea/`**: `main.ts` usa `import.meta.env.BASE_URL` para a base; favicon e link da marca usam `%BASE_URL%`.
3. **Só computador**: `src/klugrads.ts` + CSS escondem o app em celular/tablet e mostram a explicação; o service worker não é registrado lá.
4. **Barra do KlugRads** (voltar ao app + aviso de uso educativo/de teste) e **crédito no rodapé** (`klug.*` em `i18n.ts`, pt/en).
5. **Link "Código aberto" do topo removido** (o crédito fica no rodapé).
6. **PDF**: endereço/nome do site → `klugrads.com`; linha de crédito do código reescrita; chamada "GRATUITO · SEM CADASTRO" → "USO EDUCATIVO".
7. **FAQ** "Funciona sem internet?": os pesos vêm do servidor de arquivos do KlugRads (não do GitHub).
8. `vercel.json`: rota `/idade-ossea` com CSP própria + rewrite para o `index.html`.

## Trocar o endereço dos pesos / recompilar
1. Edite `weights-base.txt` (termina com `/`; os arquivos ficam em `<base>models/…`).
2. `tools/idade-ossea/build.sh` (Node 22): instala, checa tipos, roda os 85 testes, compila e publica em `idade-ossea/`.
3. Coloque a **origem** do endereço no `connect-src` das regras `/idade-ossea` de `vercel.json`.
4. Commit.

## Ainda sem "cara" do KlugRads (de propósito, primeiro igual ao original)
Marca "bone age", cores/tipografia, textos como "Sem cadastro. Sem rastreamento." na página inicial e o nome do
cache/SW (`bone-age-…`). Ao ajustar textos que digam "gratuito/sem cadastro", ver a pendência dos Termos (site pago).
