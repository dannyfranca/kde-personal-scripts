#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <kwin-script-id>" >&2
  echo "Example: $0 smart-meta-up" >&2
}

if [[ $# -ne 1 ]]; then
  usage
  exit 2
fi

SCRIPT_ID="$1"

if ! command -v kpackagetool6 >/dev/null 2>&1; then
  echo "Error: kpackagetool6 not found." >&2
  exit 1
fi

if ! command -v kwriteconfig6 >/dev/null 2>&1; then
  echo "Error: kwriteconfig6 not found." >&2
  exit 1
fi

run_kwin_reconfigure() {
  if command -v qdbus >/dev/null 2>&1; then
    qdbus org.kde.KWin /KWin reconfigure || true
  elif command -v qdbus6 >/dev/null 2>&1; then
    qdbus6 org.kde.KWin /KWin reconfigure || true
  else
    echo "Warning: qdbus/qdbus6 not found. Log out/in or restart KWin if needed." >&2
  fi
}

echo "Disabling KWin script: ${SCRIPT_ID}"
kwriteconfig6 --file kwinrc --group Plugins --key "${SCRIPT_ID}Enabled" false

echo "Removing KWin script package: ${SCRIPT_ID}"
if kpackagetool6 --type=KWin/Script --show "${SCRIPT_ID}" >/dev/null 2>&1; then
  kpackagetool6 --type=KWin/Script -r "${SCRIPT_ID}"
else
  echo "Package is not installed: ${SCRIPT_ID}"
fi

run_kwin_reconfigure

echo "Done."
