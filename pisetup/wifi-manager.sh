#!/bin/bash

# WiFi Manager - Connects to home WiFi or falls back to AP mode
# Part of StuffedAnimalWar by Jaemzware LLC

CREDS_FILE="/home/jaemzware/stuffedanimalwar/wifi-credentials.json"
AP_CONNECTION="StuffedAnimalWAP"
HOME_CONNECTION="HomeWiFi"
MAX_WAIT=60  # seconds to wait for home WiFi connection

log() {
    echo "[WiFi Manager] $1"
    logger -t wifi-manager "$1"
}

# LED control functions
setup_led_blink() {
    # Make LED blink during WiFi connection attempt
    echo timer > /sys/class/leds/ACT/trigger 2>/dev/null || true
    echo 100 > /sys/class/leds/ACT/delay_on 2>/dev/null || true
    echo 100 > /sys/class/leds/ACT/delay_off 2>/dev/null || true
}

restore_led() {
    # Restore default LED behavior (disk activity)
    echo mmc0 > /sys/class/leds/ACT/trigger 2>/dev/null || true
}

# Give NetworkManager time to fully initialize
sleep 5

# Check if credentials file exists
if [ ! -f "$CREDS_FILE" ]; then
    log "No credentials file found. Starting in AP mode."
    restore_led
    nmcli connection up "$AP_CONNECTION" 2>/dev/null || log "Failed to start AP mode"
    exit 0
fi

# Credentials exist, try to connect to home WiFi
log "Credentials found. Attempting to connect to home WiFi..."
setup_led_blink  # Start blinking LED

# Read SSID from credentials file
SSID=$(jq -r '.ssid' "$CREDS_FILE")
PASSWORD=$(jq -r '.password' "$CREDS_FILE")

# Check if connection profile exists, if not create it
if ! nmcli connection show "$HOME_CONNECTION" &>/dev/null; then
    log "Creating new WiFi connection profile for $SSID"
    nmcli connection add type wifi ifname wlan0 con-name "$HOME_CONNECTION" ssid "$SSID"
    nmcli connection modify "$HOME_CONNECTION" wifi-sec.key-mgmt wpa-psk
    nmcli connection modify "$HOME_CONNECTION" wifi-sec.psk "$PASSWORD"
fi

# Try to connect
nmcli connection up "$HOME_CONNECTION" &>/dev/null

# Wait for connection
log "Waiting up to ${MAX_WAIT}s for connection..."
for i in $(seq 1 $MAX_WAIT); do
    if nmcli -t -f STATE general | grep -q "connected (site only)\|connected"; then
        log "Successfully connected to home WiFi!"
        restore_led  # Stop blinking, restore normal
        exit 0
    fi
    sleep 1
done

# Failed to connect - fall back to AP mode
log "Failed to connect to home WiFi after ${MAX_WAIT}s. Starting AP mode."
restore_led  # Stop blinking
nmcli connection up "$AP_CONNECTION" 2>/dev/null || log "Failed to start AP mode"

exit 0