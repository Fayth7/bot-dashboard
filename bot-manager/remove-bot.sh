#!/bin/bash

# Usage: ./remove-bot.sh <username> <exchange> <pair>
# Example: ./remove-bot.sh Faith Binance ethusdt

USERNAME=$1
EXCHANGE=$2
PAIR=$3

if [ -z "$USERNAME" ] || [ -z "$EXCHANGE" ] || [ -z "$PAIR" ]; then
    echo "Usage: $0 <username> <exchange> <pair>"
    exit 1
fi

USERNAME_LOWER=$(echo "$USERNAME" | tr '[:upper:]' '[:lower:]')
EXCHANGE_LOWER=$(echo "$EXCHANGE" | tr '[:upper:]' '[:lower:]')
PAIR_LOWER=$(echo "$PAIR" | tr '[:upper:]' '[:lower:]')

SERVICE_NAME="${EXCHANGE_LOWER}-${USERNAME_LOWER}-${PAIR_LOWER}"

echo "Stopping and removing $SERVICE_NAME..."

sudo systemctl stop "$SERVICE_NAME" 2>/dev/null || true
sudo systemctl disable "$SERVICE_NAME" 2>/dev/null || true
sudo rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
sudo systemctl daemon-reload

echo "✅ Bot $SERVICE_NAME removed."
echo "   The bot folder and scripts are untouched."
