#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NODE_BIN="$(command -v node)"
UNIT_DIR="$HOME/.config/systemd/user"
UNIT_FILE="$UNIT_DIR/jurisflow-certificate-bridge.service"

mkdir -p "$UNIT_DIR"

cat > "$UNIT_FILE" <<EOF
[Unit]
Description=JurisFlow Local Certificate Bridge
After=graphical-session.target

[Service]
Type=simple
ExecStart=$NODE_BIN $ROOT/tools/certificate-bridge/server.mjs
WorkingDirectory=$ROOT
Environment=NODE_ENV=production
Environment=JURISFLOW_CERT_BRIDGE_PORT=43119
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=%t
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now jurisflow-certificate-bridge.service

echo
echo "Serviço instalado:"
echo "  $UNIT_FILE"
echo
systemctl --user --no-pager --full status jurisflow-certificate-bridge.service || true
