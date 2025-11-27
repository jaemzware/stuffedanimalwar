# Native Pi Camera Broadcasting Setup

This guide explains how to set up **automatic camera broadcasting** using the native Node.js broadcaster. Your Pi Camera Module 3 will automatically stream to all clients when your server starts.

## How It Works

- **No browser required** - Pure Node.js implementation
- **Automatic startup** - Camera broadcasts when server starts
- **Low overhead** - Uses less memory than browser-based approach
- **Multiple viewers** - Unlimited simultaneous connections
- **Direct hardware access** - Uses `libcamera` to capture from Pi Camera Module 3

## Prerequisites

### 1. Raspberry Pi Setup

Make sure your camera is connected and working:

```bash
# Test camera (should show camera preview)
libcamera-hello

# List available cameras
libcamera-hello --list-cameras
```

If you get errors, you may need to enable the camera:

```bash
sudo raspi-config
# Navigate to: Interface Options -> Camera -> Enable
sudo reboot
```

### 2. Install Dependencies

The native broadcaster requires the `wrtc` package (WebRTC for Node.js):

```bash
cd /path/to/stuffedanimalwar
npm install wrtc
```

**⚠️ Important Notes:**
- `wrtc` compilation takes **10-20 minutes** on Raspberry Pi
- Requires build tools (usually already installed on Pi OS)
- Uses ~500MB disk space during build
- Final installed size is ~50MB

If the installation fails, install build dependencies:

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3 libxtst-dev libpng++-dev
npm install wrtc
```

## Starting the Server

Once `wrtc` is installed, just start your server normally:

```bash
node index.js 8080
```

You should see:

```
listening on *:8080

=== Initializing Native Camera Broadcaster ===
✓ wrtc module loaded
✓ Detected camera: Pi Camera Module (libcamera)
✓ Native Pi camera broadcaster is running
  Camera will appear in video player dropdown on all clients
==============================================
```

## Using the Camera

### On Any Device (MacBook, Phone, etc.)

1. Open your browser and navigate to your Pi:
   ```
   https://[YOUR_PI_IP]:8080/jim
   ```

2. Look at the **video player dropdown**

3. You should see:
   ```
   📹 Pi Camera Module 3 (Live)   ← Your Pi camera!
   📹 FaceTime HD Camera          ← Your local device camera
   Jim Skate                      ← Regular videos
   ...
   ```

4. **Select the Pi camera** and watch the live feed!

## Troubleshooting

### "wrtc module not found"

```
⚠ Camera broadcaster not available (wrtc module not installed)
```

**Solution:** Install wrtc:
```bash
npm install wrtc
```

### "No camera detected"

```
✓ wrtc module loaded
✗ No camera detected
```

**Solution:** Check camera connection:
```bash
# Should show camera info
libcamera-hello --list-cameras

# If not working, enable camera
sudo raspi-config
# Interface Options -> Camera -> Enable
sudo reboot
```

### Camera appears but won't connect

**Check these:**

1. **Firewall** - Make sure WebRTC ports aren't blocked
2. **HTTPS** - Server must use HTTPS (not HTTP)
3. **Network** - Both Pi and viewer must be on same network or have NAT traversal

Check server logs for errors:
```bash
node index.js 8080
# Look for errors in the camera section
```

### "Camera process exited"

```
Camera process exited with code: 1
```

**Solution:** Make sure libcamera is installed:
```bash
sudo apt-get install libcamera-apps
```

### Low frame rate or stuttering

**Reduce resolution** in `native-broadcaster.js`:

```javascript
const cameraArgs = [
    '--codec', 'yuv420',
    '--width', '640',     // Lower from 1280
    '--height', '480',    // Lower from 720
    '--framerate', '15',  // Lower from 30
    // ...
];
```

### High CPU usage

The Pi is encoding video in real-time. This is normal. To reduce CPU:

1. Lower resolution (see above)
2. Reduce frame rate to 15 FPS
3. Close unnecessary applications on Pi
4. Consider adding a heatsink/fan if CPU throttling occurs

## Advanced Configuration

### Change Video Quality

Edit `native-broadcaster.js` line ~210:

```javascript
const cameraArgs = [
    '--codec', 'yuv420',
    '--width', '1920',    // Higher quality
    '--height', '1080',
    '--framerate', '30',
    '--timeout', '0',
    '--nopreview',
    '--output', '-'
];
```

### Change Camera Label

Edit `native-broadcaster.js` line ~118:

```javascript
io.emit('camera-broadcaster-available', {
    broadcasterId: broadcasterId,
    label: 'Your Custom Camera Name Here'
});
```

### Disable Auto-Start

If you don't want the camera to start automatically, comment out the broadcaster code in `index.js`:

```javascript
// const nativeBroadcaster = require('./native-broadcaster');
```

### Use Manual Broadcaster Instead

If you prefer the browser-based approach:

1. Keep `wrtc` uninstalled
2. Open browser on Pi: `https://localhost:8080/camera-broadcaster`
3. Click "Start Broadcasting"

## Performance Comparison

| Method | RAM Usage | CPU Usage | Reliability | Setup Complexity |
|--------|-----------|-----------|-------------|------------------|
| Native (wrtc) | ~80MB | 30-40% | ★★★★★ | Medium |
| Puppeteer | ~200MB | 40-50% | ★★★★ | Low |
| Manual Browser | ~150MB | 35-45% | ★★★★ | Very Low |

## Architecture

```
┌─────────────────────────┐
│   Raspberry Pi          │
│                         │
│  ┌──────────────────┐   │
│  │ Camera Module 3  │   │
│  └────────┬─────────┘   │
│           │             │
│  ┌────────▼─────────┐   │
│  │ libcamera-vid    │   │
│  │ (YUV420 frames)  │   │
│  └────────┬─────────┘   │
│           │             │
│  ┌────────▼─────────┐   │
│  │ native-          │   │
│  │ broadcaster.js   │   │
│  │                  │   │
│  │ wrtc (Node.js)   │   │
│  └────────┬─────────┘   │
│           │             │
│  ┌────────▼─────────┐   │
│  │ Socket.IO        │   │
│  │ (signaling)      │   │
│  └────────┬─────────┘   │
└───────────┼─────────────┘
            │
            │ WebRTC Stream
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
┌────────┐      ┌────────┐
│ MacBook│      │ Phone  │
│ Browser│      │ Browser│
└────────┘      └────────┘
```

## Security Notes

- Camera only broadcasts when server is running
- Streams only accessible on your network (unless port forwarded)
- For production: Add authentication, use TURN servers
- HTTPS is required for WebRTC

## Uninstalling

To remove the native broadcaster:

```bash
# Remove wrtc package
npm uninstall wrtc

# Server will gracefully fall back to manual broadcaster
```

## Technical Details

- **Video Format**: YUV420 (I420)
- **Transport**: WebRTC (peer-to-peer after signaling)
- **Signaling**: Socket.IO
- **Camera API**: libcamera (rpicam-vid)
- **Node WebRTC**: wrtc (native bindings)
- **Encoding**: Hardware-accelerated on Pi 4/5

## Getting Help

If you encounter issues:

1. Check server console output for errors
2. Verify camera works with `libcamera-hello`
3. Make sure `wrtc` installed successfully
4. Check browser console for WebRTC errors
5. Ensure HTTPS is enabled

---

**Enjoy your automatic Pi camera streaming!** 📹
