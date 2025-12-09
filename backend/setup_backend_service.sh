#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
backend_dir="$project_root/backend"
venv_path="${VENV_PATH:-$project_root/.venv}"
uv_bin="${UV_BIN:-$(command -v uv || true)}"

install_uv() {
  if [[ -n "$uv_bin" ]]; then
    return
  fi
  curl -LsSf https://astral.sh/uv/install.sh | sh
  uv_bin="$(command -v uv || true)"
  if [[ -z "$uv_bin" ]]; then
    printf "uv installation failed. Install uv and rerun.\n" >&2
    exit 1
  fi
}

main() {
  install_uv
  cd "$project_root"
  "$uv_bin" venv .venv
  source .venv/bin/activate
  cd "$backend_dir"
  "$uv_bin" sync --active
}

main "$@"
