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
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_PATH="${REPO_ROOT}/scripts/kwin/${SCRIPT_ID}"

if [[ ! -f "${SCRIPT_PATH}/metadata.json" ]]; then
  echo "Error: missing ${SCRIPT_PATH}/metadata.json" >&2
  exit 1
fi

if [[ ! -f "${SCRIPT_PATH}/contents/code/main.js" ]]; then
  echo "Error: missing ${SCRIPT_PATH}/contents/code/main.js" >&2
  exit 1
fi

if ! command -v kpackagetool6 >/dev/null 2>&1; then
  echo "Error: kpackagetool6 not found. Install KDE Plasma/KPackage tools." >&2
  exit 1
fi

if ! command -v kwriteconfig6 >/dev/null 2>&1; then
  echo "Error: kwriteconfig6 not found. Install KDE Plasma config tools." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 not found. It is required to validate metadata.json." >&2
  exit 1
fi

metadata_value() {
  local key_path="$1"
  python3 - "$SCRIPT_PATH/metadata.json" "$key_path" <<'PY'
import json
import sys

metadata_path, key_path = sys.argv[1], sys.argv[2]
with open(metadata_path, "r", encoding="utf-8") as metadata_file:
    value = json.load(metadata_file)

for key in key_path.split("."):
    value = value[key]

print(value)
PY
}

METADATA_ID="$(metadata_value "KPlugin.Id")"
SCRIPT_NAME="$(metadata_value "KPlugin.Name")"

if [[ "${METADATA_ID}" != "${SCRIPT_ID}" ]]; then
  echo "Error: KPlugin.Id (${METADATA_ID}) must match package folder (${SCRIPT_ID})." >&2
  exit 1
fi

run_kwin_reconfigure() {
  if command -v qdbus >/dev/null 2>&1; then
    qdbus org.kde.KWin /KWin reconfigure || true
  elif command -v qdbus6 >/dev/null 2>&1; then
    qdbus6 org.kde.KWin /KWin reconfigure || true
  else
    echo "Warning: qdbus/qdbus6 not found. Log out/in or restart KWin if the script does not appear." >&2
  fi
}

echo "Installing KWin script: ${SCRIPT_ID}"
if ! kpackagetool6 --type=KWin/Script -i "${SCRIPT_PATH}"; then
  echo "Install did not complete; trying upgrade for an existing package." >&2
  kpackagetool6 --type=KWin/Script -u "${SCRIPT_PATH}"
fi

echo "Enabling KWin script: ${SCRIPT_ID}"
kwriteconfig6 --file kwinrc --group Plugins --key "${SCRIPT_ID}Enabled" true
run_kwin_reconfigure

echo "Done. Check: System Settings > Window Management > KWin Scripts"
echo "Then bind ${SCRIPT_NAME} in: System Settings > Keyboard > Shortcuts > System Services > Window Management"
echo "If the shortcut search does not find ${SCRIPT_NAME}, open Window Management and search for: Tile top"
