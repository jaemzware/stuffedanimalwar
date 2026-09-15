//STUFFPEDANIMALWAR HTTP JAEMZWARE
//EXAMPLE STARTED FROM: http://socket.io/get-started/chat/
//setup an express application and bind it to an https server
require('dotenv').config();
let fs = require('fs');
const http = require('http');
const https = require('https');

const useHttps = process.env.USE_HTTPS === 'true';

//SSL CERTS NEED TO BE CREATED LOCALLY IF YOU WANT TO RUN LOCALLY
//openssl genrsa -out key.pem 4096
//openssl req -x509 -new -sha256 -nodes -key key.pem -days 1095 -out certificate.pem -subj "/CN=jaemzwarellc/O=stuffedanimalwar/C=US"
const options = useHttps
    ? {
        key: fs.readFileSync(process.env.SSL_KEY_PATH || './sslcert/key.pem'),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH || './sslcert/certificate.pem')
    }
    : null;

//CREATE EXPRESS AND SOCKET.IO SERVERS
const express = require('express');
const NodeID3 = require('node-id3');
const app = express();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const server = useHttps ? https.createServer(options, app) : http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    pingTimeout: 60000,     // 60 seconds (default is 20000)
    pingInterval: 25000,    // 25 seconds (default is 25000)
    cors: {
        origin: "*",          // Adjust as needed for security
        methods: ["GET", "POST"]
    }
});
const path = require('path');

// ─── MQTT TEMPERATURE MONITORING (Raspberry Pi only) ─────────────────────
// Only initialize MQTT if running on Raspberry Pi (detected by thermal zone file)
if (fs.existsSync('/sys/class/thermal/thermal_zone0/temp')) {
    console.log('[MQTT] Raspberry Pi detected, initializing temperature monitoring');
    const mqtt = require('mqtt');
    const mqttClient = mqtt.connect('mqtt://localhost');

    mqttClient.on('connect', () => {
        console.log('[MQTT] Connected to Mosquitto broker');
        mqttClient.subscribe('pi/temperature', (err) => {
            if (err) console.error('[MQTT] Subscribe error:', err);
            else console.log('[MQTT] Subscribed to pi/temperature');
        });
    });

    mqttClient.on('message', (topic, message) => {
        if (topic === 'pi/temperature') {
            const celsius = parseFloat(message.toString());
            const fahrenheit = (celsius * 9/5) + 32;

            io.emit('temperature', {
                celsius: Math.round(celsius * 10) / 10,
                fahrenheit: Math.round(fahrenheit * 10) / 10,
                timestamp: new Date().toISOString()
            });
        }
    });

    mqttClient.on('error', (err) => {
        console.error('[MQTT] Connection error:', err);
    });
}
const sharp = require('sharp');
const statsLogger = require('./stats-logger');
let listenPort =55556;

// Server instance ID - changes on each restart to invalidate client sessions
const SERVER_INSTANCE_ID = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
console.log(`[SERVER] Instance ID: ${SERVER_INSTANCE_ID}`);

// Thumbnail cache directory
const THUMB_CACHE_DIR = path.join(__dirname, '.thumbcache');
const THUMB_WIDTH = 200; // Thumbnail width in pixels
const setupRouter = require('./pisetup/setup-endpoint'); //RASBERRY PI wifi setup

// File extensions for auto-scanning directories
const PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];

// Cache for directory scan results (persists across requests)
const mediaScanCache = {};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache TTL
const MAX_PHOTOS = 2000; // Max photos to show (prevents huge galleries)
const MAX_VIDEOS = 500; // Max videos to show in dropdown

// IP Blocking configuration
const BLOCKED_IPS_FILE = path.join(__dirname, 'blocked-ips.json');
let blockedIps = new Set();

/**
 * Load blocked IPs from JSON file
 */
function loadBlockedIps() {
    try {
        if (fs.existsSync(BLOCKED_IPS_FILE)) {
            const data = JSON.parse(fs.readFileSync(BLOCKED_IPS_FILE, 'utf8'));
            blockedIps = new Set(data.blocked || []);
            console.log(`[IP-BLOCK] Loaded ${blockedIps.size} blocked IP(s)`);
        }
    } catch (error) {
        console.error('[IP-BLOCK] Error loading blocked IPs:', error.message);
    }
}

// Load blocked IPs on startup
loadBlockedIps();

// ─── ENDPOINT HTML CACHE ────────────────────────────────────────────────────
// Pre-rendered HTML per endpoint so bot floods never hit the filesystem
const endpointHtmlCache = new Map();

/**
 * Pre-load all valid endpoint configs at startup.
 * Falls back to greenland.json for any greenland### room without a custom config.
 * Called once at boot; call again (e.g. after CRUD update) to refresh.
 */
const endpointConfigs = new Map();
function preloadEndpointConfigs() {
    endpointConfigs.clear();
    endpointHtmlCache.clear(); // invalidate rendered HTML too
    const greenlandConfigPath = path.join(__dirname, 'endpoints', 'greenland.json');
    const greenlandConfig = JSON.parse(fs.readFileSync(greenlandConfigPath, 'utf8'));

    for (const name of stuffedAnimalWarEndpoints) {
        try {
            const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'endpoints', name + '.json'), 'utf8'));
            endpointConfigs.set(name, cfg);
        } catch {
            const fallback = { ...greenlandConfig, endpoint: name, masterAlias: name.toUpperCase() };
            endpointConfigs.set(name, fallback);
        }
    }
    for (let i = 1; i <= MAX_GREENLAND_ROOMS; i++) {
        const name = `greenland${String(i).padStart(5, '0')}`;
        try {
            const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'endpoints', name + '.json'), 'utf8'));
            endpointConfigs.set(name, cfg);
        } catch {
            const fallback = { ...greenlandConfig, endpoint: name, masterAlias: name.toUpperCase() };
            endpointConfigs.set(name, fallback);
        }
    }
    console.log(`[CONFIG] Preloaded ${endpointConfigs.size} endpoint configs`);
}

// Watch for changes to blocked-ips.json (hot-reload)
fs.watch(BLOCKED_IPS_FILE, { persistent: false }, (eventType) => {
    if (eventType === 'change') {
        console.log('[IP-BLOCK] Detected change in blocked-ips.json, reloading...');
        setTimeout(loadBlockedIps, 100); // Small delay to ensure file write is complete
    }
});

/**
 * Get client IP from HTTP request
 */
function getClientIpFromRequest(req) {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || '';
}

/**
 * Check if an IP is blocked
 */
function isIpBlocked(ip) {
    return blockedIps.has(ip);
}

/**
 * Express middleware to block IPs on canvas and camera routes
 */
function ipBlockMiddleware(req, res, next) {
    const clientIp = getClientIpFromRequest(req);
    if (isIpBlocked(clientIp)) {
        console.log(`[IP-BLOCK] Blocked HTTP request from ${clientIp} to ${req.path}`);
        return res.status(403).send('Access denied');
    }
    next();
}

/**
 * Recursively scan a directory for files with specific extensions
 * @param {string} basePath - The base directory path to scan
 * @param {string[]} extensions - Array of valid file extensions (lowercase, with dot)
 * @param {string} relativePath - Current relative path from basePath (used internally for recursion)
 * @returns {Array<{file: string, title: string}>} - Array of file objects
 */
function scanDirectoryForMedia(basePath, extensions, relativePath = '') {
    const results = [];
    const currentPath = relativePath ? path.join(basePath, relativePath) : basePath;

    try {
        if (!fs.existsSync(currentPath)) {
            console.log(`Directory does not exist: ${currentPath}`);
            return results;
        }

        const entries = fs.readdirSync(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            // Skip hidden files and directories (starting with .)
            if (entry.name.startsWith('.')) {
                continue;
            }

            const entryRelativePath = relativePath ? path.join(relativePath, entry.name) : entry.name;

            if (entry.isDirectory()) {
                // Recursively scan subdirectories
                const subResults = scanDirectoryForMedia(basePath, extensions, entryRelativePath);
                results.push(...subResults);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (extensions.includes(ext)) {
                    // Create title from filename without extension
                    const title = path.basename(entry.name, ext);
                    results.push({
                        file: entryRelativePath,
                        title: title
                    });
                }
            }
        }
    } catch (error) {
        console.error(`Error scanning directory ${currentPath}:`, error.message);
    }

    // Sort results alphabetically by file path
    results.sort((a, b) => a.file.localeCompare(b.file));

    return results;
}

/**
 * Get cached scan results or scan and cache if not available/expired
 * @param {string} basePath - Directory to scan
 * @param {string[]} extensions - File extensions to match
 * @param {string} cacheKey - Unique key for this cache entry
 * @returns {Array} - Array of file objects
 */
function getCachedMediaScan(basePath, extensions, cacheKey) {
    const cached = mediaScanCache[cacheKey];
    const now = Date.now();

    // Return cached results if valid
    if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
        console.log(`Using cached results for ${cacheKey} (${cached.results.length} items)`);
        return cached.results;
    }

    // Scan and cache
    console.log(`Scanning directory (cache miss/expired): ${basePath}`);
    const results = scanDirectoryForMedia(basePath, extensions);
    mediaScanCache[cacheKey] = {
        results: results,
        timestamp: now
    };
    console.log(`Cached ${results.length} items for ${cacheKey}`);

    return results;
}

/**
 * Auto-populate photos and videos in mediaObject if arrays are empty but paths exist
 * Uses caching to avoid re-scanning on every request
 *
 * ANALOGARCHIVE INTEGRATION NOTE:
 * This scanning feature is designed for stuffedanimalwar + analogarchive deployments
 * where both services run on the same server and share filesystem access.
 * - photosScanPath/videosScanPath: filesystem path to scan (e.g., /home/jaemzware/analogarchive/music/)
 * - photospath/videospath: URL where files are served (e.g., https://analogarchive.com/analog/music/)
 *
 * @param {Object} mediaObject - The media object from config
 */
function autoPopulateMedia(mediaObject) {
    if (!mediaObject) return;

    // Auto-populate photos if array is empty/missing but scan path exists
    // Use photosScanPath for scanning, photospath for URL output
    const photosScanPath = mediaObject.photosScanPath || mediaObject.photospath;
    if (photosScanPath && (!mediaObject.photos || mediaObject.photos.length === 0)) {
        const cacheKey = `photos:${photosScanPath}`;
        let photos = getCachedMediaScan(photosScanPath, PHOTO_EXTENSIONS, cacheKey);
        console.log(`PHOTOS SCAN: Found ${photos.length} total photos in ${photosScanPath}`);
        // Log unique directories found
        const photoDirs = [...new Set(photos.map(p => p.file.includes('/') ? p.file.split('/')[0] : '(root)'))];
        console.log(`PHOTOS SCAN: Found in directories: ${photoDirs.join(', ')}`);
        // Limit number of photos to prevent huge galleries
        if (photos.length > MAX_PHOTOS) {
            console.log(`Limiting photos from ${photos.length} to ${MAX_PHOTOS}`);
            photos = photos.slice(0, MAX_PHOTOS);
        }
        mediaObject.photos = photos;
        console.log(`Photos will be served from URL: ${mediaObject.photospath}`);
    }

    // Auto-populate videos if array is empty/missing but scan path exists
    // Use videosScanPath for scanning, videospath for URL output
    const videosScanPath = mediaObject.videosScanPath || mediaObject.videospath;
    if (videosScanPath && (!mediaObject.videos || mediaObject.videos.length === 0)) {
        const cacheKey = `videos:${videosScanPath}`;
        let videos = getCachedMediaScan(videosScanPath, VIDEO_EXTENSIONS, cacheKey);
        console.log(`VIDEOS SCAN: Found ${videos.length} total videos in ${videosScanPath}`);
        // Log unique directories found
        const videoDirs = [...new Set(videos.map(v => v.file.includes('/') ? v.file.split('/')[0] : '(root)'))];
        console.log(`VIDEOS SCAN: Found in directories: ${videoDirs.join(', ')}`);
        // Limit number of videos to prevent huge dropdowns
        if (videos.length > MAX_VIDEOS) {
            console.log(`Limiting videos from ${videos.length} to ${MAX_VIDEOS}`);
            videos = videos.slice(0, MAX_VIDEOS);
        }
        mediaObject.videos = videos;
        console.log(`Videos will be served from URL: ${mediaObject.videospath}`);
    }
}

//GET PORT TO LISTEN TO
if(process.argv.length !== 3){
    console.log(`NO PORT SPECIFIED. USING DEFAULT ${listenPort}`);
}
else{
    listenPort = process.argv[2];
    console.log(`PORT SPECIFIED. USING ${listenPort}`);
}

//CONFIGURE EXPRESS TO SERVE STATIC FILES LIKE IMAGES AND SCRIPTS
app.use(express.static(__dirname));

//RASPBERRY PI WIFI SETUP PAGE
app.use(express.json({ limit: '50mb' })); // Parse JSON request bodies with increased limit for base64 images
app.use(setupRouter);
//CONFIGURE EXPRESS TO TRUST PROXY ON FILE UPLOAD
app.set('trust proxy', true); // Trust the first proxy

// Ensure thumbnail cache directory exists
if (!fs.existsSync(THUMB_CACHE_DIR)) {
    fs.mkdirSync(THUMB_CACHE_DIR, { recursive: true });
    console.log(`Created thumbnail cache directory: ${THUMB_CACHE_DIR}`);
}

/**
 * THUMBNAIL ENDPOINT
 * Generates thumbnails on-demand and caches them
 * Usage: /thumb/photos/myphoto.jpg -> returns a 200px wide thumbnail
 */
app.get('/thumb/*', async (req, res) => {
    try {
        // Get the original image path from the URL (everything after /thumb/)
        const imagePath = req.params[0];
        const originalPath = path.join(__dirname, imagePath);

        // Security: prevent directory traversal
        if (!originalPath.startsWith(__dirname)) {
            return res.status(403).send('Forbidden');
        }

        // Check if original image exists
        if (!fs.existsSync(originalPath)) {
            return res.status(404).send('Image not found');
        }

        // Generate cache filename based on original path
        // Replace path separators with underscores to create flat cache structure
        const cacheFilename = imagePath.replace(/[\/\\]/g, '_');
        const cachePath = path.join(THUMB_CACHE_DIR, cacheFilename);

        // Check if cached thumbnail exists and is newer than original
        if (fs.existsSync(cachePath)) {
            const originalStat = fs.statSync(originalPath);
            const cacheStat = fs.statSync(cachePath);

            if (cacheStat.mtime >= originalStat.mtime) {
                // Serve cached thumbnail
                const ext = path.extname(originalPath).toLowerCase();
                const mimeTypes = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.gif': 'image/gif',
                    '.webp': 'image/webp'
                };
                res.setHeader('Content-Type', mimeTypes[ext] || 'image/jpeg');
                res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
                return res.sendFile(cachePath);
            }
        }

        // Generate thumbnail
        const ext = path.extname(originalPath).toLowerCase();
        let sharpInstance = sharp(originalPath).resize(THUMB_WIDTH, null, {
            withoutEnlargement: true // Don't upscale small images
        });

        // Handle different formats
        if (ext === '.png') {
            sharpInstance = sharpInstance.png({ quality: 80 });
        } else if (ext === '.gif') {
            // For GIF, convert to PNG to preserve transparency (sharp doesn't support animated GIF output)
            sharpInstance = sharpInstance.png({ quality: 80 });
        } else if (ext === '.webp') {
            sharpInstance = sharpInstance.webp({ quality: 80 });
        } else {
            sharpInstance = sharpInstance.jpeg({ quality: 80 });
        }

        // Save to cache
        await sharpInstance.toFile(cachePath);
        console.log(`[THUMB] Generated thumbnail: ${cacheFilename}`);

        // Serve the newly created thumbnail
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/png', // GIFs converted to PNG
            '.webp': 'image/webp'
        };
        res.setHeader('Content-Type', mimeTypes[ext] || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.sendFile(cachePath);

    } catch (error) {
        console.error('[THUMB] Error generating thumbnail:', error.message);
        // Fall back to serving original image on error
        const imagePath = req.params[0];
        const originalPath = path.join(__dirname, imagePath);
        if (fs.existsSync(originalPath)) {
            res.sendFile(originalPath);
        } else {
            res.status(500).send('Error generating thumbnail');
        }
    }
});

//START LISTENING
server.listen(listenPort, async () => {
    console.log(`listening on *:${listenPort}`);
});

/**
 * ENDPOINTS: Each endpoint uses the custom .json of the same name. if there is not a custom .json of the same name, the fallback is greenland.json]
 */
const MAX_GREENLAND_ROOMS = 9999;
const stuffedAnimalWarEndpoints = ['greenland','spain','denmark','norway','greta','blackpanthers','onboard'];
const stuffedAnimalWarChatSocketEvent = 'chatmessage';
const stuffedAnimalWarTapSocketEvent = 'tapmessage';
const stuffedAnimalWarPathSocketEvent = 'pathmessage';
const stuffedAnimalWarPresentImageSocketEvent = 'presentimage';
const stuffedAnimalWarChatImageSocketEvent = 'uploadchatimage';
const stuffedAnimalWarChatVideoSocketEvent = 'uploadchatvideo';
const stuffedAnimalWarConnectSocketEvent = 'connect';
const stuffedAnimalWarDisconnectSocketEvent = 'disconnect';
const stuffedAnimalWarVoiceOfferSocketEvent = 'voiceoffer';
const stuffedAnimalWarVoiceAnswerSocketEvent = 'voiceanswer';
const stuffedAnimalWarVoiceIceCandidateSocketEvent = 'voiceicecandidate';
const stuffedAnimalWarAudioControlSocketEvent = 'audiocontrol';
const stuffedAnimalWarVideoControlSocketEvent = 'videocontrol';
const stuffedAnimalWarPageCounters = stuffedAnimalWarEndpoints.reduce((acc, page) => {
    acc[page] = 0; // Set each page name as a key with an initial value of 0
    return acc;
}, {});

// Track active camera broadcasters (for /camera-broadcaster page)
const activeBroadcasters = new Map();

//add stuffedAnimalWarEndpoints greenland000 through greenland999
// NOTE: We no longer push 100k entries into the array - use isValidEn
// dpoint() regex instead


// Load canvas template HTML at startup (RIP SVG - we canvas-only now)
let templateCanvasHtml = fs.readFileSync(path.join(__dirname, 'template-canvas.html'), 'utf8');

// Preload all endpoint configs now that MAX_GREENLAND_ROOMS and stuffedAnimalWarEndpoints are defined
preloadEndpointConfigs();
// Load camera template HTML
let templateCameraHtml = fs.readFileSync(path.join(__dirname, 'template-camera.html'), 'utf8');

//SERVE LANDING PAGE FOR ROOT
app.get('/', function(req, res){
    // Generate room buttons for the "Try It Now" section (first 6 rooms)
    const roomsHtml = stuffedAnimalWarEndpoints.slice(0, 6).map(endpoint => {
        const href = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const roomName = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        return `<a class="room-pill" href="${href}">${roomName}</a>`;
    }).join('\n                        ');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stuffed Animal War - Ephemeral Chat | Privacy by Design</title>
    <meta name="description" content="Real-time collaboration that's architecturally incapable of storing your data. Photos and videos exist only in browser memory. Close the browser, data gone forever.">
    <meta name="keywords" content="ephemeral chat, privacy, self-hosted, raspberry pi, secure messaging, no data storage">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    
    <!-- Open Graph / Social -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://stuffedanimalwar.com/">
    <meta property="og:title" content="Stuffed Animal War - Ephemeral Chat">
    <meta property="og:description" content="Real-time collaboration that's architecturally incapable of storing your data.">
    
    <link rel="stylesheet" href="/landing.css">
</head>
<body>
    <nav>
        <div class="container">
            <a href="/" class="logo">STUFFED<span>ANIMAL</span>WAR</a>
            <div class="nav-links">
                <a href="#how-it-works">How It Works</a>
                <a href="#pricing">Hardware</a>
                <a href="https://github.com/jaemzware" target="_blank">GitHub</a>
                <a href="/rooms" class="nav-cta">Enter a Room →</a>
            </div>
        </div>
    </nav>

    <section class="hero">
        <div class="container">
            <span class="hero-badge">🔒 Privacy by Design, Not Policy</span>
            <h1>Real-time collaboration that <span class="highlight">can't store your data</span></h1>
            <p class="subtitle">Photos and videos exist only in browser memory. No database. No logs. Close the browser, and your data is gone forever. Not because we promise—because it's architecturally impossible.</p>
            <div class="hero-ctas">
                <a href="/rooms" class="btn btn-primary">Try It Free →</a>
                <a href="#pricing" class="btn btn-secondary">Get Your Own Server</a>
            </div>
        </div>
    </section>

    <section class="problem">
        <div class="container">
            <span class="section-label">The Problem</span>
            <h2>Your data is the product.</h2>
            <p class="section-description">Every "free" messaging app harvests your conversations, photos, and location. Your "deleted" messages live forever on corporate servers.</p>
            
            <div class="problem-grid">
                <div class="problem-card">
                    <div class="stat">$600B+</div>
                    <p>Annual revenue from personal data harvesting</p>
                </div>
                <div class="problem-card">
                    <div class="stat">Forever</div>
                    <p>How long your "deleted" messages actually persist</p>
                </div>
                <div class="problem-card">
                    <div class="stat">0%</div>
                    <p>Control you have over corporate data policies</p>
                </div>
            </div>
        </div>
    </section>

    <section class="solution">
        <div class="container">
            <span class="section-label">The Solution</span>
            <h2>Ephemeral by architecture.</h2>
            <p class="section-description">We didn't write a privacy policy. We wrote code that makes storing your data impossible.</p>
            
            <div class="solution-grid">
                <div class="solution-card">
                    <div class="icon">🔒</div>
                    <h3>Zero Persistence</h3>
                    <p>Data exists only in browser memory. Server restart = complete wipe. No database. No logs. Nothing to subpoena.</p>
                </div>
                <div class="solution-card purple">
                    <div class="icon">🏠</div>
                    <h3>Self-Hostable</h3>
                    <p>Run your own server on a Raspberry Pi. You own the hardware. You own the network. Complete control.</p>
                </div>
                <div class="solution-card blue">
                    <div class="icon">⚡</div>
                    <h3>Full Featured</h3>
                    <p>Collaborative canvas, WebRTC voice, custom rooms, media sharing, remote cameras, screen share. Everything ephemeral.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="how-it-works" id="how-it-works">
        <div class="container">
            <h2>How Your Data Stays Private</h2>
            
            <div class="flow">
                <div class="flow-step">
                    <div class="icon">📤</div>
                    <div class="label">Upload</div>
                    <div class="desc">Select photo/video</div>
                </div>
                <span class="flow-arrow">→</span>
                <div class="flow-step">
                    <div class="icon">🔄</div>
                    <div class="label">Convert</div>
                    <div class="desc">Base64 encoding</div>
                </div>
                <span class="flow-arrow">→</span>
                <div class="flow-step">
                    <div class="icon">📡</div>
                    <div class="label">Broadcast</div>
                    <div class="desc">WebSocket relay</div>
                </div>
                <span class="flow-arrow">→</span>
                <div class="flow-step">
                    <div class="icon">🧠</div>
                    <div class="label">Memory Only</div>
                    <div class="desc">Browser RAM</div>
                </div>
            </div>

            <div class="guarantees">
                <div class="guarantee">
                    <h4>✓ No Server Storage</h4>
                    <p>Server only relays data. Nothing touches disk.</p>
                </div>
                <div class="guarantee">
                    <h4>✓ Browser Close = Gone</h4>
                    <p>All browsers close, data ceases to exist anywhere.</p>
                </div>
                <div class="guarantee">
                    <h4>✓ Impossible to Subpoena</h4>
                    <p>Can't hand over data that doesn't exist.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="pricing" id="pricing">
        <div class="container">
            <h2>Own Your Communication</h2>
            <p class="subtitle">Pre-configured Raspberry Pi kits. Plug in and go.</p>
            
            <div class="pricing-grid">
                <div class="pricing-card">
                    <div class="tier">Starter</div>
                    <div class="price">$100</div>
                    <div class="hardware">Raspberry Pi Zero 2W Kit</div>
                    <ul>
                        <li>StuffedAnimalWar</li>
                        <li>AnalogArchiveJS music streaming</li>
                        <li>Low power (~1W), silent</li>
                        <li>Pre-configured, ready to run</li>
                        <li>Setup guide included</li>
                    </ul>
                    <a href="mailto:jaemzware@hotmail.com?subject=Starter Kit Inquiry" class="btn btn-secondary">Contact for Purchase</a>
                </div>
                <div class="pricing-card featured">
                    <div class="tier">With Camera</div>
                    <div class="price">$200</div>
                    <div class="hardware">Raspberry Pi 5 Kit + Camera</div>
                    <ul>
                        <li>StuffedAnimalWar</li>
                        <li>AnalogArchiveJS music streaming</li>
                        <li>Camera module included</li>
                        <li>Host your own camera feed</li>
                        <li>Pre-configured, ready to run</li>
                    </ul>
                    <a href="mailto:jaemzware@hotmail.com?subject=Camera Kit Inquiry" class="btn btn-primary">Contact for Purchase</a>
                </div>
            </div>
        </div>
    </section>

    <section class="try-it">
        <div class="container">
            <h2>Try It Right Now</h2>
            <p class="subtitle">No signup. No email. Just pick a room and start.</p>
            <p class="password-hint">Default password is the room name all lowercase one word.</p> 
            <p class="password-hint">Change it anytime at <a href="/crud">/crud</a>.</p>

            <div class="rooms-preview">
                ${roomsHtml}
            </div>
            
            <a href="/rooms" class="all-rooms">View all rooms →</a>
        </div>
    </section>

    <footer>
        <div class="container">
            <div class="footer-links">
                <a href="https://github.com/jaemzware" target="_blank">GitHub</a>
                <a href="https://linkedin.com/in/jaemzware" target="_blank">LinkedIn</a>
                <a href="mailto:jaemzware@hotmail.com">Contact</a>
            </div>
            <div class="footer-copy">
                © ${new Date().getFullYear()} Jaemzware LLC — Privacy by design, not policy.
            </div>
        </div>
    </footer>
</body>
</html>`;

    res.send(html);
});

//SERVE ROOM LIST AT /rooms
app.get('/rooms', function(req, res){
    // Generate dynamic HTML with links from stuffedAnimalWarEndpoints as buttons
    const namedLinksHtml = stuffedAnimalWarEndpoints.map(endpoint =>
        `            <a class="room-button" href="/${endpoint}">${endpoint}</a>`
    ).join('\n');

    // Generate enumerated greenland rooms
    let enumeratedLinksHtml = '';
    for (let i = 1; i <= MAX_GREENLAND_ROOMS; i++) {
        const roomName = `greenland${String(i).padStart(5, '0')}`;
        enumeratedLinksHtml += `            <a class="room-button" href="/${roomName}">${roomName}</a>\n`;
    }

    const html = `<!--STUFFED ANIMAL WAR - jaemzware.org - 20150611 -->
<!--STUFFED ANIMAL WAR - stuffedanimalwar.com - 20211128 -->

<!DOCTYPE html>
<html>
    <head>
        <title>Stuffed Animal War Rooms</title>
        <link rel="Stylesheet" href="stylebase.css" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
                background: #1a1a1a;
                color: #fff;
            }

            .header {
                text-align: center;
                margin-bottom: 30px;
                padding: 20px;
            }

            .header h1 {
                margin: 0;
                font-size: 2.5em;
                color: #fff;
                text-transform: uppercase;
                letter-spacing: 2px;
            }

            .header p {
                margin: 10px 0 0 0;
                font-size: 1.2em;
                color: #aaa;
            }

            .back-link {
                display: inline-block;
                margin-top: 15px;
                color: #00d4aa;
                text-decoration: none;
                font-size: 0.95em;
            }

            .back-link:hover {
                text-decoration: underline;
            }

            .section-title {
                margin-top: 40px;
                margin-bottom: 20px;
                font-size: 1.5em;
                color: #aaa;
                text-align: center;
            }

            .room-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 15px;
                max-width: 1400px;
                margin: 0 auto;
                padding: 0 20px;
            }

            .room-button {
                display: block;
                padding: 15px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                text-align: center;
                border-radius: 8px;
                font-weight: bold;
                font-size: 0.95em;
                transition: all 0.3s ease;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                border: 2px solid transparent;
            }

            .room-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
                background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
                border-color: #fff;
            }

            .room-button:active {
                transform: translateY(0);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }

            @media (max-width: 768px) {
                .room-grid {
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    gap: 10px;
                }

                .room-button {
                    padding: 12px 15px;
                    font-size: 0.85em;
                }

                .header h1 {
                    font-size: 1.8em;
                }

                .header p {
                    font-size: 1em;
                }
            }

            @media (max-width: 480px) {
                .room-grid {
                    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                    gap: 8px;
                }

                .room-button {
                    padding: 10px 12px;
                    font-size: 0.8em;
                }

                .header h1 {
                    font-size: 1.5em;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Stuffed Animal War Rooms</h1>
            <p>Choose a room to enter</p>
            <a href="/" class="back-link">← Back to home</a>
        </div>

        <div class="section-title">Named Rooms</div>
        <div class="room-grid">
${namedLinksHtml}
        </div>

        <div class="section-title">Enumerated Rooms (greenland00001 - greenland${String(MAX_GREENLAND_ROOMS).padStart(5, '0')})</div>
        <div class="room-grid">
${enumeratedLinksHtml}
        </div>
    </body>
</html>
`;

    res.send(html);
});

// Camera broadcaster page - for broadcasting webcam as a video source
app.get('/camera-broadcaster', function(req, res){
    res.sendFile(__dirname + '/camera-broadcaster.html');
});

/**
 * 1 - define endpoints to serve custom stuffedanimalwar pages (e.g. greenland.json)
 */
/**
 * WILDCARD ROUTES - replaces 100,008-iteration forEach to prevent memory exhaustion
 */

// Helper: check if a path segment is a valid endpoint (named or greenland000-greenlandMAX_GREENLAND_ROOMS)
function isValidEndpoint(name) {
    if (!name) return false;
    if (stuffedAnimalWarEndpoints.includes(name)) return true;
    // Also accept greenland001 through greenlandMAX_GREENLAND_ROOMS
    const greenlandMatch = /^greenland(\d+)$/.test(name);
    if (greenlandMatch) {
        const roomNum = parseInt(name.substring('greenland'.length));
        return roomNum >= 1 && roomNum <= MAX_GREENLAND_ROOMS;
    }
    return false;
}

// Helper: get or initialize page counter for any endpoint
function getPageCounter(endpoint) {
    if (!(endpoint in stuffedAnimalWarPageCounters)) {
        stuffedAnimalWarPageCounters[endpoint] = 0;
    }
    return stuffedAnimalWarPageCounters[endpoint];
}

// SERVE CANVAS PAGE: /:endpoint
app.get('/:endpoint', ipBlockMiddleware, function(req, res, next){
    const endpoint = req.params.endpoint;
    if (!isValidEndpoint(endpoint)) return next();

    // ── Serve from HTML cache if available (zero file I/O on repeat hits) ──
    if (endpointHtmlCache.has(endpoint)) {
        return res.send(endpointHtmlCache.get(endpoint));
    }

    try {
        const configData = endpointConfigs.get(endpoint);
        if (!configData) return next();

        autoPopulateMedia(configData.mediaObject);
        let html = templateCanvasHtml;
        console.log(`Serving ${endpoint} in CANVAS mode`);
        html = html.replace(/{{ENDPOINT}}/g, configData.endpoint);
        html = html.replace('{{MASTER_ALIAS}}', configData.masterAlias);
        html = html.replace('{{UNSPECIFIED_ALIAS}}', configData.unspecifiedAlias);
        html = html.replace('{{STUFFED_ANIMAL_MEDIA_OBJECT}}', JSON.stringify(configData.stuffedAnimalMediaObject, null, 2));
        html = html.replace('{{MEDIA_OBJECT}}', JSON.stringify(configData.mediaObject, null, 2));
        html = html.replace('{{RESPONSES_OBJECT}}', JSON.stringify(configData.responsesObject, null, 2));
        html = html.replace('{{PASSWORD}}', configData.password || '');
        html = html.replace('{{SERVER_INSTANCE_ID}}', SERVER_INSTANCE_ID);

        endpointHtmlCache.set(endpoint, html); // cache so next hit is instant
        res.send(html);
    } catch (error) {
        console.error(`Error generating page for endpoint ${endpoint}:`, error);
        res.status(500).send(`Error generating page for endpoint ${endpoint}: ${error.message}`);
    }
});

// SERVE CAMERA PAGE: /:endpointcamera
app.get('/:endpointcamera', ipBlockMiddleware, function(req, res, next){
    const full = req.params.endpointcamera;
    if (!full.endsWith('camera')) return next();
    const endpoint = full.slice(0, -6); // strip 'camera'
    if (!isValidEndpoint(endpoint)) return next();
    try {
        let html = templateCameraHtml;
        console.log(`Serving camera endpoint for ${endpoint}`);
        const configPath = path.join(__dirname, 'endpoints', endpoint + '.json');
        let password = '';
        try {
            const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            password = configData.password || '';
        } catch (fileError) {
            console.log(`No config found for camera endpoint ${endpoint}`);
        }
        html = html.replace(/{{ENDPOINT}}/g, endpoint);
        html = html.replace('{{PASSWORD}}', password);
        html = html.replace('{{SERVER_INSTANCE_ID}}', SERVER_INSTANCE_ID);
        html = html.replace('{{METERED_APP_NAME}}', process.env.METERED_APP_NAME || '');
        html = html.replace('{{METERED_API_KEY}}', process.env.METERED_API_KEY || '');
        res.send(html);
    } catch (error) {
        console.error(`Error generating camera page for endpoint ${endpoint}:`, error);
        res.status(500).send(`Error generating camera page for endpoint ${endpoint}: ${error.message}`);
    }
});

// UPLOAD IMAGE/VIDEO: /:endpointuploadchatimage or /:endpointuploadchatvideo
// Single multer pass for both suffixes - two separate app.post handlers on the
// same path pattern would each run their own upload.any(), and the second one
// would try to re-read a request body the first already drained, causing
// busboy to throw "Unexpected end of form".
app.post('/:endpointupload', upload.any(), (req, res) => {
    const full = req.params.endpointupload;
    const clientIp = req.ip;
    const chatPstString = new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"});

    if (full.endsWith(stuffedAnimalWarChatImageSocketEvent)) {
        const endpoint = full.slice(0, -stuffedAnimalWarChatImageSocketEvent.length);
        if (!isValidEndpoint(endpoint)) return res.status(404).json({ success: false, message: 'Invalid endpoint.' });
        const file = (req.files || []).find(f => f.fieldname === 'image');
        if (!file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
        const imageData = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        const sizeInBytes = Buffer.from(imageData.split(';base64,').pop(), 'base64').length;
        const chatImageMsgObject = {
            CHATCLIENTIMAGE: imageData,
            CHATCLIENTUSER: '',
            CHATSERVERUSER: clientIp,
            CHATSERVERDATE: chatPstString,
            CHATUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            CHATSERVERENDPOINT: endpoint,
            CHATSERVERPORT: listenPort
        };
        console.log(`CHATSERVERENDPOINT:${endpoint} CHATSERVERPORT: ${listenPort} CHATSERVERUSER: ${clientIp} CHATSERVERDATE: ${chatPstString} RAW IMAGE UPLOAD ${sizeInBytes} BYTES`);
        io.emit(endpoint + stuffedAnimalWarChatImageSocketEvent, chatImageMsgObject);
        return res.status(200).json({ success: true, message: 'Image uploaded and broadcasted.' });
    }

    if (full.endsWith(stuffedAnimalWarChatVideoSocketEvent)) {
        const endpoint = full.slice(0, -stuffedAnimalWarChatVideoSocketEvent.length);
        if (!isValidEndpoint(endpoint)) return res.status(404).json({ success: false, message: 'Invalid endpoint.' });
        const file = (req.files || []).find(f => f.fieldname === 'video');
        if (!file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
        const videoData = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        const sizeInBytes = Buffer.from(videoData.split(';base64,').pop(), 'base64').length;
        const chatVideoMsgObject = {
            CHATCLIENTVIDEO: videoData,
            CHATCLIENTUSER: '',
            CHATSERVERUSER: clientIp,
            CHATSERVERDATE: chatPstString,
            CHATUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            CHATSERVERENDPOINT: endpoint,
            CHATSERVERPORT: listenPort
        };
        console.log(`CHATSERVERENDPOINT:${endpoint} CHATSERVERPORT: ${listenPort} CHATSERVERUSER: ${clientIp} CHATSERVERDATE: ${chatPstString} RAW VIDEO UPLOAD ${sizeInBytes} BYTES`);
        io.emit(endpoint + stuffedAnimalWarChatVideoSocketEvent, chatVideoMsgObject);
        return res.status(200).json({ success: true, message: 'Video uploaded and broadcasted.' });
    }

    return res.status(404).json({ success: false, message: 'Unknown upload endpoint.' });
});

/**
 * CRUD MANAGEMENT ENDPOINTS
 */
// Simple session storage (in production, use proper session management)
const crudSessions = new Map();

// Serve the CRUD management page
app.get('/crud', function(req, res){
    res.sendFile(path.join(__dirname, 'crud-manager.html'));
});

// Authenticate CRUD access
app.post('/api/crud-auth', function(req, res){
    const { password } = req.body;
    const correctPassword = process.env.CRUD_PASSWORD || 'admin';

    if (password === correctPassword) {
        // Generate a simple session token
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        crudSessions.set(token, { timestamp: Date.now() });

        res.json({
            success: true,
            token: token,
            message: 'Authentication successful'
        });
    } else {
        res.json({
            success: false,
            message: 'Incorrect password. Please contact the administrator.'
        });
    }
});

// Middleware to check CRUD authentication
function checkCrudAuth(req, res, next) {
    const token = req.headers['x-crud-token'];

    if (!token || !crudSessions.has(token)) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized. Please log in.'
        });
    }

    // Check if session is expired (24 hours)
    const session = crudSessions.get(token);
    if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
        crudSessions.delete(token);
        return res.status(401).json({
            success: false,
            message: 'Session expired. Please log in again.'
        });
    }

    next();
}

// GET endpoint configuration (READ)
app.get('/api/endpoint/:name', checkCrudAuth, function(req, res){
    try {
        const endpointName = req.params.name;
        const configPath = path.join(__dirname, 'endpoints', endpointName + '.json');

        if (!fs.existsSync(configPath)) {
            return res.status(404).json({
                success: false,
                message: `Endpoint ${endpointName}.json not found`
            });
        }

        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        res.json({ success: true, data: configData });
    } catch (error) {
        console.error('Error reading endpoint:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// LIST all endpoints (READ)
app.get('/api/endpoints', checkCrudAuth, function(req, res){
    try {
        const endpointsDir = path.join(__dirname, 'endpoints');
        const files = fs.readdirSync(endpointsDir)
            .filter(file => file.endsWith('.json'))
            .map(file => file.replace('.json', ''));

        res.json({ success: true, endpoints: files });
    } catch (error) {
        console.error('Error listing endpoints:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// UPDATE endpoint configuration (UPDATE)
app.post('/api/endpoint/:name', checkCrudAuth, function(req, res){
    try {
        const endpointName = req.params.name;
        const configPath = path.join(__dirname, 'endpoints', endpointName + '.json');
        const configData = req.body;

        // Write the updated configuration
        fs.writeFileSync(configPath, JSON.stringify(configData, null, 4));

        // Invalidate caches so the next request picks up the new config
        preloadEndpointConfigs();
        console.log(`[CONFIG] Reloaded endpoint configs after CRUD update to ${endpointName}`);

        res.json({
            success: true,
            message: `Endpoint ${endpointName}.json updated successfully`
        });
    } catch (error) {
        console.error('Error updating endpoint:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// VALIDATE resource paths (helper endpoint)
app.post('/api/validate-resource', checkCrudAuth, async function(req, res){
    try {
        const { path: resourcePath, type } = req.body;

        // If it's an HTTP URL, validate it server-side (avoid CORS issues)
        if (resourcePath.startsWith('http://') || resourcePath.startsWith('https://')) {
            try {
                const urlObj = new URL(resourcePath);
                const protocol = urlObj.protocol === 'https:' ? https : require('http');

                // Make HEAD request to check if resource exists
                const urlResponse = await new Promise((resolve, reject) => {
                    const options = {
                        hostname: urlObj.hostname,
                        port: urlObj.port,
                        path: urlObj.pathname + urlObj.search,
                        method: 'HEAD',
                        timeout: 10000
                    };

                    const req = protocol.request(options, (res) => {
                        resolve({ status: res.statusCode });
                    });

                    req.on('error', reject);
                    req.on('timeout', () => {
                        req.destroy();
                        reject(new Error('Request timeout'));
                    });

                    req.end();
                });

                return res.json({
                    success: true,
                    isHttp: true,
                    httpStatus: urlResponse.status,
                    message: `HTTP ${urlResponse.status}`
                });
            } catch (error) {
                console.error('Error validating HTTP URL:', error);
                return res.json({
                    success: false,
                    isHttp: true,
                    httpStatus: 0,
                    message: error.message
                });
            }
        }

        // For local files, check if they exist
        // Note: resourcePath should already include the base path (songs/, photos/, videos/)
        // The client-side code prepends the appropriate base path before sending
        let fullPath;
        if (type === 'animal') {
            fullPath = path.join(__dirname, resourcePath);
        } else if (type === 'song') {
            fullPath = path.join(__dirname, resourcePath);
        } else if (type === 'photo') {
            fullPath = path.join(__dirname, resourcePath);
        } else if (type === 'video') {
            fullPath = path.join(__dirname, resourcePath);
        } else if (type === 'poster') {
            // Poster images are in the videos directory (path already prepended client-side)
            fullPath = path.join(__dirname, resourcePath);
        } else if (type === 'background') {
            fullPath = path.join(__dirname, resourcePath);
        } else {
            fullPath = path.join(__dirname, resourcePath);
        }

        const exists = fs.existsSync(fullPath);

        res.json({
            success: true,
            exists: exists,
            isHttp: false,
            fullPath: fullPath
        });
    } catch (error) {
        console.error('Error validating resource:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * Image description via Anthropic Claude API
 */
app.get('/api/describe-image', async (req, res) => {
    try {
        const imageUrl = req.query.url;
        if (!imageUrl) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
        }

        const requestBody = JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 256,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "url",
                                url: imageUrl
                            }
                        },
                        {
                            type: "text",
                            text: "Describe what you see in this image in one concise sentence (under 100 characters if possible)."
                        }
                    ]
                }
            ]
        });

        const response = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.anthropic.com',
                path: '/v1/messages',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                }
            };

            const apiReq = https.request(options, (apiRes) => {
                let data = '';
                apiRes.on('data', chunk => data += chunk);
                apiRes.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Failed to parse API response'));
                    }
                });
            });

            apiReq.on('error', reject);
            apiReq.write(requestBody);
            apiReq.end();
        });

        if (response.error) {
            console.error('Anthropic API error:', response.error);
            return res.status(500).json({ error: response.error.message || 'API error' });
        }

        const description = response.content?.[0]?.text || 'No description available';
        res.json({ description });

    } catch (error) {
        console.error('Error describing image:', error);
        res.status(500).json({ error: error.message });
    }
});

// Describe uploaded base64 image using Anthropic API
app.post('/api/describe-image-base64', async (req, res) => {
    try {
        const { imageData } = req.body;
        if (!imageData) {
            return res.status(400).json({ error: 'imageData is required' });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
        }

        // Parse base64 data URI: "data:image/png;base64,..."
        const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
            return res.status(400).json({ error: 'Invalid base64 image format' });
        }

        let mediaType = matches[1];
        let base64Data = matches[2];

        // Anthropic API has a 5MB limit for base64 images
        // Resize if the image is too large (using 4.5MB threshold for safety buffer)
        const MAX_SIZE_BYTES = 4.5 * 1024 * 1024;
        const imageSizeBytes = Buffer.from(base64Data, 'base64').length;

        if (imageSizeBytes > MAX_SIZE_BYTES) {
            console.log(`Image too large (${(imageSizeBytes / 1024 / 1024).toFixed(2)}MB), resizing...`);
            try {
                const imageBuffer = Buffer.from(base64Data, 'base64');
                // Resize to max 2048px on longest side and convert to JPEG with 80% quality
                const resizedBuffer = await sharp(imageBuffer)
                    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 80 })
                    .toBuffer();

                base64Data = resizedBuffer.toString('base64');
                mediaType = 'image/jpeg';
                console.log(`Resized image to ${(resizedBuffer.length / 1024 / 1024).toFixed(2)}MB`);
            } catch (resizeError) {
                console.error('Error resizing image:', resizeError);
                return res.status(500).json({ error: 'Failed to resize large image' });
            }
        }

        const requestBody = JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 256,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: mediaType,
                                data: base64Data
                            }
                        },
                        {
                            type: "text",
                            text: "Describe what you see in this image in one concise sentence (under 100 characters if possible)."
                        }
                    ]
                }
            ]
        });

        const response = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.anthropic.com',
                path: '/v1/messages',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                }
            };

            const apiReq = https.request(options, (apiRes) => {
                let data = '';
                apiRes.on('data', chunk => data += chunk);
                apiRes.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Failed to parse API response'));
                    }
                });
            });

            apiReq.on('error', reject);
            apiReq.write(requestBody);
            apiReq.end();
        });

        if (response.error) {
            console.error('Anthropic API error:', response.error);
            return res.status(500).json({ error: response.error.message || 'API error' });
        }

        const description = response.content?.[0]?.text || 'No description available';
        res.json({ description });

    } catch (error) {
        console.error('Error describing base64 image:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * audio metadata (MP3 and FLAC)
 */
// Audio metadata proxy endpoint (supports MP3 and FLAC)
app.get('/mp3-metadata', async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        // Check if it's a remote URL
        // Treat as remote if it's an http/https URL AND either:
        // 1. It's not a local host (localhost, 127.0.0.1, or .local domain without port), OR
        // 2. It has an explicit port (like :55557) indicating a different service
        let isRemoteUrl = false;
        if (url.startsWith('http')) {
            try {
                const urlObj = new URL(url);
                const hasExplicitPort = urlObj.port !== '';
                const isLocalHost = urlObj.hostname === 'localhost' ||
                                   urlObj.hostname === '127.0.0.1' ||
                                   urlObj.hostname.endsWith('.local');

                // If it has an explicit port, treat as remote (different service like analogarchive)
                // Otherwise, only treat as remote if it's not a local hostname
                isRemoteUrl = hasExplicitPort || !isLocalHost;
            } catch (e) {
                // If URL parsing fails, fall back to old behavior
                isRemoteUrl = false;
            }
        }

        if (isRemoteUrl) {
            // console.log(`[MP3 Metadata] Treating as remote URL: ${url}`);

            try {
                // Use https.request instead of fetch to properly support IPv4 family option
                const urlObj = new URL(url);

                // Helper function to check if an IP is in a private range
                const isPrivateIP = (hostname) => {
                    const privateRanges = [
                        /^10\./,                      // 10.0.0.0/8
                        /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
                        /^192\.168\./,                // 192.168.0.0/16
                        /^169\.254\./                 // 169.254.0.0/16 (link-local)
                    ];
                    return privateRanges.some(range => range.test(hostname));
                };

                const isLocalDomain = urlObj.hostname === 'localhost' ||
                                     urlObj.hostname === '127.0.0.1' ||
                                     urlObj.hostname === 'host.docker.internal' ||
                                     urlObj.hostname.endsWith('.local') ||
                                     isPrivateIP(urlObj.hostname);

                // In Docker, localhost refers to the container itself, not the host
                // Check for Docker environment and rewrite localhost to host.docker.internal
                let hostname = urlObj.hostname;
                const isDocker = fs.existsSync('/.dockerenv') ||
                                fs.existsSync('/run/.containerenv') ||
                                (process.env.KUBERNETES_SERVICE_HOST !== undefined);

                if ((hostname === 'localhost' || hostname === '127.0.0.1') && isDocker) {
                    hostname = 'host.docker.internal';
                    // console.log(`[MP3 Metadata] Running in container, rewriting ${urlObj.hostname} to ${hostname}`);
                } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    // console.log(`[MP3 Metadata] Not in container, using ${hostname} directly`);
                }

                // Determine if this is a FLAC file
                const isFlacUrl = url.toLowerCase().endsWith('.flac');

                // For FLAC files, just return the filename without fetching metadata
                if (isFlacUrl) {
                    console.log(`[FLAC] Skipping metadata fetch for FLAC file, using filename`);
                    const filename = url.split('/').pop().split('.')[0];

                    res.json({
                        title: decodeURIComponent(filename),
                        artist: 'FLAC',
                        album: '',
                        artwork: null
                    });
                } else {
                    // MP3 handling with range request
                    const requestOptions = {
                        hostname: hostname,
                        port: urlObj.port,
                        path: urlObj.pathname + urlObj.search,
                        method: 'GET',
                        headers: {
                            'Range': 'bytes=0-524288' // Only fetch first 512KB for ID3 tags
                        },
                        timeout: 15000
                    };

                    // For local domains, bypass SSL verification and force IPv4
                    if (isLocalDomain) {
                        // console.log(`[MP3 Metadata] Detected local HTTPS domain: ${hostname}, bypassing SSL verification and forcing IPv4`);
                        requestOptions.rejectUnauthorized = false;
                        requestOptions.family = 4; // Force IPv4
                    }

                    // console.log(`[MP3 Metadata] Request options:`, {
                    //     hostname: requestOptions.hostname,
                    //     port: requestOptions.port,
                    //     family: requestOptions.family,
                    //     rejectUnauthorized: requestOptions.rejectUnauthorized
                    // });

                    // Wrap https.request in a Promise
                    const buffer = await new Promise((resolve, reject) => {
                        const req = https.request(requestOptions, (res) => {
                            // console.log(`[MP3 Metadata] Response status: ${res.statusCode} ${res.statusMessage}`);

                            if (res.statusCode !== 200 && res.statusCode !== 206) {
                                reject(new Error(`Failed to fetch: ${res.statusCode} ${res.statusMessage}`));
                                return;
                            }

                            const chunks = [];
                            res.on('data', (chunk) => chunks.push(chunk));
                            res.on('end', () => resolve(Buffer.concat(chunks)));
                            res.on('error', reject);
                        });

                        req.on('error', reject);
                        req.on('timeout', () => {
                            req.destroy();
                            reject(new Error('Request timeout'));
                        });

                        req.end();
                    });

                    try {
                        // Use NodeID3 for MP3 files
                        const tags = NodeID3.read(buffer);

                        // Extract artwork if available
                        let artwork = null;
                        if (tags.image && tags.image.imageBuffer) {
                            artwork = tags.image.imageBuffer.toString('base64');
                        }

                        // Send metadata as JSON
                        res.json({
                            title: tags.title || '',
                            artist: tags.artist || '',
                            album: tags.album || '',
                            artwork: artwork
                        });
                    } catch (metadataError) {
                        console.error('Error parsing MP3 metadata:', metadataError);

                        // Fallback to basic info
                        const filename = url.split('/').pop().split('.')[0];

                        res.json({
                            title: decodeURIComponent(filename),
                            artist: '',
                            album: '',
                            artwork: null
                        });
                    }
                }
            } catch (fetchError) {
                // If fetch fails (timeout, network error, etc), return filename as fallback
                console.error('[MP3 Metadata] Error fetching remote file:', fetchError.message);
                console.error('[MP3 Metadata] Full error:', fetchError);
                const filename = url.split('/').pop().split('.')[0];

                res.json({
                    title: decodeURIComponent(filename),
                    artist: '',
                    album: '',
                    artwork: null
                });
            }
        } else {
            // console.log(`[MP3 Metadata] Treating as local file: ${url}`);
            // Local file - extract path and read from filesystem
            let filePath;

            if (url.startsWith('http')) {
                // It's a localhost URL - extract the path
                const urlObj = new URL(url);
                filePath = path.join(__dirname, urlObj.pathname);
            } else {
                // It's already a path
                filePath = url.startsWith('/')
                    ? path.join(__dirname, url)
                    : path.join(__dirname, url);
            }

            try {
                // Determine if this is a FLAC file
                const isFlac = filePath.toLowerCase().endsWith('.flac');

                if (isFlac) {
                    // For FLAC files, just return the filename without parsing metadata
                    console.log(`[FLAC] Skipping metadata for local FLAC file, using filename`);
                    const filename = filePath.split('/').pop().split('.')[0];

                    res.json({
                        title: filename,
                        artist: 'FLAC',
                        album: '',
                        artwork: null
                    });
                } else {
                    // Use NodeID3 for MP3 files
                    const tags = NodeID3.read(filePath);

                    // Extract artwork if available
                    let artwork = null;
                    if (tags.image && tags.image.imageBuffer) {
                        artwork = tags.image.imageBuffer.toString('base64');
                    }

                    // Send metadata as JSON
                    res.json({
                        title: tags.title || '',
                        artist: tags.artist || '',
                        album: tags.album || '',
                        artwork: artwork
                    });
                }
            } catch (metadataError) {
                console.error('Error parsing local file metadata:', metadataError);

                // Fallback to basic info
                const filename = filePath.split('/').pop().split('.')[0];

                res.json({
                    title: filename,
                    artist: '',
                    album: '',
                    artwork: null
                });
            }
        }
    } catch (error) {
        console.error('MP3 metadata proxy error:', error);

        // Return a graceful fallback instead of 500 error
        const url = req.query.url || '';
        const filename = url.split('/').pop().split('.')[0];

        res.json({
            title: decodeURIComponent(filename) || 'Unknown',
            artist: '',
            album: '',
            artwork: null
        });
    }
});
/**
 * Helper function to get the real client IP address
 * Handles x-forwarded-for header (which may contain multiple IPs) and falls back to socket address
 */
function getClientIp(socket) {
    const forwardedFor = socket.handshake.headers['x-forwarded-for'];
    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs (client, proxy1, proxy2, ...)
        // The first IP is the original client
        return forwardedFor.split(',')[0].trim();
    }
    return socket.handshake.address;
}

// Socket.io middleware to block IPs before connection is established
io.use((socket, next) => {
    const clientIp = getClientIp(socket);
    if (isIpBlocked(clientIp)) {
        console.log(`[IP-BLOCK] Blocked WebSocket connection from ${clientIp}`);
        return next(new Error('Access denied'));
    }
    next();
});

// ─── SOCKET.IO CONNECTION RATE LIMITER ──────────────────────────────────────
// Allows at most 1 new connection per IP per 500ms — kills bot socket floods
// without affecting real users (who rarely open >2 connections/sec)
const connRateMap = new Map();
setInterval(() => connRateMap.clear(), 60 * 1000); // prune every minute
io.use((socket, next) => {
    const ip = getClientIp(socket);
    const now = Date.now();
    const last = connRateMap.get(ip) || 0;
    if (now - last < 500) {
        console.log(`[RATE] Throttled WebSocket connection from ${ip}`);
        return next(new Error('Rate limited'));
    }
    connRateMap.set(ip, now);
    next();
});

/**
 *  ON PERSISTENT CONNECTION
 *  handler for incoming socket connections
 *  curl https://ipinfo.io/71.212.60.26 for ip address info (replace ip with desired ip)
 */
io.on('connection', function(socket){
    const endpoint = socket.handshake.query.endpoint;
    let chatClientAddress = getClientIp(socket);
    let chatServerDate = new Date();
    let connectChatPstString = chatServerDate.toLocaleString("en-US", {timeZone: "America/Los_Angeles"});

    console.log(`[SERVER] 🔌 New connection - Socket ID: ${socket.id}, Endpoint: ${endpoint || 'NONE'}, IP: ${chatClientAddress}`);

    // Initialize counter for dynamic endpoints (greenland001-greenland99999) that aren't pre-populated
    if (!(endpoint in stuffedAnimalWarPageCounters)) stuffedAnimalWarPageCounters[endpoint] = 0;
    stuffedAnimalWarPageCounters[endpoint]++;
    statsLogger.updateEndpoints(stuffedAnimalWarPageCounters);
    let connectMsgObject = {
        CHATSERVERENDPOINT: endpoint,
        CHATSERVERPORT: listenPort,
        CHATSERVERUSER: chatClientAddress,
        CHATSERVERDATE: connectChatPstString,
        CHATUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
        CHATCLIENTMESSAGE: 'CONNECT',
        CHATCLIENTUSER: ''
    };
    console.log(JSON.stringify(connectMsgObject));
    io.emit(endpoint + stuffedAnimalWarConnectSocketEvent, connectMsgObject);

    if (endpoint && endpoint.endsWith('camera')) {
        const cameraConnectEvent = endpoint + 'camera' + 'connect';
        const cameraConnectMsg = {
            userId: socket.id,
            endpoint: endpoint,
            timestamp: connectChatPstString
        };
        console.log(`[CAMERA] Broadcasting connect for ${endpoint}, socket: ${socket.id}`);
        io.emit(cameraConnectEvent, cameraConnectMsg);

        // Send new camera the list of all existing cameras so they can discover peers
        setTimeout(() => {
            const existingCameras = [];
            io.sockets.sockets.forEach((sock) => {
                const sockEndpoint = sock.handshake.query.endpoint;
                if (sockEndpoint === endpoint && sock.id !== socket.id) {
                    existingCameras.push({ userId: sock.id });
                }
            });
            console.log(`[CAMERA] Sending ${existingCameras.length} existing cameras to ${socket.id}`);
            existingCameras.forEach(cam => {
                socket.emit(endpoint + 'camera' + 'exists', { userId: cam.userId });
            });
        }, 100);
    }

    socket.on('disconnect', function(){
        let chatClientAddress = getClientIp(socket);
        let chatServerDate = new Date();
        let chatPstString = chatServerDate.toLocaleString("en-US", {timeZone: "America/Los_Angeles"});
        stuffedAnimalWarPageCounters[endpoint]--;
        statsLogger.updateEndpoints(stuffedAnimalWarPageCounters);
        let disconnectMsgObject = {
            CHATSERVERENDPOINT: endpoint,
            CHATSERVERPORT: listenPort,
            CHATSERVERUSER: chatClientAddress,
            CHATSERVERDATE: chatPstString,
            CHATUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            CHATCLIENTMESSAGE: 'DISCONNECT',
            CHATCLIENTUSER: ''
        };
        console.log(JSON.stringify(disconnectMsgObject));
        io.emit(endpoint + stuffedAnimalWarDisconnectSocketEvent, disconnectMsgObject);

        if (endpoint && endpoint.endsWith('camera')) {
            const cameraDisconnectEvent = endpoint + 'camera' + 'disconnect';
            const cameraDisconnectMsg = {
                userId: socket.id,
                endpoint: endpoint,
                timestamp: chatPstString
            };
            console.log(`[CAMERA] Broadcasting disconnect for ${endpoint}, socket: ${socket.id}`);
            io.emit(cameraDisconnectEvent, cameraDisconnectMsg);
        }

        if (activeBroadcasters.has(socket.id)) {
            console.log('[BROADCASTER] Broadcaster disconnected:', socket.id);
            activeBroadcasters.delete(socket.id);
            io.emit('camera-broadcaster-unavailable', { broadcasterId: socket.id });
        }
    });

    socket.on('error', function(errorMsgObject){
        let chatClientAddress = getClientIp(socket);
        let chatPstString = new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"});
        errorMsgObject.CHATSERVERENDPOINT = endpoint;
        errorMsgObject.CHATSERVERPORT = listenPort;
        errorMsgObject.CHATSERVERUSER = chatClientAddress;
        errorMsgObject.CHATSERVERDATE = chatPstString;
        errorMsgObject.CHATUSERCOUNT = stuffedAnimalWarPageCounters[endpoint];
        errorMsgObject.CHATCLIENTMESSAGE = 'ERROR';
        errorMsgObject.CHATCLIENTUSER = '';
        console.log("ERROR: ENDPOINT: " + endpoint + ":" + listenPort + " CLIENT: " + chatClientAddress + " TIME: " + chatPstString);
    });

    // CAMERA BROADCASTER handlers
    socket.on('register-camera-broadcaster', function(data) {
        console.log('[BROADCASTER] Registering camera broadcaster:', socket.id, 'label:', data.label);
        activeBroadcasters.set(socket.id, { label: data.label, socketId: socket.id });
        io.emit('camera-broadcaster-available', { broadcasterId: socket.id, label: data.label });
        activeBroadcasters.forEach((broadcaster, id) => {
            if (id !== socket.id) {
                socket.emit('camera-broadcaster-available', { broadcasterId: id, label: broadcaster.label });
            }
        });
    });

    socket.on('unregister-camera-broadcaster', function() {
        if (activeBroadcasters.has(socket.id)) {
            console.log('[BROADCASTER] Unregistering camera broadcaster:', socket.id);
            activeBroadcasters.delete(socket.id);
            io.emit('camera-broadcaster-unavailable', { broadcasterId: socket.id });
        }
    });

    socket.on('viewer-request-stream', function(data) {
        console.log('[BROADCASTER] Viewer', socket.id, 'requesting stream from broadcaster:', data.broadcasterId);
        io.to(data.broadcasterId).emit('viewer-request-stream', { viewerId: socket.id });
    });

    socket.on('broadcaster-offer', function(data) {
        console.log('[BROADCASTER] Offer from', socket.id, 'to viewer:', data.to);
        io.to(data.to).emit('broadcaster-offer', { offer: data.offer, from: socket.id });
    });

    socket.on('broadcaster-answer', function(data) {
        console.log('[BROADCASTER] Answer from', socket.id, 'to broadcaster:', data.to);
        io.to(data.to).emit('broadcaster-answer', { answer: data.answer, from: socket.id });
    });

    socket.on('broadcaster-ice-candidate', function(data) {
        io.to(data.to).emit('broadcaster-ice-candidate', { candidate: data.candidate, from: socket.id });
    });

    // Register listeners only for this socket's own endpoint (fixes memory leak)
    socket.on(endpoint + stuffedAnimalWarChatSocketEvent, function(chatMsgObject){
        statsLogger.recordEvent('chat', endpoint);
        sendChatMessage(endpoint + stuffedAnimalWarChatSocketEvent, chatMsgObject);
    });
    socket.on(endpoint + stuffedAnimalWarTapSocketEvent, function(tapMsgObject){
        statsLogger.recordEvent('tap', endpoint);
        sendTapMessage(endpoint + stuffedAnimalWarTapSocketEvent, tapMsgObject);
    });
    socket.on(endpoint + stuffedAnimalWarPathSocketEvent, (pathMsgObject) => {
        statsLogger.recordEvent('path', endpoint);
        sendPathMessage(endpoint + stuffedAnimalWarPathSocketEvent, pathMsgObject);
    });
    socket.on(endpoint + stuffedAnimalWarPresentImageSocketEvent, (presentImageMsgObject) => {
        statsLogger.recordEvent('presentImage', endpoint);
        sendPresentImageMessage(endpoint + stuffedAnimalWarPresentImageSocketEvent, presentImageMsgObject);
    });
    socket.on(endpoint + stuffedAnimalWarAudioControlSocketEvent, (audioControlMsgObject) => {
        statsLogger.recordEvent('audioControl', endpoint);
        sendAudioControlMessage(endpoint + stuffedAnimalWarAudioControlSocketEvent, audioControlMsgObject);
    });
    socket.on(endpoint + stuffedAnimalWarVideoControlSocketEvent, (videoControlMsgObject) => {
        statsLogger.recordEvent('videoControl', endpoint);
        sendVideoControlMessage(endpoint + stuffedAnimalWarVideoControlSocketEvent, videoControlMsgObject);
    });
    socket.on(endpoint + stuffedAnimalWarVoiceOfferSocketEvent, (offerMsgObject) => {
        statsLogger.recordEvent('voiceOffer', endpoint);
        let voiceClientAddress = getClientIp(socket);
        let voicePstString = new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"});
        const reorderedOfferMsgObject = {
            VOICESERVERENDPOINT: endpoint,
            VOICESERVERPORT: listenPort,
            VOICESERVERUSER: voiceClientAddress,
            VOICESERVERDATE: voicePstString,
            VOICEUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            offer: offerMsgObject.offer,
            from: socket.id,
            to: offerMsgObject.to || 'broadcast'
        };
        console.log('VOICE OFFER:', JSON.stringify({ endpoint, from: socket.id, to: offerMsgObject.to || 'broadcast', userCount: stuffedAnimalWarPageCounters[endpoint] }));
        if (offerMsgObject.to) {
            io.to(offerMsgObject.to).emit(endpoint + stuffedAnimalWarVoiceOfferSocketEvent, reorderedOfferMsgObject);
        } else {
            io.emit(endpoint + stuffedAnimalWarVoiceOfferSocketEvent, reorderedOfferMsgObject);
        }
    });
    socket.on(endpoint + stuffedAnimalWarVoiceAnswerSocketEvent, (answerMsgObject) => {
        statsLogger.recordEvent('voiceAnswer', endpoint);
        let voiceClientAddress = getClientIp(socket);
        let voicePstString = new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"});
        const reorderedAnswerMsgObject = {
            VOICESERVERENDPOINT: endpoint,
            VOICESERVERPORT: listenPort,
            VOICESERVERUSER: voiceClientAddress,
            VOICESERVERDATE: voicePstString,
            VOICEUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            answer: answerMsgObject.answer,
            from: socket.id,
            to: answerMsgObject.to
        };
        console.log('VOICE ANSWER:', JSON.stringify({ endpoint, from: socket.id, to: answerMsgObject.to, userCount: stuffedAnimalWarPageCounters[endpoint] }));
        io.to(answerMsgObject.to).emit(endpoint + stuffedAnimalWarVoiceAnswerSocketEvent, reorderedAnswerMsgObject);
    });
    socket.on(endpoint + stuffedAnimalWarVoiceIceCandidateSocketEvent, (iceMsgObject) => {
        statsLogger.recordEvent('voiceIceCandidate', endpoint);
        let voiceClientAddress = getClientIp(socket);
        let voicePstString = new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"});
        const reorderedIceMsgObject = {
            VOICESERVERENDPOINT: endpoint,
            VOICESERVERPORT: listenPort,
            VOICESERVERUSER: voiceClientAddress,
            VOICESERVERDATE: voicePstString,
            VOICEUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            candidate: iceMsgObject.candidate,
            from: socket.id,
            to: iceMsgObject.to || 'broadcast'
        };
        console.log('VOICE ICE:', JSON.stringify({ endpoint, from: socket.id, to: iceMsgObject.to || 'broadcast', userCount: stuffedAnimalWarPageCounters[endpoint] }));
        if (iceMsgObject.to) {
            io.to(iceMsgObject.to).emit(endpoint + stuffedAnimalWarVoiceIceCandidateSocketEvent, reorderedIceMsgObject);
        } else {
            io.emit(endpoint + stuffedAnimalWarVoiceIceCandidateSocketEvent, reorderedIceMsgObject);
        }
    });

    socket.on(endpoint + 'camera' + 'voiceoffer', (offerMsgObject) => {
        const msg = { offer: offerMsgObject.offer, from: socket.id, to: offerMsgObject.to || 'broadcast', cameraName: offerMsgObject.cameraName };
        if (offerMsgObject.to) { io.to(offerMsgObject.to).emit(endpoint + 'camera' + 'voiceoffer', msg); } else { io.emit(endpoint + 'camera' + 'voiceoffer', msg); }
    });
    socket.on(endpoint + 'camera' + 'voiceanswer', (answerMsgObject) => {
        const msg = { answer: answerMsgObject.answer, from: socket.id, to: answerMsgObject.to, cameraName: answerMsgObject.cameraName };
        io.to(answerMsgObject.to).emit(endpoint + 'camera' + 'voiceanswer', msg);
    });
    socket.on(endpoint + 'camera' + 'voiceicecandidate', (iceMsgObject) => {
        const msg = { candidate: iceMsgObject.candidate, from: socket.id, to: iceMsgObject.to || 'broadcast' };
        if (iceMsgObject.to) { io.to(iceMsgObject.to).emit(endpoint + 'camera' + 'voiceicecandidate', msg); } else { io.emit(endpoint + 'camera' + 'voiceicecandidate', msg); }
    });
    socket.on(endpoint + 'camera' + 'nameupdate', (nameUpdateMsgObject) => {
        io.emit(endpoint + 'camera' + 'nameupdate', { cameraName: nameUpdateMsgObject.cameraName, userId: socket.id });
    });
    socket.on(endpoint + 'camera' + 'reconnect', () => {
        io.emit(endpoint + 'camera' + 'reconnect', { userId: socket.id });
    });
    socket.on(endpoint + 'camera' + 'requestroster', () => {
        io.emit(endpoint + 'camera' + 'requestroster', { userId: socket.id });
    });
    socket.on(endpoint + 'camera' + 'rosterresponse', (rosterResponseMsgObject) => {
        io.to(rosterResponseMsgObject.to).emit(endpoint + 'camera' + 'rosterresponse', {
            from: socket.id,
            cameraName: rosterResponseMsgObject.cameraName,
            cameraNames: rosterResponseMsgObject.cameraNames
        });
    });

    //GENERIC CHATMESSAGE SENDER
    function sendChatMessage(chatSocketEvent, chatMsgObject){
        let chatClientAddress = getClientIp(socket);
        let chatPstString = new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"});
        const reorderedChatMsgObject = {
            CHATSERVERENDPOINT: endpoint,
            CHATSERVERPORT: listenPort,
            CHATSERVERUSER: chatClientAddress,
            CHATSERVERDATE: chatPstString,
            CHATUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            ...chatMsgObject
        };
        console.log(JSON.stringify(reorderedChatMsgObject));
        io.emit(chatSocketEvent, reorderedChatMsgObject);
    }

    //GENERIC TAPMESSAGE SENDER
    function sendTapMessage(tapSocketEvent, tapMsgObject){
        let tapClientAddress = getClientIp(socket);
        let tapPstString = new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"});
        const reorderedTapMsgObject = {
            CHATSERVERENDPOINT: endpoint,
            CHATSERVERPORT: listenPort,
            CHATSERVERUSER: tapClientAddress,
            CHATSERVERDATE: tapPstString,
            CHATUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            ...tapMsgObject
        };
        console.log(JSON.stringify(reorderedTapMsgObject));
        io.emit(tapSocketEvent, reorderedTapMsgObject);
    }

    //GENERIC PATHMESSAGE SENDER
    function sendPathMessage(pathSocketEvent, pathMsgObject){
        let pathClientAddress = getClientIp(socket);
        let pathPstString = new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"});
        const reorderedPathMsgObject = {
            CHATSERVERENDPOINT: endpoint,
            CHATSERVERPORT: listenPort,
            CHATSERVERUSER: pathClientAddress,
            CHATSERVERDATE: pathPstString,
            CHATUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            ...pathMsgObject
        };
        console.log(JSON.stringify(reorderedPathMsgObject));
        io.emit(pathSocketEvent, reorderedPathMsgObject);
    }

    //GENERIC PRESENT IMAGE SENDER
    function sendPresentImageMessage(presentImageSocketEvent, presentImageMsgObject){
        let presentImageClientAddress = getClientIp(socket);
        let presentImagePstString = new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"});
        const reorderedPresentImageMsgObject = {
            CHATSERVERENDPOINT: endpoint,
            CHATSERVERPORT: listenPort,
            CHATSERVERUSER: presentImageClientAddress,
            CHATSERVERDATE: presentImagePstString,
            CHATUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            ...presentImageMsgObject
        };
        console.log(JSON.stringify(reorderedPresentImageMsgObject));
        io.emit(presentImageSocketEvent, reorderedPresentImageMsgObject);
    }

    function sendAudioControlMessage(audioControlSocketEvent, audioControlMsgObject){
        let audioControlClientAddress = getClientIp(socket);
        let audioControlPstString = new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"});
        const reorderedAudioControlMsgObject = {
            AUDIOCONTROLSERVERENDPOINT: endpoint,
            AUDIOCONTROLSERVERPORT: listenPort,
            AUDIOCONTROLSERVERUSER: audioControlClientAddress,
            AUDIOCONTROLSERVERDATE: audioControlPstString,
            AUDIOCONTROLUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            ...audioControlMsgObject
        };
        const connectedSockets = io.sockets.sockets.size;
        console.log('AUDIO CONTROL: [' + connectedSockets + ' sockets] event=' + audioControlSocketEvent + ' ' + JSON.stringify(reorderedAudioControlMsgObject));
        io.emit(audioControlSocketEvent, reorderedAudioControlMsgObject);
    }

    function sendVideoControlMessage(videoControlSocketEvent, videoControlMsgObject){
        let videoControlClientAddress = getClientIp(socket);
        let videoControlPstString = new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"});
        const reorderedVideoControlMsgObject = {
            VIDEOCONTROLSERVERENDPOINT: endpoint,
            VIDEOCONTROLSERVERPORT: listenPort,
            VIDEOCONTROLSERVERUSER: videoControlClientAddress,
            VIDEOCONTROLSERVERDATE: videoControlPstString,
            VIDEOCONTROLUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            ...videoControlMsgObject
        };
        const connectedSockets = io.sockets.sockets.size;
        console.log('VIDEO CONTROL: [' + connectedSockets + ' sockets] event=' + videoControlSocketEvent + ' ' + JSON.stringify(reorderedVideoControlMsgObject));
        io.emit(videoControlSocketEvent, reorderedVideoControlMsgObject);
    }

});

// Graceful shutdown handler for systemd restarts
function gracefulShutdown(signal) {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(() => {
        console.log('HTTPS server closed');

        // Close all Socket.IO connections
        io.close(() => {
            console.log('Socket.IO closed');
            console.log('Graceful shutdown complete');
            process.exit(0);
        });
    });

    // Force shutdown after 10 seconds if graceful shutdown fails
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
}

// Handle SIGTERM (sent by systemd on stop/restart)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));



