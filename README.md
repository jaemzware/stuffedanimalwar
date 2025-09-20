# StuffedAnimalWar

A privacy-focused, real-time chat, game, and media sharing platform built with Node.js and Socket.io. **No data is ever stored** - all messages, images, videos, and game states exist only in memory during active sessions.

## ✨ Features

### Privacy & Security
- **Zero Data Persistence**: No databases, no logs, no traces - all shared content is ephemeral
- **Completely Offline**: Works on local networks without internet connectivity
- **Privacy by Design**: No registration, no tracking, no data collection

### Platform & Deployment
- **IoT Ready**: Perfect for Raspberry Pi deployment as a portable social hub
- **Cross-Platform**: Access from any device with a web browser (phones, tablets, laptops)
- **Template-Driven Multi-tenancy**: JSON-configured themed rooms with unique animals, media, and responses
- **Multi-Endpoint Support**: Host multiple themed rooms with custom configurations

### Audio & Media
- **MP3 Metadata Display**: Automatic extraction and display of song info, album art, and track details
- **DJ Mode**: Designated users can control music for all participants
- **Media Streaming**: Share audio, images, and video in real-time without storage
- **Live File Broadcasting**: Upload images/videos that instantly broadcast to all users without storage

### Drawing & Visuals
- **Real-time Drawing**: Freeform collaborative drawing with live stroke broadcasting
- **Multi-color Drawing**: Users can select different colors for drawing lines and game elements
- **Dynamic Backgrounds**: Click any shared image to make it the drawing canvas background
- **Mobile-Optimized Touch**: Responsive drawing with proper coordinate mapping and scroll prevention

### Game Mechanics
- **Interactive Game**: Stuffed Animal War - a collaborative/competitive game with customizable animals
- **Advanced Physics**: Sine wave animations, directional movement patterns, speed controls
- **Hit Detection & Scoring**: Real collision detection between game elements with point tracking
- **Game Mechanics**: Place animals, remove them with bullets, all in customizable colors

### Communication
- **Real-time Communication**: Instant chat, media sharing, and game interactions via WebSockets

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+ recommended)
- npm

### Installation Options

### Docker Deployment (Recommended)

The easiest way to run StuffedAnimalWar is with Docker:

```bash
git clone https://github.com/jaemzware/stuffedanimalwar.git
cd stuffedanimalwar
docker-compose up -d
```

**Access the application:**
- On the host machine: `https://localhost:55556/{endpoint}`
- Share with friends on same network: `https://YOUR_LOCAL_IP:55556/{endpoint}`
- Find your local IP: `hostname -I` (Linux/Mac) or `ipconfig` (Windows)

**Custom SSL certificates:**
Place your certificates in the `./sslcert/` directory or set environment variables in a `.env` file.

**Stopping the service:**
```bash
docker-compose down
```

**Viewing logs:**
```bash
docker-compose logs -f
```

#### Standard Installation
1. **Clone the repository**
   ```bash
   git clone https://github.com/jaemzware/stuffedanimalwar.git
   cd stuffedanimalwar
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Generate SSL certificates (required for HTTPS)**
   ```bash
   mkdir sslcert
   cd sslcert
   
   # Generate self-signed certificate for local development
   openssl genrsa -out key.pem 4096
   openssl req -x509 -new -sha256 -nodes -key key.pem -days 1095 -out certificate.pem -subj "/CN=localhost/O=stuffedanimalwar/C=US"
   
   cd ..
   ```

4. **Start the server**
   ```bash
   # Default port 55556
   node .
   
   # Custom port
   node . 9000
   ```

#### IoT/Raspberry Pi Setup
Perfect for creating a **portable, offline social hub** on your local network:

1. **Install Node.js on Raspberry Pi**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone and setup**
   ```bash
   git clone https://github.com/jaemzware/stuffedanimalwar.git
   cd stuffedanimalwar
   npm install
   ```

3. **Run as service (optional)**
   ```bash
   # Install PM2 for process management
   npm install -g pm2
   pm2 start index.js --name "stuffedanimalwar"
   pm2 startup
   pm2 save
   ```

4. **Access from any device on your network**
   - Find your Pi's IP: `hostname -I`
   - Connect from phones/laptops: `https://192.168.1.XXX:55556/{endpoint}`
   - Works completely offline - no internet required!

## 📁 Project Structure

```
stuffedanimalwar/
├── index.js                    # Express server & Socket.io handler
├── template.html              # Client-side interface template
├── stuffedanimalwarmechanics.js # Game logic (client-side)
├── utilities.js               # Audio/video player utilities
├── sockethandler.js           # Client-side socket event handlers
├── {username}.json            # Configuration files for each endpoint
└── package.json
```

## ⚙️ Configuration

### Setting Up Endpoints

1. **Define endpoints** in `index.js`:
   ```javascript
   const stuffedAnimalWarEndpoints = ['fromkittehwithlove', 'maddie', 'jacob', 'katie', 'mark', 'nina'];
   ```

2. **Create configuration files** for each endpoint:
   - Each endpoint needs a corresponding `{username}.json` file
   - Example: `maddie` endpoint requires `maddie.json`

### Configuration File Structure

Each `.json` file customizes the endpoint experience with multiple sections:

```json
{
   "endpoint": "maddie",
   "masterAlias": "MADDIE",
   "unspecifiedAlias": "anonymous",
   "stuffedAnimalMediaObject": {
      "backgroundimage": "https://example.com/background.jpg",
      "animals": [
         {
            "file": "https://example.com/bear.png",
            "title": "Bear"
         },
         {
            "file": "https://example.com/cat.png",
            "title": "Cat"
         }
      ]
   },
   "mediaObject": {
      "songspath": "https://example.com/audio/",
      "videospath": "https://example.com/videos/",
      "photospath": "https://example.com/images/",
      "songs": [
         {
            "file": "song1.mp3",
            "title": "My Favorite Song"
         }
      ],
      "videos": [
         {
            "file": "video1.mp4",
            "title": "Cool Video",
            "poster": "https://example.com/thumbnail.jpg"
         }
      ],
      "photos": [
         {
            "file": "photo1.jpg",
            "title": "Cool Photo"
         }
      ]
   },
   "responsesObject": {
      "responses": [
         {"response": "nice"},
         {"response": "that's cool"},
         {"response": "LOL"},
         {"response": "i know right"}
      ]
   }
}
```

### Configuration Sections

- **`endpoint`**: The URL endpoint name
- **`masterAlias`**: DJ name with special privileges (music control, chat/board clearing)
- **`unspecifiedAlias`**: Default name for anonymous users
- **`stuffedAnimalMediaObject`**: Game configuration with background and animal sprites
- **`mediaObject`**: Media library with base paths and file lists for songs, videos, photos
- **`responsesObject`**: Pre-defined chat responses for quick replies

## 🎨 Collaborative Drawing & Game Board

### Real-time Visual Collaboration
- **Freeform Drawing**: Draw freely on the game board with live stroke broadcasting to all users
- **Advanced Physics Engine**: Animals and bullets move with sine wave patterns, directional controls, and speed adjustments
- **Color Selection**: Each user can choose their own color for drawing lines and game elements
- **Dynamic Backgrounds**: Click any shared image thumbnail to instantly make it the canvas background
- **Multi-layered Interaction**: Combine drawings with game elements seamlessly
- **Mobile-Optimized Touch**: Responsive drawing with proper coordinate mapping and scroll prevention

### Game Mechanics
- **Animal Placement**: Add stuffed animals to the board from your custom collection
- **Bullet System**: Remove animals from the board using colored bullets with realistic collision detection
- **Hit Detection & Scoring**: Real-time collision detection between bullets and animals with point tracking
- **Color Coding**: All elements (animals, bullets, drawing lines) can be assigned colors for user identification
- **Movement Patterns**: Choose from directional movement, sine waves, or stationary placement
- **Speed Controls**: Adjustable speed settings for all moving elements
- **Real-time Updates**: Every action broadcasts instantly to all connected users

### Creative Features
- **Persistent Canvas**: Drawings and game state remain until manually cleared or server restart
- **Collaborative Art**: Multiple users drawing simultaneously with different colors
- **Interactive Annotations**: Draw over shared photos, diagrams, or any uploaded image
- **Live File Broadcasting**: Upload images/videos with progress tracking that instantly appear for all users
- **MP3 Metadata Integration**: Automatic song information, album art, and track display
- **Visual Communication**: Express ideas through both structured game elements and freeform drawing

## 🎮 How It Works

### Socket Events

**Chat Events**: `{endpoint}chatmessage`
- Broadcasts chat messages, media URLs, and DJ commands
- Example: `maddiechatmessage` for the 'maddie' endpoint

**Game Events**: `{endpoint}tapmessage`
- Handles game interactions: animal placement, bullet firing, color changes
- Broadcasts real-time drawing paths with color information as users draw
- Updates dynamic background changes when images are selected
- Manages game board state including animal positions and bullet interactions
- Example: `maddietapmessage` for the 'maddie' endpoint

### DJ Privileges

Users with the configured `masterAlias` can:
- **Synchronized multi-device audio**: Control music across all connected devices simultaneously
- Change music for all connected clients by selecting songs or pasting MP3 URLs in chat
- Clear the chat for everyone
- Reset the game board
- Create makeshift stereo systems using phones, tablets, computers, and Bluetooth speakers

**Party Audio Setup**: Connect multiple devices around your space (phones on Bluetooth speakers, tablets, laptops) to the same endpoint. The DJ can change songs and all devices will switch tracks simultaneously, creating a multi-room audio experience without expensive hardware.

**Network Diagnostics**: The synchronized audio playback can help identify network latency differences between devices - slower devices or those with poor connections will exhibit noticeable audio delay, providing an intuitive way to assess your local network performance.

### Privacy Features

- **No data persistence**: Messages and media exist only during active sessions
- **Memory-only storage**: All game states and chat history cleared on server restart
- **No user registration**: Access endpoints directly without accounts
- **No logging**: No chat logs, user tracking, or analytics

## 🔧 Use Cases

### **Offline Social Hub**
- **House parties**: Set up a Pi, everyone connects and shares music/photos instantly
- **Camping/retreats**: Create a local network for group communication without cell service
- **Classrooms**: Teacher-controlled environment for collaborative activities
- **Events**: Pop-up social spaces at conferences, festivals, or gatherings

### **Privacy-Focused Communication**
- **Sensitive discussions**: Everything disappears when the session ends
- **Family gatherings**: Share photos and memories without cloud storage
- **Creative collaboration**: Draw and annotate together without saving artwork
- **Small communities**: Neighborhood or friend group communication
- **Development/testing**: Safe environment for testing social features

### **Gaming & Entertainment**
- **Game nights**: Combine digital interaction with physical gatherings
- **Strategy games**: Place animals and use bullets in colorful tactical battles
- **Creative workshops**: Collaborative drawing and art sessions on shared canvases
- **Brainstorming sessions**: Draw diagrams, mind maps, and ideas together in real-time
- **Team building**: Interactive group activities with color-coded participation
- **Art collaboration**: Multiple people drawing on the same canvas simultaneously with different colors

## 🛡️ Privacy & Security

This platform is designed with privacy as a core principle:

- **Ephemeral by design**: All data exists only in memory during sessions
- **No databases**: Zero persistent storage of any user content
- **No tracking**: No user analytics, cookies, or behavioral tracking
- **Offline capable**: Works completely without internet connectivity
- **Local network only**: Can be isolated from external networks entirely
- **Decentralized**: Host your own instance for complete control
- **Open source**: Full transparency of data handling practices

## 🤝 Contributing

We welcome contributions! This project aims to demonstrate that engaging social platforms can exist without sacrificing user privacy.

### Areas for contribution:
- Additional game modes
- Enhanced media streaming capabilities
- Mobile-responsive improvements
- Security enhancements
- Documentation improvements

## 📄 License

Apache License 2.0

## 🔗 Links

- **Repository**: https://github.com/jaemzware/stuffedanimalwar
- **Issues**: https://github.com/jaemzware/stuffedanimalwar/issues
- **Discussions**: https://github.com/jaemzware/stuffedanimalwar/discussions

---

**Built with privacy in mind. No data stored, no tracking, no compromises.**