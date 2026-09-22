#!/usr/bin/env bash
# Valida o título do commit contra o padrão do repositório:
#
#   tipo(escopo): resumo no imperativo
#
# Chamado pelo hook commit-msg (via lefthook) e pelo CI nos commits do PR.
# Pular uma vez: LEFTHOOK=0 git commit
set -euo pipefail

TYPES='feat|fix|refactor|test|chore|docs|style|perf|build|ci|revert'
MAX=72

# Argumento: arquivo da mensagem (hook) ou a mensagem em si (CI, via --text).
if [ "${1:-}" = "--text" ]; then
  title=$(printf '%s' "${2:-}" | head -n 1)
else
  title=$(grep -v '^#' "${1:?arquivo da mensagem nao informado}" | sed '/^[[:space:]]*$/d' | head -n 1)
fi

fail() {
  echo "✗ título fora do padrão: $title" >&2
  echo "  $1" >&2
  echo >&2
  echo "  formato:  tipo(escopo): resumo no imperativo" >&2
  echo "  tipos:    ${TYPES//|/ }" >&2
  echo "  exemplo:  fix(championship): discount the recorded score, not the new one" >&2
  exit 1
}

# Commits que o git gera sozinho não passam pela regra.
case "$title" in
  Merge*|Revert*|fixup!*|squash!*|Initial\ commit) exit 0 ;;
esac

[ -n "$title" ] || fail "mensagem vazia."

echo "$title" | grep -qE "^($TYPES)(\([a-z0-9._/-]+\))?!?: .+" \
  || fail "falta o prefixo tipo(escopo): — ou o tipo não é um dos aceitos."

summary=${title#*: }
[ ${#title} -le $MAX ] || fail "título com ${#title} caracteres; o limite é $MAX."
[ "${summary%.}" = "$summary" ] || fail "o resumo não pode terminar com ponto."

# `\l` do sed é GNU; no BSD do macOS não existe. Glob resolve nos dois.
case "$summary" in
  [A-Z]*) fail "o resumo deve começar com minúscula." ;;
esac
