#!/usr/bin/env bash
# Instaluje tools/pre-commit jako hook w tym klonie (.git/hooks/pre-commit).
set -euo pipefail
ROOT=$(git rev-parse --show-toplevel)
HOOK="$ROOT/.git/hooks/pre-commit"
mkdir -p "$ROOT/.git/hooks"
ln -sfn ../../tools/pre-commit "$HOOK"
chmod +x "$ROOT/tools/pre-commit" "$ROOT/tools/write_version.sh"
echo "Zainstalowano hook: $HOOK -> ../../tools/pre-commit"
