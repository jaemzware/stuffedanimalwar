# Pi Camera WebRTC Broadcasting Setup

This guide explains how to broadcast your Raspberry Pi Camera Module 3 live video feed to the Stuffed Animal War video player using WebRTC.

## How It Works

1. **Broadcaster**: A web page running on your Pi that captures the camera and broadcasts via WebRTC
2. **Server**: Relays WebRTC signaling between broadcaster and viewers
3. **Viewers**: See "📹 Pi Camera Module 3 (Live)" in the video player dropdown

## Setup Instructions

### 1. Start Your Server

Make sure your Stuffed Animal War server is running:

```bash
node index.js
```

### 2. Open the Broadcaster on Your Pi

On your Raspberry Pi, open a web browser (Chromium recommended) and navigate to:

```
http://localhost:8080/camera-broadcaster
```

Or if accessing from another device on your network:

```
http://[YOUR_PI_IP]:8080/camera-broadcaster
```

### 3. Start Broadcasting

1. Click the "Start Broadcasting" button
2. Grant camera permissions when prompted
3. You should see your camera feed in the preview
4. The status will show "Broadcasting - Waiting for viewers..."

### 4. View the Camera Feed

On any device connected to your network:

1. Navigate to your Stuffed Animal War endpoint (e.g., `http://[YOUR_PI_IP]:8080/jim`)
2. Look at the video player dropdown
3. You should see "📹 Pi Camera Module 3 (Live)" at the top
4. Select it to view the live camera feed!

## Browser Requirements

### For Broadcasting (Pi)
- **Chromium** (recommended) or **Firefox**
- Camera permissions must be granted
- HTTPS or localhost (for getUserMedia API)

### For Viewing
- Any modern browser with WebRTC support
- Chrome, Firefox, Safari, Edge all work

## Troubleshooting

### Camera not appearing in dropdown
- Make sure the broadcaster page is open and "Start Broadcasting" was clicked
- Check browser console for errors
- Ensure camera permissions were granted

### "Could not access camera" error
- On Raspberry Pi OS, run: `sudo usermod -a -G video $USER` and reboot
- Make sure no other application is using the camera
- Try `libcamera-hello` to verify camera works

### Connection fails
- Check that both broadcaster and viewer are on the same network
- Verify firewall isn't blocking WebRTC traffic
- Check server console for error messages

### Low quality or lag
- Reduce resolution in `camera-broadcaster.html` (edit the `getUserMedia` constraints)
- Lower frame rate from 30 to 15 or 24
- Ensure good network connection between Pi and viewers

## Advanced Configuration

### Change Video Quality

Edit `camera-broadcaster.html` and modify the video constraints:

```javascript
localStream = await navigator.mediaDevices.getUserMedia({
    video: {
        width: { ideal: 640 },  // Lower for less bandwidth
        height: { ideal: 480 },
        frameRate: { ideal: 15 }  // Lower for smoother on slow networks
    },
    audio: false
});
```

### Change Broadcaster Label

Edit the label sent during registration:

```javascript
socket.emit('register-camera-broadcaster', {
    label: 'Your Custom Label Here'
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
┌─────────────────┐
│  Raspberry Pi   │
│  (Broadcaster)  │
│                 │
│  Camera Module  │──┐
│  getUserMedia   │  │
│  WebRTC Stream  │  │
└─────────────────┘  │
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
- Consider using TURN servers for firewall traversal
- HTTPS is required for getUserMedia on non-localhost domains

## Multiple Cameras

To broadcast multiple cameras:

1. Open multiple browser tabs with `/camera-broadcaster`
2. Each will register as a separate broadcaster
3. Different cameras will appear as separate options in the dropdown

## Performance Tips

- Close unnecessary applications on the Pi
- Use ethernet instead of WiFi for the Pi if possible
- Monitor CPU usage with `htop`
- Consider overclocking the Pi for better encoding performance

## Stop Broadcasting

Simply close the broadcaster browser tab or click "Stop Broadcasting". The camera option will automatically be removed from viewers' dropdowns.

---

**Enjoy your live Pi camera feed!** 📹
