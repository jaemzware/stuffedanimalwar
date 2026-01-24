#!/bin/bash
#
# camera-autostart.sh
#
# Launches Chromium directly (no Puppeteer) to auto-start camera broadcasting.
# The page handles auto-start via query parameters.
#
# Usage:
#   ./camera-autostart.sh <domain> <room> [cameraName] [delay]
#
# Examples:
#   ./camera-autostart.sh localhost:55556 jim999 "Pi Camera"
#   ./camera-autostart.sh stuffedanimalwar.com kitchen "Kitchen Cam" 5000
#
# Or set environment variables in camera-autostart.conf and run without args.

# Load config file if it exists
CONFIG_FILE="${HOME}/camera-autostart.conf"
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

# Command line args override config file
DOMAIN="${1:-$CAMERA_DOMAIN}"
ROOM="${2:-$CAMERA_ROOM}"
NAME="${3:-${CAMERA_NAME:-Pi Camera}}"
DELAY="${4:-${CAMERA_DELAY:-5000}}"

if [ -z "$DOMAIN" ] || [ -z "$ROOM" ]; then
    echo "Usage: $0 <domain> <room> [cameraName] [delay]"
    echo ""
    echo "Or create ${CONFIG_FILE} with:"
    echo "  CAMERA_DOMAIN=localhost:55556"
    echo "  CAMERA_ROOM=frontdoor"
    echo "  CAMERA_NAME=Pi Camera"
    exit 1
fi

# URL encode the camera name
ENCODED_NAME=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$NAME'))")

# Build URL with autostart parameters
URL="https://${DOMAIN}/${ROOM}camera?autostart=true&name=${ENCODED_NAME}&delay=${DELAY}"

echo "=== Camera Auto-Start ==="
echo "URL: $URL"
echo "Room: $ROOM"
echo "Camera Name: $NAME"
echo ""

# Find Chromium
if [ -x "/usr/bin/chromium-browser" ]; then
    CHROMIUM="/usr/bin/chromium-browser"
elif [ -x "/usr/bin/chromium" ]; then
    CHROMIUM="/usr/bin/chromium"
else
    echo "Error: Chromium not found"
    exit 1
fi

echo "Launching: $CHROMIUM"
echo ""

# Create a user data directory
USER_DATA_DIR="/tmp/chromium-camera-autostart"
mkdir -p "$USER_DATA_DIR/Default"

# Create Chrome managed policies directory and policy file
# This is the most reliable way to grant camera/mic permissions
POLICY_DIR="/etc/chromium/policies/managed"
sudo mkdir -p "$POLICY_DIR"

# Create policy that allows camera/mic for all HTTPS sites
sudo tee "$POLICY_DIR/camera-autostart.json" > /dev/null << 'EOF'
{
  "VideoCaptureAllowed": true,
  "AudioCaptureAllowed": true,
  "VideoCaptureAllowedUrls": ["https://*"],
  "AudioCaptureAllowedUrls": ["https://*"]
}
EOF

echo "Created Chromium policy for camera permissions at: $POLICY_DIR"

# Launch Chromium with camera-friendly flags
exec "$CHROMIUM" \
    --no-sandbox \
    --disable-dev-shm-usage \
    --password-store=basic \
    --ignore-certificate-errors \
    --autoplay-policy=no-user-gesture-required \
    --start-maximized \
    --user-data-dir="$USER_DATA_DIR" \
    --enable-features=WebRTCPipeWireCapturer \
    "$URL"
