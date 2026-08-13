#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: ./scripts/setup-production.sh <your-domain.com>"
  exit 1
fi

DOMAIN="$1"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

sudo apt update
sudo apt install -y curl git nginx certbot python3-certbot-nginx build-essential

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

cd "$APP_DIR"
if [ ! -f .env ]; then
  cp .env.example .env
fi

if grep -q "your-domain.com" .env; then
  sed -i "s#https://your-domain.com,https://www.your-domain.com#https://${DOMAIN}#g" .env
fi

if ! grep -q "HOST=" .env; then
  echo "HOST=0.0.0.0" >> .env
fi

npm install
sudo npm install -g pm2

pm2 delete medbox-prod >/dev/null 2>&1 || true
pm2 start ecosystem.config.js --env production --name medbox-prod
pm2 save

sudo tee /etc/nginx/sites-available/medbox >/dev/null <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/medbox /etc/nginx/sites-enabled/medbox
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

sudo certbot --nginx -d "$DOMAIN" -d "www.${DOMAIN}" --non-interactive --agree-tos -m admin@"$DOMAIN"

pm2 logs medbox-prod --lines 20

echo ""
echo "Deployment ready. Open: https://${DOMAIN}"
echo "PM2 status: pm2 status"
