#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KWIN_DIR="${REPO_ROOT}/scripts/kwin"

if [[ ! -d "${KWIN_DIR}" ]]; then
  echo "No KWin scripts directory found: ${KWIN_DIR}" >&2
  exit 1
fi

found=0
for script_path in "${KWIN_DIR}"/*; do
  [[ -d "${script_path}" ]] || continue
  script_id="$(basename "${script_path}")"
  found=1
  "${REPO_ROOT}/tools/install-kwin-script.sh" "${script_id}"
done

if [[ "${found}" -eq 0 ]]; then
  echo "No KWin scripts found in ${KWIN_DIR}" >&2
fi
