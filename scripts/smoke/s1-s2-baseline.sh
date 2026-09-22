#!/usr/bin/env bash
# Smoke baseline S1 (Abertura) e S2 (Abas) — docs/TDD.md secao 3/4.
# Roda no simulador iOS via idb, contra o Expo Go ja aberto com o projeto
# (yarn start rodando, app carregado). Nao toca CI: so local, macOS.
#
# Requisitos: idb, idb_companion, jq, um simulador booted com Expo Go
# rodando o projeto (host.exp.Exponent). Screenshot via `xcrun simctl io`
# (mais confiavel que `idb screenshot`, que falhou neste sandbox).
#
# Uso:
#   scripts/smoke/s1-s2-baseline.sh
#   SMOKE_UDID=<udid> scripts/smoke/s1-s2-baseline.sh   # simulador especifico
set -euo pipefail

UDID="${SMOKE_UDID:-}"
if [ -z "$UDID" ]; then
  UDID=$(idb list-targets 2>/dev/null | grep -i 'Booted' | head -1 | awk -F'|' '{print $2}' | tr -d ' ')
fi
if [ -z "$UDID" ]; then
  echo "Nenhum simulador booted. Abra um simulador e o Expo Go com o projeto antes de rodar." >&2
  exit 1
fi

OUT_DIR="${SMOKE_OUT_DIR:-docs/qa-prints/$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"
echo "== Smoke S1/S2 (idb) == UDID=$UDID  saida=$OUT_DIR"

# GPS em Curitiba (Praca Tiradentes), como o cenario S1 pede.
xcrun simctl location "$UDID" set -25.4284,-49.2733

# Toca um elemento pelo AXUniqueId (testID), lendo a arvore de acessibilidade
# atual e tocando no centro do frame. Falha (retorno != 0) sem derrubar o
# script inteiro — cada cenario reporta o proprio resultado.
tap_by_id() {
  local id="$1" json frame x y w h tx ty
  json=$(idb ui describe-all --udid "$UDID")
  frame=$(echo "$json" | jq -r --arg id "$id" '[.[] | select(.AXUniqueId == $id)][0].frame // empty')
  if [ -z "$frame" ]; then
    echo "  [FALHA] elemento '$id' nao encontrado na arvore de acessibilidade" >&2
    return 1
  fi
  x=$(echo "$frame" | jq -r '.x'); y=$(echo "$frame" | jq -r '.y')
  w=$(echo "$frame" | jq -r '.width'); h=$(echo "$frame" | jq -r '.height')
  tx=$(awk "BEGIN{printf \"%.0f\", $x + $w/2}")
  ty=$(awk "BEGIN{printf \"%.0f\", $y + $h/2}")
  idb ui tap --udid "$UDID" "$tx" "$ty"
}

echo "-- S1: abertura --"
idb ui describe-all --udid "$UDID" > "$OUT_DIR/s1-tree.json"
xcrun simctl io "$UDID" screenshot "$OUT_DIR/s1-abertura.png"
if grep -q '"AXUniqueId":"tab-bar-map"' "$OUT_DIR/s1-tree.json" \
   && grep -q '"AXUniqueId":"map-live-indicator"' "$OUT_DIR/s1-tree.json"; then
  echo "  [OK] aba Mapa visivel e indicador de onibus ao vivo presente"
else
  echo "  [FALHA] aba Mapa ou indicador de onibus ao vivo ausente — ver $OUT_DIR/s1-tree.json" >&2
fi

echo "-- S2: abas (Mapa, Linhas, Como Ir, Favoritos) --"
for pair in "tab-bar-map:mapa" "tab-bar-lines:linhas" "tab-bar-routes:como-ir" "tab-bar-favorites:favoritos"; do
  id="${pair%%:*}"; slug="${pair##*:}"
  echo "  tocando $id"
  if tap_by_id "$id"; then
    sleep 1
    xcrun simctl io "$UDID" screenshot "$OUT_DIR/s2-$slug.png"
    idb ui describe-all --udid "$UDID" > "$OUT_DIR/s2-$slug-tree.json"
  fi
done

echo "== Concluido. Screenshots e arvores de acessibilidade em $OUT_DIR (fora do git, ver .gitignore) =="
echo "== Confira cada screenshot: titulo da aba visivel, sem tela em branco/erro =="
