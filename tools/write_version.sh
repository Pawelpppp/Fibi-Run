#!/usr/bin/env bash
# Zapisuje version.js: window.FIBI_VERSION='1.N' (N = liczba commitów na HEAD).
# --pre-commit: N+1, bo hook odpala się przed utworzeniem commita.
set -euo pipefail
ROOT=$(git rev-parse --show-toplevel)
N=$(git -C "$ROOT" rev-list --count HEAD)
if [[ "${1:-}" == "--pre-commit" ]]; then
  N=$((N + 1))
fi
SHA=$(git -C "$ROOT" rev-parse --short HEAD)
cat > "$ROOT/version.js" <<JS
window.FIBI_VERSION='1.${N}';
window.FIBI_VERSION_SHA='${SHA}';
JS
echo "1.${N} (${SHA})"
