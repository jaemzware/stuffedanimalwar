#!/usr/bin/env python3
"""
Raspberry Pi Camera WebRTC Broadcaster
Connects to stuffedanimalwar camera endpoints and broadcasts Pi camera feed
"""

import asyncio
import json
import logging
import os
import sys
from typing import Dict, Set
import ssl

import socketio
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, VideoStreamTrack
from aiortc.contrib.media import MediaPlayer
from av import VideoFrame
from fractions import Fraction

# Try to import camera libraries
import numpy as np

try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False
    logging.warning("opencv not available")

try:
    from picamera2 import Picamera2
    from picamera2.encoders import H264Encoder
    from picamera2.outputs import FileOutput
    PICAMERA_AVAILABLE = True
except ImportError:
    PICAMERA_AVAILABLE = False
    logging.warning("picamera2 not available")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PiCameraTrack(VideoStreamTrack):
    """
    Video track that streams from USB camera or Raspberry Pi camera
    """
    def __init__(self):
        super().__init__()
        self.camera = None
        self.camera_type = None
        self.frame_count = 0

        # Try USB camera first (OpenCV)
        if OPENCV_AVAILABLE:
            try:
                cap = cv2.VideoCapture(0)
                if cap.isOpened():
                    # Set camera properties for better quality
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
                    cap.set(cv2.CAP_PROP_FPS, 30)
                    self.camera = cap
                    self.camera_type = "usb"
                    logger.info("USB Camera initialized successfully")
                else:
                    cap.release()
            except Exception as e:
                logger.error(f"Failed to initialize USB Camera: {e}")

        # Try Pi Camera Module if USB camera not found
        if not self.camera and PICAMERA_AVAILABLE:
            try:
                picam = Picamera2()
                # Configure for video streaming
                config = picam.create_video_configuration(
                    main={"size": (1280, 720), "format": "RGB888"},
                    controls={"FrameRate": 30}
                )
                picam.configure(config)
                picam.start()
                self.camera = picam
                self.camera_type = "csi"
                logger.info("Pi Camera Module (CSI) initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Pi Camera Module: {e}")

        if not self.camera:
            logger.warning("No camera found - using test pattern")

    async def recv(self):
        """
        Generate video frames from USB camera, Pi camera, or test pattern
        """
        pts, time_base = await self.next_timestamp()

        if self.camera:
            try:
                if self.camera_type == "usb":
                    # Capture frame from USB camera via OpenCV
                    ret, frame_bgr = self.camera.read()
                    if ret:
                        # Convert BGR to RGB
                        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                        frame = VideoFrame.from_ndarray(frame_rgb, format="rgb24")
                        frame.pts = pts
                        frame.time_base = time_base
                        return frame
                    else:
                        logger.error("Failed to read from USB camera")
                elif self.camera_type == "csi":
                    # Capture frame from Pi Camera Module
                    array = self.camera.capture_array()
                    frame = VideoFrame.from_ndarray(array, format="rgb24")
                    frame.pts = pts
                    frame.time_base = time_base
                    return frame
            except Exception as e:
                logger.error(f"Error capturing from {self.camera_type} camera: {e}")

        # Generate test pattern (color bars)
        width, height = 1280, 720

        # Create color bars
        img = np.zeros((height, width, 3), dtype=np.uint8)
        bar_width = width // 7
        colors = [
            (255, 255, 255),  # White
            (255, 255, 0),    # Yellow
            (0, 255, 255),    # Cyan
            (0, 255, 0),      # Green
            (255, 0, 255),    # Magenta
            (255, 0, 0),      # Red
            (0, 0, 255),      # Blue
        ]

        for i, color in enumerate(colors):
            start_x = i * bar_width
            end_x = start_x + bar_width if i < 6 else width
            img[:, start_x:end_x] = color

        frame = VideoFrame.from_ndarray(img, format="rgb24")
        frame.pts = pts
        frame.time_base = time_base

        # Wait to maintain ~30 fps
        await asyncio.sleep(1 / 30)

        return frame

    def stop(self):
        """Clean up camera resources"""
        super().stop()
        if self.camera:
            try:
                if self.camera_type == "usb":
                    self.camera.release()
                    logger.info("USB camera released")
                elif self.camera_type == "csi":
                    self.camera.stop()
                    self.camera.close()
                    logger.info("Pi Camera Module stopped and closed")
            except Exception as e:
                logger.error(f"Error stopping {self.camera_type} camera: {e}")


class CameraBroadcaster:
    """
    Manages WebRTC connections to multiple camera endpoints
    """
    def __init__(self, server_url: str, camera_name: str, endpoints: list, verify_ssl: bool = False):
        self.server_url = server_url
        self.camera_name = camera_name
        self.endpoints = endpoints
        self.verify_ssl = verify_ssl

        # Socket.io client
        self.sio = socketio.AsyncClient(
            ssl_verify=verify_ssl,
            logger=logger,
            engineio_logger=logger
        )

        # Track peer connections per endpoint
        self.peer_connections: Dict[str, Dict[str, RTCPeerConnection]] = {}
        self.video_track = None

        # Setup Socket.io event handlers
        self.setup_socketio_handlers()

    def setup_socketio_handlers(self):
        """Setup Socket.io event handlers for all endpoints"""

        @self.sio.event
        async def connect():
            logger.info("Connected to Socket.io server")
            await self.send_name_updates()

        @self.sio.event
        async def disconnect():
            logger.warning("Disconnected from Socket.io server")

        @self.sio.event
        async def connect_error(data):
            logger.error(f"Connection error: {data}")

        # Use catch-all to manually route events to handlers
        @self.sio.on("*")
        async def catch_all(event, data):
            logger.info(f"CATCH-ALL TRIGGERED: event='{event}'")
            # Route camera events to appropriate handlers
            for endpoint in self.endpoints:
                prefix = f"{endpoint}cameracamera"
                logger.info(f"DEBUG: Checking endpoint='{endpoint}', prefix='{prefix}', looking for '{prefix}connect'")

                if event == f"{prefix}connect":
                    logger.info(f"Routing {event} to handle_peer_join")
                    await self.handle_peer_join(endpoint, data)
                elif event == f"{prefix}reconnect":
                    logger.info(f"Routing {event} to handle_reconnect_request")
                    await self.handle_reconnect_request(endpoint, data)
                elif event == f"{prefix}voiceoffer":
                    await self.handle_remote_offer(endpoint, data)
                elif event == f"{prefix}voiceanswer":
                    await self.handle_remote_answer(endpoint, data)
                elif event == f"{prefix}voiceicecandidate":
                    await self.handle_remote_ice_candidate(endpoint, data)
                elif event == f"{prefix}disconnect":
                    await self.handle_peer_leave(endpoint, data)

    def _register_endpoint_handlers(self, endpoint: str):
        """Register Socket.io handlers for a specific endpoint"""
        event_prefix = f"{endpoint}cameracamera"

        # Handle incoming offers
        async def handle_offer(data):
            await self.handle_remote_offer(endpoint, data)
        self.sio.on(f"{event_prefix}voiceoffer", handle_offer)

        # Handle incoming answers
        async def handle_answer(data):
            await self.handle_remote_answer(endpoint, data)
        self.sio.on(f"{event_prefix}voiceanswer", handle_answer)

        # Handle ICE candidates
        async def handle_ice_candidate(data):
            await self.handle_remote_ice_candidate(endpoint, data)
        self.sio.on(f"{event_prefix}voiceicecandidate", handle_ice_candidate)

        # Handle peer connections (new peer joined)
        async def handle_peer_connect(data):
            logger.info(f"Handler triggered for {endpoint}connect with data: {data}")
            await self.handle_peer_join(endpoint, data)
        self.sio.on(f"{event_prefix}connect", handle_peer_connect)

        # Handle peer disconnections
        async def handle_peer_disconnect(data):
            await self.handle_peer_leave(endpoint, data)
        self.sio.on(f"{event_prefix}disconnect", handle_peer_disconnect)

        # Handle reconnect requests
        async def handle_reconnect(data):
            await self.handle_reconnect_request(endpoint, data)
        self.sio.on(f"{event_prefix}reconnect", handle_reconnect)

    async def send_name_updates(self):
        """Send camera name to all endpoints"""
        for endpoint in self.endpoints:
            event_name = f"{endpoint}cameracamera" + "nameupdate"
            await self.sio.emit(event_name, {"cameraName": self.camera_name})
            logger.info(f"Sent name update to {endpoint}: {self.camera_name}")

    async def create_peer_connection(self, endpoint: str, peer_id: str) -> RTCPeerConnection:
        """Create a new RTCPeerConnection for a peer"""

        pc = RTCPeerConnection(configuration={
            "iceServers": [
                {"urls": "stun:stun.l.google.com:19302"},
                {"urls": "stun:stun1.l.google.com:19302"},
            ]
        })

        # Store peer connection
        if endpoint not in self.peer_connections:
            self.peer_connections[endpoint] = {}
        self.peer_connections[endpoint][peer_id] = pc

        # Add video track
        if not self.video_track:
            self.video_track = PiCameraTrack()

        pc.addTrack(self.video_track)
        logger.info(f"Added video track to peer connection for {endpoint}/{peer_id}")

        # Setup event handlers
        @pc.on("icecandidate")
        async def on_icecandidate(candidate):
            if candidate:
                event_name = f"{endpoint}cameracamera" + "voiceicecandidate"
                await self.sio.emit(event_name, {
                    "candidate": {
                        "candidate": candidate.candidate,
                        "sdpMid": candidate.sdpMid,
                        "sdpMLineIndex": candidate.sdpMLineIndex,
                    },
                    "to": peer_id
                })
                logger.debug(f"Sent ICE candidate to {endpoint}/{peer_id}")

        @pc.on("connectionstatechange")
        async def on_connectionstatechange():
            logger.info(f"Connection state for {endpoint}/{peer_id}: {pc.connectionState}")
            if pc.connectionState in ["failed", "closed"]:
                await self.cleanup_peer_connection(endpoint, peer_id)

        return pc

    async def handle_peer_join(self, endpoint: str, data: dict):
        """Handle new peer joining the room"""
        peer_id = data.get("userId")
        if not peer_id:
            return

        logger.info(f"Peer joined {endpoint}: {peer_id}")

        # Create peer connection and send offer
        pc = await self.create_peer_connection(endpoint, peer_id)

        # Create and send offer
        offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        event_name = f"{endpoint}cameracamera" + "voiceoffer"
        await self.sio.emit(event_name, {
            "offer": {
                "type": pc.localDescription.type,
                "sdp": pc.localDescription.sdp,
            },
            "to": peer_id,
            "cameraName": self.camera_name
        })
        logger.info(f"Sent offer to {endpoint}/{peer_id}")

    async def handle_reconnect_request(self, endpoint: str, data: dict):
        """Handle reconnect request from existing peer"""
        peer_id = data.get("userId")
        if not peer_id or peer_id == self.sio.sid:
            return  # Don't reconnect to ourselves

        logger.info(f"Reconnect request from {endpoint}/{peer_id}")

        # Clean up existing connection if any
        await self.cleanup_peer_connection(endpoint, peer_id)

        # Create new connection and send offer
        pc = await self.create_peer_connection(endpoint, peer_id)

        offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        event_name = f"{endpoint}cameracamera" + "voiceoffer"
        await self.sio.emit(event_name, {
            "offer": {
                "type": pc.localDescription.type,
                "sdp": pc.localDescription.sdp,
            },
            "to": peer_id,
            "cameraName": self.camera_name
        })
        logger.info(f"Sent offer in response to reconnect from {endpoint}/{peer_id}")

    async def handle_remote_offer(self, endpoint: str, data: dict):
        """Handle incoming offer from a peer"""
        peer_id = data.get("from")
        offer = data.get("offer")

        if not peer_id or not offer:
            return

        logger.info(f"Received offer from {endpoint}/{peer_id}")

        # Create peer connection
        pc = await self.create_peer_connection(endpoint, peer_id)

        # Set remote description
        await pc.setRemoteDescription(RTCSessionDescription(
            sdp=offer["sdp"],
            type=offer["type"]
        ))

        # Create and send answer
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        event_name = f"{endpoint}cameracamera" + "voiceanswer"
        await self.sio.emit(event_name, {
            "answer": {
                "type": pc.localDescription.type,
                "sdp": pc.localDescription.sdp,
            },
            "to": peer_id,
            "cameraName": self.camera_name
        })
        logger.info(f"Sent answer to {endpoint}/{peer_id}")

    async def handle_remote_answer(self, endpoint: str, data: dict):
        """Handle incoming answer from a peer"""
        peer_id = data.get("from")
        answer = data.get("answer")

        if not peer_id or not answer:
            return

        logger.info(f"Received answer from {endpoint}/{peer_id}")

        # Get peer connection
        pc = self.peer_connections.get(endpoint, {}).get(peer_id)
        if not pc:
            logger.warning(f"No peer connection found for {endpoint}/{peer_id}")
            return

        # Set remote description
        await pc.setRemoteDescription(RTCSessionDescription(
            sdp=answer["sdp"],
            type=answer["type"]
        ))

    async def handle_remote_ice_candidate(self, endpoint: str, data: dict):
        """Handle incoming ICE candidate from a peer"""
        peer_id = data.get("from")
        candidate_data = data.get("candidate")

        if not peer_id or not candidate_data:
            return

        logger.debug(f"Received ICE candidate from {endpoint}/{peer_id}")

        # Get peer connection
        pc = self.peer_connections.get(endpoint, {}).get(peer_id)
        if not pc:
            logger.warning(f"No peer connection found for {endpoint}/{peer_id}")
            return

        # Add ICE candidate
        candidate = RTCIceCandidate(
            candidate=candidate_data["candidate"],
            sdpMid=candidate_data.get("sdpMid"),
            sdpMLineIndex=candidate_data.get("sdpMLineIndex")
        )
        await pc.addIceCandidate(candidate)

    async def handle_peer_leave(self, endpoint: str, data: dict):
        """Handle peer leaving the room"""
        peer_id = data.get("userId")
        if not peer_id:
            return

        logger.info(f"Peer left {endpoint}: {peer_id}")
        await self.cleanup_peer_connection(endpoint, peer_id)

    async def cleanup_peer_connection(self, endpoint: str, peer_id: str):
        """Clean up a peer connection"""
        if endpoint in self.peer_connections and peer_id in self.peer_connections[endpoint]:
            pc = self.peer_connections[endpoint][peer_id]
            await pc.close()
            del self.peer_connections[endpoint][peer_id]
            logger.info(f"Cleaned up peer connection for {endpoint}/{peer_id}")

    async def start(self):
        """Start the broadcaster"""
        logger.info(f"Connecting to {self.server_url}")
        logger.info(f"Broadcasting to endpoints: {', '.join(self.endpoints)}")
        logger.info(f"Camera name: {self.camera_name}")

        # Connect to Socket.io server
        await self.sio.connect(
            self.server_url,
            transports=['websocket']
        )

        # Wait forever
        await self.sio.wait()

    async def stop(self):
        """Stop the broadcaster and clean up resources"""
        logger.info("Stopping broadcaster...")

        # Close all peer connections
        for endpoint in list(self.peer_connections.keys()):
            for peer_id in list(self.peer_connections[endpoint].keys()):
                await self.cleanup_peer_connection(endpoint, peer_id)

        # Stop video track
        if self.video_track:
            self.video_track.stop()

        # Disconnect from Socket.io
        await self.sio.disconnect()

        logger.info("Broadcaster stopped")


async def main():
    """Main entry point"""

    # Load configuration from environment or config file
    config_file = os.environ.get("PI_CAMERA_CONFIG", "pi_camera_config.json")

    # Default configuration
    config = {
        "server_url": "https://localhost:55556",
        "camera_name": "📹 Pi Camera",
        "endpoints": ["jim", "katie", "jacob", "maddie", "mark", "nina", "onboard"],
        "verify_ssl": False
    }

    # Load from file if exists
    if os.path.exists(config_file):
        try:
            with open(config_file, 'r') as f:
                file_config = json.load(f)
                config.update(file_config)
            logger.info(f"Loaded configuration from {config_file}")
        except Exception as e:
            logger.warning(f"Failed to load config file: {e}, using defaults")

    # Override with environment variables if set
    if os.environ.get("SERVER_URL"):
        config["server_url"] = os.environ.get("SERVER_URL")
    if os.environ.get("CAMERA_NAME"):
        config["camera_name"] = os.environ.get("CAMERA_NAME")
    if os.environ.get("ENDPOINTS"):
        config["endpoints"] = os.environ.get("ENDPOINTS").split(",")

    # Create and start broadcaster
    broadcaster = CameraBroadcaster(
        server_url=config["server_url"],
        camera_name=config["camera_name"],
        endpoints=config["endpoints"],
        verify_ssl=config["verify_ssl"]
    )

    try:
        await broadcaster.start()
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
    finally:
        await broadcaster.stop()


if __name__ == "__main__":
    asyncio.run(main())
