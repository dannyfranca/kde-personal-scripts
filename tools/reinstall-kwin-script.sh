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

"${REPO_ROOT}/tools/uninstall-kwin-script.sh" "${SCRIPT_ID}" || true
"${REPO_ROOT}/tools/install-kwin-script.sh" "${SCRIPT_ID}"
