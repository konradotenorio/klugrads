#!/usr/bin/env bash
# Constrói o app de idade óssea (copia adaptada de feliperun/bone-age, MIT) e publica em /idade-ossea.
# Uso: tools/idade-ossea/build.sh   (precisa de Node 22)
# O endereço público dos pesos vem de tools/idade-ossea/weights-base.txt (termina com '/').
# Depois de mudar o endereço: rode este script, ajuste `connect-src` em vercel.json e faça commit.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
base="$(tr -d '[:space:]' < "$here/weights-base.txt")"
case "$base" in */) ;; *) echo "weights-base.txt deve terminar com /" >&2; exit 1;; esac
case "$base" in *.invalid/*) echo "AVISO: weights-base.txt ainda é o endereço provisório; o app compilado não baixará o modelo." >&2;; esac
cd "$here/app"
npm ci --no-audit --no-fund
npx tsc --noEmit
npx vitest run tests/
VITE_WEIGHTS_BASE="$base" npx vite build --base=/idade-ossea/
rm -rf "$root/idade-ossea"
cp -r dist "$root/idade-ossea"
echo "Publicado em $root/idade-ossea (pesos: $base). Origem para connect-src: $(printf '%s' "$base" | sed -E 's#^(https?://[^/]+).*#\1#')"
