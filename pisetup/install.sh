#!/bin/bash

# StuffedAnimalWar Pi Setup - Installation Script
# Jaemzware LLC
#
# This script configures a Raspberry Pi for dual-mode operation:
# - AP mode for "in the woods" use (no internet needed)
# - Home WiFi mode for local network access

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAW_DIR="/home/jaemzware/stuffedanimalwar"
AA_DIR="/home/jaemzware/analogarchive"

echo "=========================================="
echo "StuffedAnimalWar Pi Setup"
echo "Jaemzware LLC"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run with sudo: sudo ./install.sh"
    exit 1
fi

echo "[1/11] Updating system packages..."
apt update
apt upgrade -y

echo "[2/11] Installing system dependencies..."
apt install -y nginx avahi-daemon network-manager jq

echo "[3/11] Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    echo "Node.js $(node --version) installed"
else
    echo "Node.js $(node --version) already installed"
fi

echo "[4/11] Installing Node.js dependencies for StuffedAnimalWar..."
cd "$SAW_DIR"
sudo -u jaemzware npm install

echo "[5/11] Installing Node.js dependencies for AnalogArchive..."
if [ -d "$AA_DIR" ]; then
    cd "$AA_DIR"
    sudo -u jaemzware npm install
    echo "AnalogArchive dependencies installed"
else
    echo "AnalogArchive not found, skipping"
fi

echo "[6/11] Stopping conflicting services..."
systemctl stop apache2 2>/dev/null || true
systemctl disable apache2 2>/dev/null || true

echo "[7/11] Generating SSL certificates..."
cd "$SCRIPT_DIR"
sudo -u jaemzware bash "$SCRIPT_DIR/generate-certs.sh"

echo "[8/11] Configuring NetworkManager AP connection..."
# Create AP connection profile
nmcli connection delete StuffedAnimalWAP 2>/dev/null || true
nmcli connection add type wifi ifname wlan0 con-name StuffedAnimalWAP autoconnect no ssid StuffedAnimalWAP
nmcli connection modify StuffedAnimalWAP 802-11-wireless.mode ap 802-11-wireless.band bg ipv4.method shared
nmcli connection modify StuffedAnimalWAP wifi-sec.key-mgmt wpa-psk wifi-sec.psk "stuffedanimal"

echo "[9/11] Installing nginx configurations..."
cp "$SCRIPT_DIR/nginx-stuffedanimalwar.conf" /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/nginx-stuffedanimalwar.conf /etc/nginx/sites-enabled/

# Install analogarchive config if directory exists
if [ -d "$AA_DIR" ]; then
    echo "  - AnalogArchive detected, installing nginx config..."
    cp "$SCRIPT_DIR/nginx-analogarchive.conf" /etc/nginx/sites-available/
    ln -sf /etc/nginx/sites-available/nginx-analogarchive.conf /etc/nginx/sites-enabled/
fi

# Remove default nginx site
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

echo "[10/11] Installing WiFi Manager and application services..."
cp "$SCRIPT_DIR/wifi-manager.service" /etc/systemd/system/
chmod +x "$SCRIPT_DIR/wifi-manager.sh"

cp "$SCRIPT_DIR/stuffedanimalwar.service" /etc/systemd/system/

# Install analogarchive service if it exists
if [ -d "$AA_DIR" ]; then
    echo "  - Installing AnalogArchive service..."
    cp "$SCRIPT_DIR/analogarchive.service" /etc/systemd/system/
fi

echo "[11/11] Setting hostname and enabling services..."
hostnamectl set-hostname stuffedanimalwar

systemctl daemon-reload
systemctl enable wifi-manager.service
systemctl enable nginx
systemctl enable stuffedanimalwar.service

if [ -f "/etc/systemd/system/analogarchive.service" ]; then
    systemctl enable analogarchive.service
fi

echo ""
echo "=========================================="
echo "Installation complete!"
echo "=========================================="
echo ""
echo "The Pi will start in AP mode on first boot."
echo "  - WiFi Name: StuffedAnimalWAP"
echo "  - Password: stuffedanimal"
echo "  - Setup URL: https://stuffedanimalwar.local/setup"
echo ""
echo "Reboot now? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    reboot
fi