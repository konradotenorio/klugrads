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

## Adaptações em relação ao original (a lógica de cálculo é idêntica; testado com o mesmo roteiro nos dois)
**Funcionais**
1. **Sem imagem de exemplo**: botão "Analisar um exemplo", o código dele e a cópia de `example.tif` foram removidos
   (nenhuma imagem médica é hospedada). Testes e2e removidos por dependerem dela.
2. **Rodando em `/idade-ossea/`**: `main.ts` usa `import.meta.env.BASE_URL`; favicon usa `%BASE_URL%`.
3. **Só computador**: `src/klugrads.ts` + CSS escondem o app em celular/tablet e mostram a explicação; o service worker não é registrado lá.
4. **Nomes de cache/armazenamento** no namespace `klugrads-idade-ossea-*`; idioma na chave `radref_lang` e tema na `radref_theme` (as mesmas do app).
5. **vercel.json**: rota `/idade-ossea` com CSP própria e rewrite para o `index.html`.

**Visuais / textos (a "cara" do KlugRads)**
6. `src/tokens.css`: paleta do app (escuro padrão + claro); todas as cores do CSS viraram variáveis (`style.css`); bloco "Pele KlugRads" no fim do `style.css`.
7. Barra superior com marca KLUG|RADS, trilha "Radiografia › Calculadoras › Idade óssea (IA)", bandeiras BR/EUA (SVG) e botão sol/lua.
8. Aviso de uso educativo/de teste, créditos no rodapé (Ian Pan, @feliperun, licenças) e rodapé do KlugRads.
9. Textos: título da aba, "Sem cadastro" removido da apresentação, rodapé, nome do PDF.
10. PDF: paleta teal do KlugRads, nome "KlugRads · idade óssea", endereço `klugrads.com/idade-ossea`; chamada "GRATUITO · SEM CADASTRO" → "USO EDUCATIVO".
11. Link "Código aberto" do topo removido (o crédito fica no rodapé); chaves de i18n do exemplo removidas.

## Trocar o endereço dos pesos / recompilar
1. Edite `weights-base.txt` (termina com `/`; os arquivos ficam em `<base>models/…`).
2. `tools/idade-ossea/build.sh` (Node 22): instala, checa tipos, roda os 85 testes, compila e publica em `idade-ossea/`.
3. Coloque a **origem** do endereço no `connect-src` das regras `/idade-ossea` de `vercel.json`.
4. Commit.

## Ideias para depois
Marca própria no cabeçalho do PDF, barra lateral de navegação como no app, tamanho de fonte ajustável (como em Configurações do app)
e revisar textos do FAQ/"Como funciona" com a voz do KlugRads. Ao mexer em qualquer texto que fale de "gratuito", ver a pendência dos Termos (site pago).
