#!/bin/bash
set -euo pipefail
# Run as root on the existing Miaofire host with the uploaded tarball path.
archive=${1:?release tarball required}
stamp=$(date +%Y%m%d%H%M%S)
release=/opt/miaofire-accounts/releases/$stamp
nginx_conf=/www/server/panel/vhost/nginx/sub2api.conf
mkdir -p "$release" /var/backups/miaofire /opt/miaofire-node/bin
cp -p "$nginx_conf" "/var/backups/miaofire/nginx-$stamp.conf"
tar -czf "/var/backups/miaofire/frontend-$stamp.tar.gz" -C /www/wwwroot/miaofire .
tar -xzf "$archive" -C "$release"
id miaofire-accounts >/dev/null 2>&1 || useradd --system --home /var/lib/miaofire-accounts --shell /sbin/nologin miaofire-accounts
install -d -m 700 -o miaofire-accounts -g miaofire-accounts /var/lib/miaofire-accounts
test -x /opt/miaofire-node/bin/node || install -m 755 /opt/couple-kitchen-node/bin/node /opt/miaofire-node/bin/node
ln -sfn "$release" /opt/miaofire-accounts/current
cat > /etc/systemd/system/miaofire-accounts.service <<'UNIT'
[Unit]
Description=Miaofire accounts and cloud saves
After=network.target
[Service]
Type=simple
User=miaofire-accounts
Group=miaofire-accounts
WorkingDirectory=/opt/miaofire-accounts/current
ExecStart=/opt/miaofire-node/bin/node backend/accounts/service.mjs
Environment=ACCOUNT_DB=/var/lib/miaofire-accounts/accounts.sqlite
Environment=PORT=4186
Environment=ALLOWED_ORIGINS=https://8.138.109.198:18080,https://8.138.109.198
Restart=on-failure
RestartSec=3
UMask=0077
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/miaofire-accounts
PrivateTmp=true
[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/systemd/system/miaofire-account-backup.service <<'UNIT'
[Unit]
Description=Backup Miaofire account database
[Service]
Type=oneshot
User=miaofire-accounts
Group=miaofire-accounts
UMask=0077
ExecStart=/opt/miaofire-node/bin/node /opt/miaofire-accounts/current/backend/accounts/backup.mjs
UNIT
cat > /etc/systemd/system/miaofire-account-backup.timer <<'UNIT'
[Unit]
Description=Daily Miaofire account backup
[Timer]
OnCalendar=*-*-* 04:00:00
Persistent=true
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable miaofire-accounts.service
systemctl restart miaofire-accounts.service
systemctl enable --now miaofire-account-backup.timer
for attempt in 1 2 3 4 5; do if curl -fsS http://127.0.0.1:4186/health; then break; fi; sleep 1; done
curl -fsS http://127.0.0.1:4186/health
python3 - <<'PY'
p='/www/server/panel/vhost/nginx/sub2api.conf'
s=open(p).read()
if 'location /api/account/' not in s:
    s=s.replace(' location /api/leaderboard/', ' location /api/account/ { client_max_body_size 256k; proxy_pass http://127.0.0.1:4186/; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; }\n location /api/leaderboard/')
if 'add_header Cache-Control' not in s:
    s=s.replace(' index index.html;', ' index index.html;\n add_header Cache-Control "no-cache";')
open(p,'w').write(s)
PY
if ! nginx -t; then cp -p "/var/backups/miaofire/nginx-$stamp.conf" "$nginx_conf"; exit 1; fi
cp -a "$release/src/." /www/wwwroot/miaofire/src/
cp "$release/index.html" /www/wwwroot/miaofire/index.html
nginx -s reload
systemctl start miaofire-account-backup.service
echo "Deployed $release; rollback files in /var/backups/miaofire ($stamp)"
