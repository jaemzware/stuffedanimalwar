# Raspberry Pi Camera WebRTC Broadcaster Setup

This guide explains how to set up the Pi camera as a permanent WebRTC participant in all camera rooms.

## Overview

The `pi_camera_broadcaster.py` script connects your Raspberry Pi's onboard camera to all camera endpoints in Stuffed Animal War. It acts as a WebRTC peer, just like a browser client, but runs as a background service without needing a browser.

## Architecture

```
┌─────────────────┐
│  Raspberry Pi   │
│                 │
│  picamera2      │
│      ↓          │
│  Pi Camera      │
│  Broadcaster    │
│   (Python)      │
└────────┬────────┘
         │ Socket.io + WebRTC
         │
         ↓
┌─────────────────┐
│  Node.js Server │
│  (index.js)     │
│                 │
│  Socket.io      │
│  Signaling      │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Browser        │
│  Clients        │
│                 │
│  All see Pi     │
│  camera feed    │
└─────────────────┘
```

## Prerequisites

- Raspberry Pi (tested on Pi 4, should work on Pi 3+)
- Raspberry Pi Camera Module (v1, v2, or HQ camera)
- Raspberry Pi OS (Bullseye or newer)
- Python 3.9 or newer
- Your Stuffed Animal War server running

## Installation Steps

### 1. Install System Dependencies

On your Raspberry Pi, install required system packages:

```bash
sudo apt update
sudo apt install -y python3-pip python3-dev python3-numpy \
    libavformat-dev libavcodec-dev libavdevice-dev \
    libavutil-dev libswscale-dev libswresample-dev \
    libavfilter-dev libopus-dev libvpx-dev pkg-config \
    libsrtp2-dev
```

### 2. Install picamera2

For Raspberry Pi OS Bullseye or newer, picamera2 is the recommended way to access the camera:

```bash
sudo apt install -y python3-picamera2
```

Or install via pip if the apt package isn't available (do this inside your virtual environment after step 3):

```bash
source venv/bin/activate
pip install picamera2
```

### 3. Install Python Dependencies

Navigate to your stuffedanimalwar directory and create a virtual environment to install the Python requirements:

```bash
cd /path/to/stuffedanimalwar

# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Install requirements (inside the virtual environment)
pip install -r requirements-pi-camera.txt
```

**Note:** On Raspberry Pi OS Bookworm or newer, you must use a virtual environment. Direct `pip3 install` will give an "externally managed environment" error.

### 4. Configure the Broadcaster

Edit `pi_camera_config.json` to match your setup:

```json
{
  "server_url": "https://your-domain.com:55556",
  "camera_name": "📹 Pi Camera",
  "endpoints": [
    "jim",
    "katie",
    "jacob",
    "maddie",
    "mark",
    "nina",
    "onboard"
  ],
  "verify_ssl": false
}
```

**Configuration Options:**

- `server_url`: Your Stuffed Animal War server URL (must match the HTTPS server)
- `camera_name`: Display name that appears in camera rooms (supports emojis!)
- `endpoints`: List of endpoints to broadcast to (gets all by default)
- `verify_ssl`: Set to `true` if using valid SSL certificate, `false` for self-signed

### 5. Test the Broadcaster

Before setting up as a service, test that it works (make sure your virtual environment is activated):

```bash
# Activate venv if not already active
source venv/bin/activate

python3 pi_camera_broadcaster.py
```

You should see output like:
```
2025-11-28 15:00:00 - __main__ - INFO - Loaded configuration from pi_camera_config.json
2025-11-28 15:00:00 - __main__ - INFO - Pi Camera initialized successfully
2025-11-28 15:00:00 - __main__ - INFO - Connecting to https://your-domain.com:55556
2025-11-28 15:00:00 - __main__ - INFO - Broadcasting to endpoints: jim, katie, jacob, maddie, mark, nina, onboard
2025-11-28 15:00:00 - __main__ - INFO - Camera name: 📹 Pi Camera
2025-11-28 15:00:01 - __main__ - INFO - Connected to Socket.io server
2025-11-28 15:00:01 - __main__ - INFO - Sent name update to jim: 📹 Pi Camera
...
```

Open a browser to one of your camera endpoints (e.g., `https://your-domain.com:55556/jimcamera`) and you should see the Pi camera appear in the grid!

Press `Ctrl+C` to stop the test.

### 6. Set Up as a System Service

To have the camera broadcaster start automatically on boot, set up the systemd service:

```bash
# Copy the service file to systemd directory
sudo cp pi-camera-broadcaster.service /etc/systemd/system/

# Edit the service file to match your paths
sudo nano /etc/systemd/system/pi-camera-broadcaster.service
# Update WorkingDirectory and ExecStart paths as needed
# IMPORTANT: ExecStart should use the venv python, e.g.:
# ExecStart=/path/to/stuffedanimalwar/venv/bin/python3 pi_camera_broadcaster.py

# Reload systemd to pick up the new service
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable pi-camera-broadcaster

# Start the service now
sudo systemctl start pi-camera-broadcaster

# Check status
sudo systemctl status pi-camera-broadcaster
```

### 7. View Logs

To see what the broadcaster is doing:

```bash
# View recent logs
sudo journalctl -u pi-camera-broadcaster -n 50

# Follow logs in real-time
sudo journalctl -u pi-camera-broadcaster -f
```

## Configuration via Environment Variables

You can also configure the broadcaster using environment variables (useful for Docker or different deployments):

```bash
export SERVER_URL="https://your-domain.com:55556"
export CAMERA_NAME="📹 Living Room Pi"
export ENDPOINTS="jim,katie,jacob"
python3 pi_camera_broadcaster.py
```

## Troubleshooting

### Camera Not Detected

If the Pi camera isn't detected:

```bash
# Check if camera is enabled
vcgencmd get_camera

# Should show: supported=1 detected=1

# If not, enable camera via raspi-config
sudo raspi-config
# Navigate to Interface Options > Camera > Enable
```

### Connection Issues

If the broadcaster can't connect to the server:

1. **Check server is running**: Make sure your Node.js server is running on port 55556
2. **Check firewall**: Ensure port 55556 is accessible from the Pi
3. **Check SSL**: If using self-signed certificates, make sure `verify_ssl: false` in config
4. **Check URL**: Make sure `server_url` matches your server exactly (https://, correct port)

### WebRTC Connection Fails

If Socket.io connects but video doesn't appear:

1. **Check ICE/STUN**: The Pi needs internet access to reach STUN servers
2. **Check NAT**: If server and Pi are on different networks, you may need TURN servers
3. **Check logs**: Look for WebRTC errors in the broadcaster logs

### Test Pattern Instead of Camera

If you see color bars instead of the camera feed:

1. The script falls back to a test pattern if `picamera2` isn't available
2. Check that picamera2 is installed: `python3 -c "import picamera2"`
3. Check that the camera is detected (see "Camera Not Detected" above)

## Advanced Configuration

### Multiple Cameras

You can run multiple instances with different cameras by:

1. Creating multiple config files (e.g., `pi_camera_config_front.json`, `pi_camera_config_back.json`)
2. Modifying the script to select different camera devices
3. Running multiple services with different `PI_CAMERA_CONFIG` environment variables

### Custom Video Settings

Edit `pi_camera_broadcaster.py` to adjust video quality:

```python
# In PiCameraTrack.__init__(), around line 49:
config = self.camera.create_video_configuration(
    main={"size": (1920, 1080), "format": "RGB888"},  # Higher resolution
    controls={"FrameRate": 60}  # Higher framerate
)
```

Note: Higher settings require more CPU and bandwidth.

### Adding Audio

The current implementation is video-only. To add audio:

1. Add an audio track to the RTCPeerConnection
2. Capture audio from a USB microphone or I2S device
3. Use `aiortc`'s audio capabilities to stream it

## System Requirements

### Minimum

- Raspberry Pi 3B+
- 512MB RAM available
- 1280x720 @ 15fps

### Recommended

- Raspberry Pi 4 (2GB or more)
- 1GB RAM available
- 1280x720 @ 30fps

### Performance Tips

1. **Disable desktop**: Run headless for better performance
2. **Overclock**: Safely overclock the Pi if needed
3. **Reduce resolution**: Lower resolution uses less CPU
4. **Limit endpoints**: Broadcast to fewer endpoints if needed

## Security Considerations

1. **Network**: Ensure only trusted devices can access your server
2. **SSL**: Use proper SSL certificates in production
3. **Updates**: Keep your Pi and Python packages updated
4. **Firewall**: Configure firewall rules appropriately

## How It Works

1. **Startup**: Script initializes Pi camera and connects to Socket.io server
2. **Name Broadcast**: Sends camera name to all configured endpoints
3. **Peer Discovery**: Listens for new peers joining camera rooms
4. **WebRTC Setup**: Creates peer connections using STUN for NAT traversal
5. **Media Streaming**: Streams H.264 video from Pi camera to all connected peers
6. **Reconnection**: Automatically reconnects if connection drops

The broadcaster acts just like a browser client, participating in the same WebRTC mesh as all other peers.

## Uninstalling

To remove the service:

```bash
sudo systemctl stop pi-camera-broadcaster
sudo systemctl disable pi-camera-broadcaster
sudo rm /etc/systemd/system/pi-camera-broadcaster.service
sudo systemctl daemon-reload
```

To remove Python dependencies (just delete the virtual environment):

```bash
rm -rf /path/to/stuffedanimalwar/venv
```

## Support

If you encounter issues:

1. Check the logs: `sudo journalctl -u pi-camera-broadcaster -n 100`
2. Test manually: Run `python3 pi_camera_broadcaster.py` and watch for errors
3. Check server logs: Look for Socket.io connection messages
4. Verify camera works: Test with `libcamera-hello` or `rpicam-hello`

## License

Same as Stuffed Animal War project.
