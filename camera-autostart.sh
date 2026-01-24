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

# Create a user data directory with camera permissions pre-granted
USER_DATA_DIR="/tmp/chromium-camera-autostart"
mkdir -p "$USER_DATA_DIR/Default"

# Create preferences file that grants camera/mic permissions for all sites
cat > "$USER_DATA_DIR/Default/Preferences" << EOF
{
  "profile": {
    "content_settings": {
      "exceptions": {
        "media_stream_camera": {
          "https://${DOMAIN},*": {
            "last_modified": "13300000000000000",
            "setting": 1
          },
          "https://[*.]${DOMAIN%%:*},*": {
            "last_modified": "13300000000000000",
            "setting": 1
          },
          "*,*": {
            "last_modified": "13300000000000000",
            "setting": 1
          }
        },
        "media_stream_mic": {
          "https://${DOMAIN},*": {
            "last_modified": "13300000000000000",
            "setting": 1
          },
          "*,*": {
            "last_modified": "13300000000000000",
            "setting": 1
          }
        }
      }
    }
  }
}
EOF

echo "Created Chromium profile with camera permissions at: $USER_DATA_DIR"

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
    --auto-accept-camera-and-microphone-capture \
    --use-fake-ui-for-media-stream \
    "$URL"
