#!/bin/bash

# Bot Dashboard Setup Script
# Usage: bash setup.sh
# Run this on a fresh Debian/Ubuntu GCP VM

set -e

# ─────────────────────────────────────────
# CONFIGURATION — edit these before running
# ─────────────────────────────────────────
GITHUB_REPO="https://github.com/Fayth7/bot-dashboard.git"
DOMAIN=""                    # e.g. james.redorchid.co.ug
USERNAME="smatbotsolutions"  # Linux username on this VM
VENV_PATH=""                 # e.g. /home/smatbotsolutions/Tradingbots/Tradingbots/bin
TRADINGBOTS_PATH="/home/smatbotsolutions/Tradingbots"
DASHBOARD_USER=""            # e.g. James
DASHBOARD_PASSWORD=""        # dashboard login password
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
BRIDGE_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")

# ─────────────────────────────────────────
# COLOURS
# ─────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; exit 1; }

# ─────────────────────────────────────────
# VALIDATE CONFIG
# ─────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Bot Dashboard Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

[ -z "$DOMAIN" ]           && fail "DOMAIN is not set. Edit setup.sh first."
[ -z "$VENV_PATH" ]        && fail "VENV_PATH is not set. Edit setup.sh first."
[ -z "$DASHBOARD_USER" ]   && fail "DASHBOARD_USER is not set. Edit setup.sh first."
[ -z "$DASHBOARD_PASSWORD" ] && fail "DASHBOARD_PASSWORD is not set. Edit setup.sh first."

echo "Domain:     $DOMAIN"
echo "User:       $DASHBOARD_USER"
echo "Venv:       $VENV_PATH"
echo ""
read -p "Continue with these settings? (y/n) " -n 1 -r
echo ""
[[ ! $REPLY =~ ^[Yy]$ ]] && exit 1

# ─────────────────────────────────────────
# STEP 1 — Install system dependencies
# ─────────────────────────────────────────
echo ""
log "Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
  ca-certificates curl gnupg git nginx certbot python3-certbot-nginx

# ─────────────────────────────────────────
# STEP 2 — Install Docker
# ─────────────────────────────────────────
if ! command -v docker &> /dev/null; then
  log "Installing Docker..."
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/debian \
    $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker $USERNAME
  log "Docker installed"
else
  log "Docker already installed"
fi

# ─────────────────────────────────────────
# STEP 3 — Clone or update repo
# ─────────────────────────────────────────
DASHBOARD_DIR="/home/$USERNAME/bot-dashboard"
if [ -d "$DASHBOARD_DIR" ]; then
  log "Repo already exists — pulling latest..."
  cd $DASHBOARD_DIR && git pull
else
  log "Cloning repo..."
  git clone $GITHUB_REPO $DASHBOARD_DIR
fi

# ─────────────────────────────────────────
# STEP 4 — Install bridge dependencies
# ─────────────────────────────────────────
log "Installing bridge dependencies..."
$VENV_PATH/pip install fastapi uvicorn python-dotenv -q

# ─────────────────────────────────────────
# STEP 5 — Create control bridge service
# ─────────────────────────────────────────
log "Setting up control bridge..."
sudo tee /etc/systemd/system/bot-control-bridge.service > /dev/null << EOF
[Unit]
Description=Bot Dashboard Control Bridge
After=network.target

[Service]
Type=simple
User=$USERNAME
WorkingDirectory=$DASHBOARD_DIR/control-bridge
ExecStart=$VENV_PATH/uvicorn bridge:app --host 0.0.0.0 --port 8002
Restart=on-failure
RestartSec=5
Environment=BRIDGE_SECRET=$BRIDGE_SECRET

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable bot-control-bridge
sudo systemctl restart bot-control-bridge
log "Control bridge running"

# ─────────────────────────────────────────
# STEP 6 — Create .env file
# ─────────────────────────────────────────
log "Creating backend .env..."
cat > $DASHBOARD_DIR/backend/.env << EOF
JWT_SECRET_KEY=$JWT_SECRET
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=168
BRIDGE_URL=http://172.17.0.1:8002
BRIDGE_SECRET=$BRIDGE_SECRET
EOF

# ─────────────────────────────────────────
# STEP 7 — Create users.json
# ─────────────────────────────────────────
log "Creating users.json..."
cat > $DASHBOARD_DIR/backend/users.json << EOF
{
  "users": [
    {
      "username": "$DASHBOARD_USER",
      "password": "$DASHBOARD_PASSWORD"
    }
  ]
}
EOF
chmod 600 $DASHBOARD_DIR/backend/users.json

# ─────────────────────────────────────────
# STEP 8 — Create docker-compose.yml
# ─────────────────────────────────────────
log "Creating docker-compose.yml..."
cat > $DASHBOARD_DIR/docker-compose.yml << EOF
services:
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: bot-dashboard-api
    restart: unless-stopped
    ports:
      - "127.0.0.1:8001:8001"
    volumes:
      - $TRADINGBOTS_PATH:$TRADINGBOTS_PATH:ro
      - $DASHBOARD_DIR/backend/users.json:/app/users.json
      - $DASHBOARD_DIR/backend/.env:/app/.env
    environment:
      - PYTHONUNBUFFERED=1
      - BRIDGE_URL=http://172.17.0.1:8002
      - BRIDGE_SECRET=$BRIDGE_SECRET
EOF

# ─────────────────────────────────────────
# STEP 9 — Build and start Docker API
# ─────────────────────────────────────────
log "Building and starting Docker API..."
cd $DASHBOARD_DIR
sudo docker compose up --build -d
log "Docker API running"

# ─────────────────────────────────────────
# STEP 10 — Build React frontend
# ─────────────────────────────────────────
log "Building React frontend..."
cd $DASHBOARD_DIR/frontend
npm install -q
npm run build
log "Frontend built"

# ─────────────────────────────────────────
# STEP 11 — Issue SSL certificate
# ─────────────────────────────────────────
log "Issuing SSL certificate for $DOMAIN..."
sudo certbot certonly --nginx -d $DOMAIN --non-interactive --agree-tos \
  --email admin@redorchid.co.ug || warn "SSL cert failed — check DNS is pointing to this VM"

# ─────────────────────────────────────────
# STEP 12 — Configure Nginx
# ─────────────────────────────────────────
log "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        root $DASHBOARD_DIR/frontend/build;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
log "Nginx configured"

# ─────────────────────────────────────────
# DONE
# ─────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}  Setup complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Dashboard: https://$DOMAIN"
echo "  Username:  $DASHBOARD_USER"
echo "  Password:  $DASHBOARD_PASSWORD"
echo ""
echo "  Next steps:"
echo "  1. Add bot folders under $TRADINGBOTS_PATH/$DASHBOARD_USER/"
echo "  2. Run: ~/bot-dashboard/bot-manager/create-bot.sh $DASHBOARD_USER <Exchange> <pair>"
echo "  3. Bots appear on dashboard automatically"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
