#!/bin/bash
# Install syanko-agent as a systemd user or system service.
# Usage (system): sudo ./install-linux-service.sh /opt/syanko-agent/syanko-agent

set -euo pipefail

BINARY="${1:-/opt/syanko-agent/syanko-agent}"
SERVICE_NAME="syanko-agent"

if [[ ! -x "$BINARY" ]]; then
  echo "Binary not found or not executable: $BINARY"
  exit 1
fi

UNIT="[Unit]
Description=Syanko Print Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${BINARY}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target"

if [[ $EUID -eq 0 ]]; then
  echo "$UNIT" > "/etc/systemd/system/${SERVICE_NAME}.service"
  systemctl daemon-reload
  systemctl enable "${SERVICE_NAME}"
  systemctl start "${SERVICE_NAME}"
  echo "Installed system service: ${SERVICE_NAME}"
  systemctl status "${SERVICE_NAME}" --no-pager || true
else
  mkdir -p "${HOME}/.config/systemd/user"
  echo "$UNIT" > "${HOME}/.config/systemd/user/${SERVICE_NAME}.service"
  systemctl --user daemon-reload
  systemctl --user enable "${SERVICE_NAME}"
  systemctl --user start "${SERVICE_NAME}"
  echo "Installed user service: ${SERVICE_NAME}"
  systemctl --user status "${SERVICE_NAME}" --no-pager || true
fi
