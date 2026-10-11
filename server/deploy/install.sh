#!/bin/sh
# Install a new service and an isolated preview on the already-configured static.wlmech.com host.
# Existing deployments are deliberately rejected; upgrades need their own reviewed procedure.
set -eu

payload=${1:?Pass the extracted deployment directory}
site=/etc/nginx/sites-available/static.wlmech.com
service_dir=/opt/crosspost-image-service
preview_dir=/var/www/static/crosspost-composer
unit=/etc/systemd/system/crosspost-image-service.service
env_file=/etc/crosspost-image-service.env
location_file=/etc/nginx/snippets/crosspost-images-location.conf
limits_file=/etc/nginx/conf.d/crosspost-images-limits.conf

test "$(id -u)" -eq 0
test -f "$site"
for target in "$service_dir" "$preview_dir" "$unit" "$env_file" "$location_file" "$limits_file"; do
  if [ -e "$target" ]; then echo "Refusing to replace existing deployment path: $target" >&2; exit 1; fi
done

install -d -m 700 /var/backups/crosspost-image-service
backup=/var/backups/crosspost-image-service/static.wlmech.com-$(date +%Y%m%d-%H%M%S)-$$.conf
cp "$site" "$backup"
complete=false
rollback() {
  if [ "$complete" = true ]; then return; fi
  echo 'Deployment failed; restoring the previous configuration.' >&2
  cp "$backup" "$site"
  systemctl disable --now crosspost-image-service.service >/dev/null 2>&1 || true
  rm -f "$unit" "$env_file" "$location_file" "$limits_file"
  rm -rf "$service_dir" "$preview_dir"
  systemctl daemon-reload
  nginx -t && systemctl reload nginx
}
trap rollback EXIT

install -d -m 755 "$service_dir" "$preview_dir" /etc/nginx/snippets
install -m 644 "$payload/server/image-service.mjs" "$service_dir/image-service.mjs"
install -m 644 "$payload/server/deploy/crosspost-image-service.service" "$unit"
install -m 600 "$payload/server/deploy/image-service.env.example" "$env_file"
install -m 644 "$payload/server/deploy/crosspost-images-location.conf" "$location_file"
install -m 644 "$payload/server/deploy/crosspost-images-limits.conf" "$limits_file"
cp -R "$payload/dist/." "$preview_dir/"
python3 - "$site" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
text = p.read_text()
anchor = '    root /var/www/static;\n'
assert text.count(anchor) == 1, 'Unexpected static website configuration'
p.write_text(text.replace(anchor, anchor + '    include /etc/nginx/snippets/crosspost-images-location.conf;\n', 1))
PY

nginx -t
systemctl daemon-reload
systemctl enable --now crosspost-image-service.service
ready=false
for attempt in 1 2 3 4 5; do
  if curl -fsS http://127.0.0.1:8787/health >/dev/null; then ready=true; break; fi
  sleep 1
done
test "$ready" = true
systemctl reload nginx
complete=true
echo "Installed service and preview. Nginx backup: $backup"
