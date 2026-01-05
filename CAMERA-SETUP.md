# Camera WebRTC Broadcasting Setup

This guide explains how to broadcast any camera (USB webcam, Pi Camera, etc.) as a live video source to the Stuffed Animal War video player using WebRTC.

## How It Works

1. **Broadcaster**: A web page (`/camera-broadcaster`) that captures your camera and broadcasts via WebRTC
2. **Server**: Relays WebRTC signaling between broadcaster and viewers
3. **Viewers**: See your camera in the video player dropdown on any endpoint

## Setup Instructions

### 1. Start Your Server

Make sure your Stuffed Animal War server is running:

```bash
node index.js
```

### 2. Open the Broadcaster Page

Open a web browser and navigate to:

```
https://localhost:55556/camera-broadcaster
```

Or if accessing from another device on your network:

```
https://[YOUR_SERVER_IP]:55556/camera-broadcaster
```

### 3. Configure and Start Broadcasting

1. **Select your camera** from the dropdown (USB webcam, Pi Camera, etc.)
2. **Enter a label** for your camera (this appears in the video dropdown for viewers)
3. Click **"Start Broadcasting"**
4. Grant camera permissions when prompted
5. You should see your camera feed in the preview

### 4. View the Camera Feed

On any device connected to your network:

1. Navigate to any Stuffed Animal War endpoint (e.g., `https://[YOUR_SERVER_IP]:55556/jim`)
2. Look at the **video player dropdown**
3. You should see your camera with the label you entered (e.g., "USB Webcam")
4. Select it to view the live camera feed!

## Browser Requirements

### For Broadcasting
- **Chrome**, **Chromium**, or **Firefox** (recommended)
- Camera permissions must be granted
- HTTPS or localhost required for camera access

### For Viewing
- Any modern browser with WebRTC support
- Chrome, Firefox, Safari, Edge all work

## Troubleshooting

### Camera not appearing in dropdown
- Make sure the broadcaster page is open and "Start Broadcasting" was clicked
- Check browser console for errors
- Ensure camera permissions were granted
- Verify the server console shows "[BROADCASTER] Registering camera broadcaster"

### "Could not access camera" error
- On Raspberry Pi OS, run: `sudo usermod -a -G video $USER` and reboot
- Make sure no other application is using the camera
- For Pi Camera: Try `libcamera-hello` to verify camera works
- Check if your browser has camera permissions enabled

### Connection fails between broadcaster and viewer
- Check that both broadcaster and viewer can reach the server
- Verify firewall isn't blocking WebRTC traffic (UDP ports)
- Check server console for error messages
- Try a different browser

### Low quality or lag
- Check your network connection
- The broadcaster page automatically uses 1280x720 at 30fps
- For lower bandwidth, you can edit `camera-broadcaster.html` to reduce resolution

## Advanced Configuration

### Change Default Video Quality

Edit `camera-broadcaster.html` and modify the video constraints in `startPreview()`:

```javascript
localStream = await navigator.mediaDevices.getUserMedia({
    video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: 640 },   // Lower for less bandwidth
        height: { ideal: 480 },
        frameRate: { ideal: 15 } // Lower for smoother on slow networks
    },
    audio: false
});
```

### Run Broadcaster in Background (Headless)

For advanced users, you can use Puppeteer to run the broadcaster headless:

```bash
npm install puppeteer
```

Then create a script to launch the page in headless Chromium.

## Architecture

```
┌─────────────────────┐
│  Broadcaster Device │
│  (Any computer/Pi)  │
│                     │
│  USB Webcam or      │
│  Pi Camera          │──┐
│  getUserMedia       │  │
│  WebRTC Stream      │  │
└─────────────────────┘  │
                         │ WebRTC Signaling
                         │ (via Socket.IO)
                         ▼
               ┌──────────────────┐
               │   Node.js Server │
               │   (index.js)     │
               └──────────────────┘
                         │
             ┌───────────┴───────────┐
             │                       │
             ▼                       ▼
    ┌─────────────────┐    ┌─────────────────┐
    │   Viewer 1      │    │   Viewer 2      │
    │   (MacBook)     │    │   (Phone)       │
    │                 │    │                 │
    │  Video Player   │    │  Video Player   │
    └─────────────────┘    └─────────────────┘
```

## Security Notes

- The broadcaster should only be accessible on your local network
- For production use, implement authentication
- TURN servers are included for NAT traversal
- HTTPS is required for getUserMedia on non-localhost domains

## Multiple Cameras

To broadcast multiple cameras:

1. Open multiple browser tabs with `/camera-broadcaster`
2. Select a different camera in each tab
3. Give each a unique label
4. Each will appear as a separate option in the dropdown

## Performance Tips

- Close unnecessary applications on the broadcasting device
- Use ethernet instead of WiFi if possible
- Monitor CPU usage with `htop` or Activity Monitor
- USB 3.0 webcams generally perform better than USB 2.0

## Stop Broadcasting

Simply close the broadcaster browser tab or click "Stop Broadcasting". The camera option will automatically be removed from all viewers' dropdowns.

---

**Enjoy your live camera feed!**
