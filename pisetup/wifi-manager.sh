#!/bin/bash

# WiFi Manager - Connects to home WiFi or falls back to AP mode
# Part of StuffedAnimalWar by Jaemzware LLC

CREDS_FILE="/home/jaemzware/stuffedanimalwar/wifi-credentials.json"
AP_CONNECTION="StuffedAnimalWAP"
HOME_CONNECTION="HomeWiFi"
MAX_WAIT=30  # seconds to wait for home WiFi connection

log() {
    echo "[WiFi Manager] $1"
    logger -t wifi-manager "$1"
}

# Detect correct LED path for this Pi model
detect_led_path() {
    if [ -d "/sys/class/leds/led0" ]; then
        echo "/sys/class/leds/led0"
    elif [ -d "/sys/class/leds/ACT" ]; then
        echo "/sys/class/leds/ACT"
    else
        echo ""
    fi
}

LED_PATH=$(detect_led_path)

# LED control functions
setup_led_blink() {
    if [ -z "$LED_PATH" ]; then
        log "LED control not available on this system"
        return
    fi

    log "Starting LED blink indicator"
    echo timer > "$LED_PATH/trigger" 2>/dev/null && \
    echo 100 > "$LED_PATH/delay_on" 2>/dev/null && \
    echo 100 > "$LED_PATH/delay_off" 2>/dev/null

    if [ $? -ne 0 ]; then
        log "Warning: Could not control LED at $LED_PATH"
    fi
}

restore_led() {
    if [ -z "$LED_PATH" ]; then
        return
    fi

    log "Setting LED to solid green"
    echo none > "$LED_PATH/trigger" 2>/dev/null
    echo 1 > "$LED_PATH/brightness" 2>/dev/null

    if [ $? -ne 0 ]; then
        log "Warning: Could not control LED at $LED_PATH"
    fi
}

# Give NetworkManager time to fully initialize
log "Waiting for NetworkManager to be ready..."
sleep 5

# Verify NetworkManager is actually running
if ! systemctl is-active --quiet NetworkManager; then
    log "ERROR: NetworkManager is not running!"
    exit 1
fi

# Ensure AP mode is down before we start
log "Ensuring AP mode is disabled before connection attempt..."
nmcli connection down "$AP_CONNECTION" 2>/dev/null || true

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

log "Attempting connection to SSID: $SSID"

# Check if connection profile exists, if not create it
if ! nmcli connection show "$HOME_CONNECTION" &>/dev/null; then
    log "Creating new WiFi connection profile for $SSID"
    nmcli connection add type wifi ifname wlan0 con-name "$HOME_CONNECTION" ssid "$SSID"
    nmcli connection modify "$HOME_CONNECTION" wifi-sec.key-mgmt wpa-psk
    nmcli connection modify "$HOME_CONNECTION" wifi-sec.psk "$PASSWORD"
else
    # Update existing connection in case credentials changed
    log "Updating existing connection profile"
    nmcli connection modify "$HOME_CONNECTION" wifi.ssid "$SSID"
    nmcli connection modify "$HOME_CONNECTION" wifi-sec.psk "$PASSWORD"
fi

# Try to connect
log "Bringing up home WiFi connection..."
nmcli connection up "$HOME_CONNECTION" &>/dev/null

# Wait for THIS SPECIFIC connection to become active
log "Waiting up to ${MAX_WAIT}s for connection to establish..."
for i in $(seq 1 $MAX_WAIT); do
    # Check if THIS specific connection is active (not just any connection)
    CONNECTION_STATE=$(nmcli -t -f NAME,STATE connection show --active | grep "^${HOME_CONNECTION}:" | cut -d: -f2)

    if [ "$CONNECTION_STATE" = "activated" ]; then
        log "Successfully connected to home WiFi!"
        restore_led  # Stop blinking, restore normal
        exit 0
    fi
    sleep 1
done

# Failed to connect - fall back to AP mode
log "Failed to connect to home WiFi after ${MAX_WAIT}s."
log "Falling back to AP mode (${AP_CONNECTION})..."
restore_led  # Stop blinking before starting AP
sleep 2  # Give LED time to restore and system to settle

# Ensure home connection is down before starting AP
nmcli connection down "$HOME_CONNECTION" 2>/dev/null || true

# Start AP mode
if nmcli connection up "$AP_CONNECTION" 2>/dev/null; then
    log "AP mode started successfully"
else
    log "ERROR: Failed to start AP mode"
    exit 1
fi

exit 0