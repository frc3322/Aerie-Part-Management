#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
backend_dir="$project_root/backend"
venv_path="${VENV_PATH:-$project_root/.venv}"
service_name="${SERVICE_NAME:-part-management-backend.service}"
service_file="/etc/systemd/system/$service_name"
service_user="${SERVICE_USER:-$(whoami)}"
service_group="${SERVICE_GROUP:-$service_user}"
service_port="${SERVICE_PORT:-5000}"
service_mode="${SERVICE_MODE:-prod-multi}"
uv_bin="${UV_BIN:-$(command -v uv || true)}"
sudo_bin=""
[[ $EUID -ne 0 ]] && sudo_bin="sudo"

require_command() {
  local binary_name="$1"
  local help_hint="$2"
  if ! command -v "$binary_name" >/dev/null 2>&1; then
    printf "Missing required command: %s. %s\n" "$binary_name" "$help_hint" >&2
    exit 1
  fi
}

install_uv() {
  if [[ -n "$uv_bin" ]]; then
    return
  fi
  require_command curl "Install curl from your package manager."
  if [[ -n "$sudo_bin" ]]; then
    curl -LsSf https://astral.sh/uv/install.sh | $sudo_bin sh
  else
    curl -LsSf https://astral.sh/uv/install.sh | sh
  fi
  uv_bin="$(command -v uv || true)"
  if [[ -z "$uv_bin" ]]; then
    printf "uv installation failed. Install uv and rerun.\n" >&2
    exit 1
  fi
}

ensure_directories() {
  if [[ ! -d "$backend_dir" ]]; then
    printf "Backend directory not found at %s\n" "$backend_dir" >&2
    exit 1
  fi
}

create_virtualenv() {
  "$uv_bin" venv "$venv_path"
}

install_requirements() {
  (cd "$backend_dir" && UV_PROJECT_ENVIRONMENT="$venv_path" "$uv_bin" sync --frozen --extra wsgi)
}

write_service_file() {
  $sudo_bin install -d -m 755 "$(dirname "$service_file")"
  cat <<EOF | $sudo_bin tee "$service_file" >/dev/null
[Unit]
Description=Part Management System Backend
After=network.target

[Service]
Type=simple
User=$service_user
Group=$service_group
WorkingDirectory="$backend_dir"
Environment="PATH=$venv_path/bin:\$PATH"
Environment="VIRTUAL_ENV=$venv_path"
Environment="PORT=$service_port"
ExecStart="$uv_bin" run python "$backend_dir/deploy.py" "$service_mode" --port "$service_port"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
}

enable_service() {
  $sudo_bin systemctl daemon-reload
  $sudo_bin systemctl enable "$service_name"
  $sudo_bin systemctl restart "$service_name"
  $sudo_bin systemctl status "$service_name" --no-pager
}

main() {
  require_command systemctl "systemd is required."
  ensure_directories
  install_uv
  create_virtualenv
  install_requirements
  write_service_file
  enable_service
}

main "$@"
