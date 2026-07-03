#!/bin/bash

# Usage: ./create-bot.sh <username> <exchange> <pair>
# Example: ./create-bot.sh Faith Binance ethusdt

set -e

USERNAME=$1
EXCHANGE=$2
PAIR=$3

if [ -z "$USERNAME" ] || [ -z "$EXCHANGE" ] || [ -z "$PAIR" ]; then
    echo "Usage: $0 <username> <exchange> <pair>"
    echo "Example: $0 Faith Binance ethusdt"
    exit 1
fi

USERNAME_LOWER=$(echo "$USERNAME" | tr '[:upper:]' '[:lower:]')
EXCHANGE_LOWER=$(echo "$EXCHANGE" | tr '[:upper:]' '[:lower:]')
PAIR_LOWER=$(echo "$PAIR" | tr '[:upper:]' '[:lower:]')

SERVICE_NAME="${EXCHANGE_LOWER}-${USERNAME_LOWER}-${PAIR_LOWER}"
BOT_DIR="/home/smatbotsolutions/Tradingbots/${USERNAME}/${EXCHANGE}/${PAIR_LOWER}"
PYTHON="/home/smatbotsolutions/Tradingbots/bin/python3"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Creating bot service"
echo "  User:     $USERNAME"
echo "  Exchange: $EXCHANGE"
echo "  Pair:     $PAIR"
echo "  Service:  $SERVICE_NAME"
echo "  Path:     $BOT_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check bot directory exists
if [ ! -d "$BOT_DIR" ]; then
    echo "❌ Error: Bot directory not found: $BOT_DIR"
    echo "   Please create the folder and add the bot script first."
    exit 1
fi

# Check Python script exists
BOT_SCRIPT=$(find "$BOT_DIR" -maxdepth 1 -name "*.py" | head -1)
if [ -z "$BOT_SCRIPT" ]; then
    echo "❌ Error: No Python script found in $BOT_DIR"
    exit 1
fi

echo "✓ Found bot script: $BOT_SCRIPT"

# Check service doesn't already exist
if [ -f "$SERVICE_FILE" ]; then
    echo "❌ Error: Service $SERVICE_NAME already exists"
    echo "   Run: sudo systemctl status $SERVICE_NAME"
    exit 1
fi

# Create systemd service file
sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=${EXCHANGE} ${PAIR} Futures Trading Bot - ${USERNAME}
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=smatbotsolutions
WorkingDirectory=${BOT_DIR}
ExecStart=${PYTHON} ${BOT_SCRIPT}
Restart=on-failure
RestartSec=10
StandardOutput=append:${BOT_DIR}/${PAIR_LOWER}.log
StandardError=append:${BOT_DIR}/errors.log

[Install]
WantedBy=multi-user.target
EOF

echo "✓ Service file created: $SERVICE_FILE"

# Reload systemd
sudo systemctl daemon-reload
echo "✓ Systemd reloaded"

# Pre-create log files with correct ownership to avoid permission errors
touch "${BOT_DIR}/${PAIR_LOWER}.log" "${BOT_DIR}/errors.log"

# Enable service
sudo systemctl enable "$SERVICE_NAME"
echo "✓ Service enabled (will start on reboot)"

# Start service
sudo systemctl start "$SERVICE_NAME"
sleep 2

# Check status
STATUS=$(systemctl is-active "$SERVICE_NAME")
if [ "$STATUS" = "active" ]; then
    echo "✓ Service is running"
    echo ""
    echo "✅ Bot $SERVICE_NAME is live!"
    echo "   It will now appear automatically on ${USERNAME}'s dashboard."
else
    echo "❌ Service failed to start. Checking logs..."
    sudo systemctl status "$SERVICE_NAME" --no-pager
    exit 1
fi
