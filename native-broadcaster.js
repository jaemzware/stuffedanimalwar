/**
 * Native Node.js Camera Broadcaster for Raspberry Pi
 *
 * This module uses node-webrtc to broadcast the Pi camera without needing
 * a browser. It captures video using libcamera and streams via WebRTC.
 */

const { spawn } = require('child_process');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

let io = null;
let peerConnections = new Map(); // Map of viewerId -> RTCPeerConnection
let cameraProcess = null;
let isStreaming = false;
let wrtc = null;
let broadcasterId = null;

/**
 * Detect camera type and availability
 */
async function detectCamera() {
    const detectionMethods = [
        {
            name: 'Pi Camera Module (libcamera)',
            command: 'libcamera-hello --list-cameras',
            check: (output) => !output.includes('No cameras available') && output.trim().length > 0
        },
        {
            name: 'V4L2 Camera',
            command: 'v4l2-ctl --list-devices',
            check: (output) => output.trim().length > 0
        },
        {
            name: 'Video Device',
            command: 'ls /dev/video*',
            check: (output) => output.includes('/dev/video')
        }
    ];

    for (const method of detectionMethods) {
        try {
            const { stdout } = await execPromise(method.command + ' 2>&1');
            if (method.check(stdout)) {
                console.log(`✓ Detected camera: ${method.name}`);
                return method.name;
            }
        } catch (err) {
            // Method not available, try next
        }
    }

    console.log('✗ No camera detected');
    return null;
}

/**
 * Initialize the broadcaster with Socket.IO instance
 */
function initialize(socketIO) {
    io = socketIO;

    // Try to load wrtc (node-webrtc)
    try {
        // Try @roamhq/wrtc first (pre-built for ARM)
        wrtc = require('@roamhq/wrtc');
        console.log('✓ wrtc module loaded (@roamhq/wrtc)');
    } catch (err) {
        try {
            // Fallback to standard wrtc
            wrtc = require('wrtc');
            console.log('✓ wrtc module loaded (wrtc)');
        } catch (err2) {
            console.log('✗ wrtc module not found - install with: npm install @roamhq/wrtc');
            console.log('  Or: npm install wrtc');
            return false;
        }
    }

    setupSocketHandlers();
    return true;
}

/**
 * Setup Socket.IO event handlers
 */
function setupSocketHandlers() {
    io.on('connection', (socket) => {
        // Handle viewer requesting camera stream
        socket.on('request-camera-stream', async (data) => {
            if (data.broadcasterId === broadcasterId) {
                console.log('Viewer requesting stream:', socket.id);
                await handleViewerRequest(socket.id);
            }
        });

        // Handle answer from viewer
        socket.on('camera-answer', async (data) => {
            if (data.to === broadcasterId) {
                await handleViewerAnswer(socket.id, data.answer);
            }
        });

        // Handle ICE candidate from viewer
        socket.on('camera-ice-candidate', async (data) => {
            if (data.to === broadcasterId) {
                await handleIceCandidate(socket.id, data.candidate);
            }
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            if (peerConnections.has(socket.id)) {
                console.log('Viewer disconnected:', socket.id);
                const pc = peerConnections.get(socket.id);
                pc.close();
                peerConnections.delete(socket.id);
            }
        });
    });
}

/**
 * Start broadcasting the camera
 */
async function startBroadcasting() {
    if (isStreaming) {
        console.log('Already broadcasting');
        return true;
    }

    // Check for camera
    const cameraType = await detectCamera();
    if (!cameraType) {
        console.log('Cannot start broadcasting: No camera detected');
        return false;
    }

    if (!wrtc) {
        console.log('Cannot start broadcasting: wrtc module not available');
        return false;
    }

    // Generate broadcaster ID
    broadcasterId = 'native-pi-camera-' + Date.now();

    // Announce broadcaster availability
    io.emit('camera-broadcaster-available', {
        broadcasterId: broadcasterId,
        label: 'Pi Camera Module 3 (Live)'
    });

    isStreaming = true;
    console.log('✓ Native broadcaster started');
    console.log('  Broadcaster ID:', broadcasterId);

    return true;
}

/**
 * Handle viewer request for stream
 */
async function handleViewerRequest(viewerId) {
    try {
        // Create peer connection
        const pc = new wrtc.RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        peerConnections.set(viewerId, pc);

        // Create video track from camera
        const videoTrack = await createCameraVideoTrack();

        if (videoTrack) {
            pc.addTrack(videoTrack);
            console.log('Added video track to peer connection');
        } else {
            console.error('Failed to create video track');
            return;
        }

        // Handle ICE candidates
        pc.onicecandidate = ({ candidate }) => {
            if (candidate) {
                io.to(viewerId).emit('camera-ice-candidate', {
                    candidate: candidate,
                    from: broadcasterId
                });
            }
        };

        // Handle connection state
        pc.onconnectionstatechange = () => {
            console.log(`Connection state [${viewerId}]:`, pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                peerConnections.delete(viewerId);
            }
        };

        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        io.to(viewerId).emit('camera-offer', {
            offer: offer,
            from: broadcasterId
        });

        console.log('Sent offer to viewer:', viewerId);

    } catch (err) {
        console.error('Error handling viewer request:', err);
    }
}

/**
 * Handle answer from viewer
 */
async function handleViewerAnswer(viewerId, answer) {
    const pc = peerConnections.get(viewerId);
    if (pc) {
        try {
            await pc.setRemoteDescription(new wrtc.RTCSessionDescription(answer));
            console.log('Set remote description for viewer:', viewerId);
        } catch (err) {
            console.error('Error setting remote description:', err);
        }
    }
}

/**
 * Handle ICE candidate from viewer
 */
async function handleIceCandidate(viewerId, candidate) {
    const pc = peerConnections.get(viewerId);
    if (pc && candidate) {
        try {
            await pc.addIceCandidate(new wrtc.RTCIceCandidate(candidate));
            console.log('Added ICE candidate for viewer:', viewerId);
        } catch (err) {
            console.error('Error adding ICE candidate:', err);
        }
    }
}

/**
 * Create a video track from the Pi camera
 * This is where we capture from libcamera and create a MediaStreamTrack
 */
async function createCameraVideoTrack() {
    try {
        // Use node-webrtc's nonstandard API to create a video source
        const source = new wrtc.nonstandard.RTCVideoSource();
        const track = source.createTrack();

        // Start capturing frames from camera
        startCameraCapture(source);

        return track;

    } catch (err) {
        console.error('Error creating video track:', err);
        return null;
    }
}

/**
 * Capture frames from camera and feed to RTCVideoSource
 */
function startCameraCapture(videoSource) {
    // Use rpicam-vid (libcamera) to capture raw video frames
    // Output format: YUV420 or I420
    const cameraArgs = [
        '--codec', 'yuv420',
        '--width', '1280',
        '--height', '720',
        '--framerate', '30',
        '--timeout', '0',  // Run indefinitely
        '--nopreview',     // No preview window
        '--output', '-'    // Output to stdout
    ];

    // Try rpicam-vid first (newer), fall back to libcamera-vid
    let cameraCommand = 'rpicam-vid';

    cameraProcess = spawn(cameraCommand, cameraArgs);

    let frameBuffer = Buffer.alloc(0);
    const frameSize = 1280 * 720 * 1.5; // YUV420 is 1.5 bytes per pixel

    cameraProcess.stdout.on('data', (data) => {
        frameBuffer = Buffer.concat([frameBuffer, data]);

        // Process complete frames
        while (frameBuffer.length >= frameSize) {
            const frame = frameBuffer.slice(0, frameSize);
            frameBuffer = frameBuffer.slice(frameSize);

            // Convert to I420 frame format for wrtc
            try {
                videoSource.onFrame({
                    width: 1280,
                    height: 720,
                    data: new Uint8ClampedArray(frame)
                });
            } catch (err) {
                console.error('Error feeding frame:', err);
            }
        }
    });

    cameraProcess.stderr.on('data', (data) => {
        // Only log errors, not info messages
        const message = data.toString();
        if (message.includes('ERROR') || message.includes('error')) {
            console.error('Camera error:', message);
        }
    });

    cameraProcess.on('exit', (code) => {
        console.log('Camera process exited with code:', code);

        // If rpicam-vid failed, try libcamera-vid
        if (code !== 0 && cameraCommand === 'rpicam-vid') {
            console.log('Retrying with libcamera-vid...');
            cameraCommand = 'libcamera-vid';
            cameraProcess = spawn(cameraCommand, cameraArgs);
        }
    });

    console.log('Started camera capture process');
}

/**
 * Stop broadcasting
 */
function stopBroadcasting() {
    if (cameraProcess) {
        cameraProcess.kill();
        cameraProcess = null;
    }

    // Close all peer connections
    for (const [viewerId, pc] of peerConnections) {
        pc.close();
    }
    peerConnections.clear();

    if (broadcasterId) {
        io.emit('camera-broadcaster-unavailable', {
            broadcasterId: broadcasterId
        });
    }

    isStreaming = false;
    broadcasterId = null;
    console.log('✓ Broadcasting stopped');
}

/**
 * Check if currently broadcasting
 */
function isBroadcasting() {
    return isStreaming;
}

/**
 * Get broadcaster info (for sending to newly connected clients)
 */
function getBroadcasterInfo() {
    if (!isStreaming || !broadcasterId) {
        return null;
    }
    return {
        broadcasterId: broadcasterId,
        label: 'Pi Camera Module 3 (Live)'
    };
}

// Cleanup on exit
process.on('SIGINT', () => {
    stopBroadcasting();
});

process.on('SIGTERM', () => {
    stopBroadcasting();
});

module.exports = {
    initialize,
    startBroadcasting,
    stopBroadcasting,
    isBroadcasting,
    getBroadcasterInfo,
    detectCamera
};
