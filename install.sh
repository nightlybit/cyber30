#!/usr/bin/env bash
# Installs Cyber30 on Kali: starts the server automatically at login,
# and adds a "Cyber30" app to your applications menu. No root needed.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-8730}"

mkdir -p "$HOME/.config/systemd/user" "$HOME/.local/share/applications" "$HOME/.local/share/icons"

cat > "$HOME/.config/systemd/user/cyber30.service" <<EOF
[Unit]
Description=Cyber30 learning app server (shared database + reminders)
After=network-online.target

[Service]
ExecStart=/usr/bin/python3 $DIR/server.py --port $PORT
WorkingDirectory=$DIR
Restart=on-failure

[Install]
WantedBy=default.target
EOF

# Open as a standalone app window if Chromium is installed, otherwise in the default browser.
if command -v chromium >/dev/null; then LAUNCH="chromium --app=http://localhost:$PORT"
else LAUNCH="xdg-open http://localhost:$PORT"; fi
cp "$DIR/web/icon-512.png" "$HOME/.local/share/icons/cyber30.png"
cat > "$HOME/.local/share/applications/cyber30.desktop" <<EOF
[Desktop Entry]
Name=Cyber30
Comment=30 days to think like a security expert
Exec=$LAUNCH
Icon=$HOME/.local/share/icons/cyber30.png
Terminal=false
Type=Application
Categories=Education;Security;
EOF

systemctl --user daemon-reload
systemctl --user enable --now cyber30.service
sleep 1
echo
echo "Cyber30 is installed and running."
echo "  Open it:   find 'Cyber30' in your applications menu, or visit http://localhost:$PORT"
echo "  Phone:     open the app on this machine -> Me tab -> scan the QR code"
echo "  Logs:      journalctl --user -u cyber30 -f"
echo "  Stop:      systemctl --user disable --now cyber30"
