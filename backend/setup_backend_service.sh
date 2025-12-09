#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
backend_dir="$project_root/backend"
venv_path="${VENV_PATH:-$project_root/.venv}"
service_name="part-management-backend.service"
service_file="/etc/systemd/system/$service_name"
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

install_nodejs() {
  if command -v node &> /dev/null && command -v npm &> /dev/null; then
    printf "Node.js and npm are already installed.\n"
    return
  fi

  printf "Installing Node.js and npm...\n"
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt-get install -y nodejs

  if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    printf "Node.js/npm installation failed.\n" >&2
    exit 1
  fi
  printf "Node.js and npm installed successfully.\n"
}

install_npm_dependencies() {
  printf "Installing npm dependencies...\n"
  cd "$project_root"
  npm install
  if [[ $? -ne 0 ]]; then
    printf "npm install failed.\n" >&2
    exit 1
  fi
  printf "npm dependencies installed successfully.\n"
}

create_service() {
  sudo tee "$service_file" >/dev/null <<EOF
[Unit]
Description=Part Management System Backend
After=network.target

[Service]
Type=simple
User=$(whoami)
Group=$(whoami)
WorkingDirectory=$backend_dir
Environment="PATH=$venv_path/bin:\$PATH"
Environment="VIRTUAL_ENV=$venv_path"
ExecStart=$uv_bin run python $backend_dir/deploy.py prod-multi --port 5000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
}

enable_service() {
  sudo systemctl daemon-reload
  sudo systemctl enable "$service_name"
  sudo systemctl start "$service_name"
}

main() {
  install_uv
  install_nodejs
  cd "$project_root"
  "$uv_bin" venv .venv
  source .venv/bin/activate
  cd "$backend_dir"
  "$uv_bin" sync --active
  install_npm_dependencies
  create_service
  enable_service
}

main "$@"
