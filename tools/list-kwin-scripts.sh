#!/usr/bin/env bash
set -euo pipefail

if ! command -v kpackagetool6 >/dev/null 2>&1; then
  echo "Error: kpackagetool6 not found." >&2
  exit 1
fi

echo "User-installed KWin scripts:"
kpackagetool6 --type=KWin/Script --list || true

echo
echo "System/global KWin scripts:"
kpackagetool6 --type=KWin/Script --list --global || true
