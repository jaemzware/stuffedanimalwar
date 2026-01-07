//STUFFPEDANIMALWAR HTTP JAEMZWARE
//EXAMPLE STARTED FROM: http://socket.io/get-started/chat/
//setup an express application and bind it to an https server
require('dotenv').config();
let fs = require('fs');

//SSL CERTS NEED TO BE CREATED LOCALLY IF YOU WANT TO RUN LOCALLY
//openssl genrsa -out key.pem 4096
//openssl req -x509 -new -sha256 -nodes -key key.pem -days 1095 -out certificate.pem -subj "/CN=jaemzwarellc/O=stuffedanimalwar/C=US"
const options = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH || './sslcert/key.pem'),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH || './sslcert/certificate.pem')
};

//CREATE EXPRESS AND SOCKET.IO SERVERS
const express = require('express');
const NodeID3 = require('node-id3');
const app = express();
const https = require('https');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const server = https.createServer(options, app);
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
const sharp = require('sharp');
let listenPort =55556;

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
 * ENDPOINTS: Each endpoint uses the custom .json of the same name. if there is not a custom .json of the same name, the fallback is jim.json]
 */
const stuffedAnimalWarEndpoints = ['jim', 'maddie', 'jacob', 'katie', 'mark', 'nina', 'onboard'];
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

//add stuffedAnimalWarEndpoints jim000 through jim999
for (let i = 1; i <= 999; i++) {
    const paddedNumber = String(i).padStart(3, '0');
    const jimEndpoint = `jim${paddedNumber}`;
    stuffedAnimalWarEndpoints.push(jimEndpoint);
    stuffedAnimalWarPageCounters[jimEndpoint] = 0; // Initialize counter for this endpoint
}

// Load canvas template HTML at startup (RIP SVG - we canvas-only now)
let templateCanvasHtml = fs.readFileSync(path.join(__dirname, 'template-canvas.html'), 'utf8');
// Load camera template HTML
let templateCameraHtml = fs.readFileSync(path.join(__dirname, 'template-camera.html'), 'utf8');

//SERVE INDEX FOR NO ENDPOINT AFTER PORT ADDRESS
app.get('/', function(req, res){
    // Generate dynamic HTML with links from stuffedAnimalWarEndpoints as buttons
    const linksHtml = stuffedAnimalWarEndpoints.map(endpoint =>
        `            <a class="room-button" href="${endpoint}">${endpoint}</a>`
    ).join('\n');

    const html = `<!--STUFFED ANIMAL WAR - jaemzware.org - 20150611 -->
<!--STUFFED ANIMAL WAR - stuffedanimalwar.com - 20211128 -->

<!DOCTYPE html>
<html>
    <head>
        <title>Stuffed Animal War Rooms</title>
        <link rel="Stylesheet" href="stylebase.css" />
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
        </div>
        <div class="room-grid">
${linksHtml}
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
 * 1 - define endpoints to serve custom stuffedanimalwar pages (e.g. jim.json)
 */
stuffedAnimalWarEndpoints.forEach(endpoint => {
    //SERVE THE HTML PAGE ENDPOINT
    app.get('/' + endpoint, function(req, res){
        try {
            // Try to read the endpoint-specific JSON configuration
            const configPath = path.join(__dirname, 'endpoints', endpoint + '.json');
            let configData;

            try {
                configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } catch (fileError) {
                // If the endpoint-specific JSON doesn't exist, fall back to jim.json
                console.log(`No custom JSON found for endpoint ${endpoint}, falling back to jim.json`);
                const jimConfigPath = path.join(__dirname, 'endpoints', 'jim.json');
                configData = JSON.parse(fs.readFileSync(jimConfigPath, 'utf8'));

                // Override endpoint and masterAlias for the fallback
                configData.endpoint = endpoint;
                configData.masterAlias = endpoint.toUpperCase();
            }

            // Auto-populate photos and videos if arrays are empty but paths exist
            autoPopulateMedia(configData.mediaObject);

            // Always use canvas template (SVG is dead, long live canvas)
            let html = templateCanvasHtml;

            console.log(`Serving ${endpoint} in CANVAS mode`);

            // Generate HTML by replacing placeholders in the template
            html = html.replace(/{{ENDPOINT}}/g, configData.endpoint);
            html = html.replace('{{MASTER_ALIAS}}', configData.masterAlias);
            html = html.replace('{{UNSPECIFIED_ALIAS}}', configData.unspecifiedAlias);
            html = html.replace('{{STUFFED_ANIMAL_MEDIA_OBJECT}}', JSON.stringify(configData.stuffedAnimalMediaObject, null, 2));
            html = html.replace('{{MEDIA_OBJECT}}', JSON.stringify(configData.mediaObject, null, 2));
            html = html.replace('{{RESPONSES_OBJECT}}', JSON.stringify(configData.responsesObject, null, 2));
            html = html.replace('{{PASSWORD}}', configData.password || '');

            // Send the generated HTML
            res.send(html);
        } catch (error) {
            console.error(`Error generating page for endpoint ${endpoint}:`, error);
            res.status(500).send(`Error generating page for endpoint ${endpoint}: ${error.message}`);
        }
    });

    //SERVE THE CAMERA ENDPOINT FOR THIS ROOM
    app.get('/' + endpoint + 'camera', function(req, res){
        try {
            let html = templateCameraHtml;
            console.log(`Serving camera endpoint for ${endpoint}`);

            // Read the config to get the password
            const configPath = path.join(__dirname, 'endpoints', endpoint + '.json');
            let password = '';
            try {
                const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                password = configData.password || '';
            } catch (fileError) {
                console.log(`No config found for camera endpoint ${endpoint}`);
            }

            // Replace endpoint placeholder
            html = html.replace(/{{ENDPOINT}}/g, endpoint);
            html = html.replace('{{PASSWORD}}', password);

            res.send(html);
        } catch (error) {
            console.error(`Error generating camera page for endpoint ${endpoint}:`, error);
            res.status(500).send(`Error generating camera page for endpoint ${endpoint}: ${error.message}`);
        }
    });

    //UPLOAD AN IMAGE ENDPOINT
    app.post('/' + endpoint + stuffedAnimalWarChatImageSocketEvent, upload.single('image'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }

        //GET THE CLIENT IP
        const clientIp = req.ip;

        //get the date stamp
        let chatServerDate = new Date();
        let chatPstString = chatServerDate.toLocaleString("en-US", {timeZone: "America/Los_Angeles"});

        // Convert the image buffer to a base64 string
        const imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        let chatImageMsgObject = {
            CHATCLIENTIMAGE: imageData,
            CHATCLIENTUSER: '',
            CHATSERVERUSER: clientIp,
            CHATSERVERDATE: chatPstString,
            CHATUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            CHATSERVERENDPOINT: endpoint,
            CHATSERVERPORT: listenPort
        };

        // Step 1: Extract the base64 part (remove the prefix)
        const base64Data = imageData.split(';base64,').pop();

        // Step 2: Decode the base64 string to binary data
        const binaryData = Buffer.from(base64Data, 'base64');

        // Step 3: Calculate the size in bytes
        const sizeInBytes = binaryData.length;
        console.log("CHATSERVERENDPOINT:" + chatImageMsgObject.CHATSERVERENDPOINT +
            " CHATSERVERPORT: " + chatImageMsgObject.CHATSERVERPORT +
            " CHATSERVERUSER: " + chatImageMsgObject.CHATSERVERUSER +
            " CHATSERVERDATE: " +chatImageMsgObject.CHATSERVERDATE +
            " CHATUSERCOUNT: " + chatImageMsgObject.CHATUSERCOUNT +
            " RAW IMAGE UPLOAD " + sizeInBytes + " BYTES ");

        // Broadcast the image data to all connected Socket.IO clients
        io.emit(endpoint + stuffedAnimalWarChatImageSocketEvent, chatImageMsgObject);

        res.status(200).json({ success: true, message: 'Image uploaded and broadcasted.' });
    });

    //UPLOAD AN VIDEO ENDPOINT
    app.post('/' + endpoint + stuffedAnimalWarChatVideoSocketEvent, upload.single('video'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }

        //GET THE CLIENT IP
        const clientIp = req.ip;

        //get the date stamp
        let chatServerDate = new Date();
        let chatPstString = chatServerDate.toLocaleString("en-US", {timeZone: "America/Los_Angeles"});

        // Convert the video buffer to a base64 string
        const videoData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        let chatVideoMsgObject = {
            CHATCLIENTVIDEO: videoData,
            CHATCLIENTUSER: '',
            CHATSERVERUSER: clientIp,
            CHATSERVERDATE: chatPstString,
            CHATUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            CHATSERVERENDPOINT: endpoint,
            CHATSERVERPORT: listenPort
        };

        // Step 1: Extract the base64 part (remove the prefix)
        const base64Data = videoData.split(';base64,').pop();

// Step 2: Decode the base64 string to binary data
        const binaryData = Buffer.from(base64Data, 'base64');

// Step 3: Calculate the size in bytes
        const sizeInBytes = binaryData.length;
        console.log("CHATSERVERENDPOINT:" + chatVideoMsgObject.CHATSERVERENDPOINT +
            " CHATSERVERPORT: " + chatVideoMsgObject.CHATSERVERPORT +
            " CHATSERVERUSER: " +chatVideoMsgObject.CHATSERVERUSER +
            " CHATSERVERDATE: " + chatVideoMsgObject.CHATSERVERDATE +
            " CHATUSERCOUNT: " + chatVideoMsgObject.CHATUSERCOUNT +
            " RAW VIDEO UPLOAD " + sizeInBytes + " BYTES ");

        /**
         * 3 - broadcast the right event for you your custom stuffedanimalwar page. the name must match chatImageSocketEvent in your custom stuffedanimalwar page (e.g. jim.json)
         */
        // Broadcast the image data to all connected Socket.IO clients
        io.emit(endpoint + stuffedAnimalWarChatVideoSocketEvent, chatVideoMsgObject);

        res.status(200).json({ success: true, message: 'Video uploaded and broadcasted.' });
    });
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
            model: "claude-sonnet-4-20250514",
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
            model: "claude-sonnet-4-20250514",
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

/**
 *  ON PERSISTENT CONNECTION
 *  handler for incoming socket connections
 *  curl https://ipinfo.io/71.212.60.26 for ip address info (replace ip with desired ip)
 */
io.on('connection', function(socket){
    //Get endpoint that made the connection (passed in .html io() instantiation)
    const endpoint =  socket.handshake.query.endpoint;
    let chatClientAddress = getClientIp(socket);
    let chatServerDate = new Date();
    let connectChatPstString = chatServerDate.toLocaleString("en-US", {timeZone: "America/Los_Angeles"});

    console.log(`[SERVER] 🔌 New connection - Socket ID: ${socket.id}, Endpoint: ${endpoint || 'NONE'}, IP: ${chatClientAddress}`);

    // Log ALL events from this socket for debugging
    socket.onAny((eventName, ...args) => {
        console.log(`[SERVER] 📨 Socket ${socket.id} emitted: ${eventName}`);
    });

    stuffedAnimalWarPageCounters[endpoint]++;
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
    io.emit(endpoint + stuffedAnimalWarConnectSocketEvent,connectMsgObject);

    // If this is a camera endpoint, emit camera connect event
    if (endpoint && endpoint.endsWith('camera')) {
        const cameraConnectEvent = endpoint + 'camera' + 'connect';
        const cameraConnectMsg = {
            userId: socket.id,
            endpoint: endpoint,
            timestamp: connectChatPstString
        };
        console.log(`[CAMERA] Broadcasting connect for ${endpoint}, socket: ${socket.id}`);
        io.emit(cameraConnectEvent, cameraConnectMsg);
    }

    //COMMON--------------------------------------------------------------------------------------
    socket.on('disconnect', function(){
        let chatClientAddress = getClientIp(socket);
        let chatServerDate = new Date();
        let chatPstString = chatServerDate.toLocaleString("en-US", {timeZone: "America/Los_Angeles"});
        stuffedAnimalWarPageCounters[endpoint]--;
        let disconnectMsgObject = {
                CHATSERVERENDPOINT: endpoint,
                CHATSERVERPORT: listenPort,
                CHATSERVERUSER:chatClientAddress,
                CHATSERVERDATE:chatPstString,
                CHATUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
                CHATCLIENTMESSAGE:'DISCONNECT',
                CHATCLIENTUSER: ''
         };
        console.log(JSON.stringify(disconnectMsgObject));
        io.emit(endpoint + stuffedAnimalWarDisconnectSocketEvent,disconnectMsgObject);

        // If this is a camera endpoint, emit camera disconnect event
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

        // If this was a broadcaster, notify all clients
        if (activeBroadcasters.has(socket.id)) {
            console.log('[BROADCASTER] Broadcaster disconnected:', socket.id);
            activeBroadcasters.delete(socket.id);
            io.emit('camera-broadcaster-unavailable', {
                broadcasterId: socket.id
            });
        }
    });

    //ON ERROR
    socket.on('error', function(errorMsgObject){
        let chatClientAddress = getClientIp(socket);
        let chatPstString = chatServerDate.toLocaleString("en-US", {timeZone: "America/Los_Angeles"});
        errorMsgObject.CHATSERVERENDPOINT = endpoint;
        errorMsgObject.CHATSERVERPORT = listenPort;
        errorMsgObject.CHATSERVERUSER = chatClientAddress;
        errorMsgObject.CHATSERVERDATE = chatPstString;
        errorMsgObject.CHATUSERCOUNT = stuffedAnimalWarPageCounters[endpoint];
        errorMsgObject.CHATCLIENTMESSAGE = 'ERROR';
        errorMsgObject.CHATCLIENTUSER = '';
        console.log("ERROR:" + " ENDPOINT: " + endpoint  + ":" + listenPort + " CLIENT: " + chatClientAddress + " TIME: " + chatPstString + " ROOM COUNT: " + stuffedAnimalWarPageCounters[endpoint]);
    });

    //CAMERA BROADCASTER------------------------------------------------------------------------------
    // Register a camera broadcaster (from /camera-broadcaster page)
    socket.on('register-camera-broadcaster', function(data) {
        console.log('[BROADCASTER] Registering camera broadcaster:', socket.id, 'label:', data.label);
        activeBroadcasters.set(socket.id, { label: data.label, socketId: socket.id });
        // Announce to all clients that a new broadcaster is available
        io.emit('camera-broadcaster-available', {
            broadcasterId: socket.id,
            label: data.label
        });
        // Send list of existing broadcasters to the new connection
        activeBroadcasters.forEach((broadcaster, id) => {
            if (id !== socket.id) {
                socket.emit('camera-broadcaster-available', {
                    broadcasterId: id,
                    label: broadcaster.label
                });
            }
        });
    });

    // Unregister a camera broadcaster
    socket.on('unregister-camera-broadcaster', function() {
        if (activeBroadcasters.has(socket.id)) {
            console.log('[BROADCASTER] Unregistering camera broadcaster:', socket.id);
            activeBroadcasters.delete(socket.id);
            io.emit('camera-broadcaster-unavailable', {
                broadcasterId: socket.id
            });
        }
    });

    // Viewer requests stream from broadcaster
    socket.on('viewer-request-stream', function(data) {
        console.log('[BROADCASTER] Viewer', socket.id, 'requesting stream from broadcaster:', data.broadcasterId);
        io.to(data.broadcasterId).emit('viewer-request-stream', {
            viewerId: socket.id
        });
    });

    // Broadcaster sends offer to viewer
    socket.on('broadcaster-offer', function(data) {
        console.log('[BROADCASTER] Offer from', socket.id, 'to viewer:', data.to);
        io.to(data.to).emit('broadcaster-offer', {
            offer: data.offer,
            from: socket.id
        });
    });

    // Viewer sends answer to broadcaster
    socket.on('broadcaster-answer', function(data) {
        console.log('[BROADCASTER] Answer from', socket.id, 'to broadcaster:', data.to);
        io.to(data.to).emit('broadcaster-answer', {
            answer: data.answer,
            from: socket.id
        });
    });

    // ICE candidate exchange for broadcaster connections
    socket.on('broadcaster-ice-candidate', function(data) {
        io.to(data.to).emit('broadcaster-ice-candidate', {
            candidate: data.candidate,
            from: socket.id
        });
    });

    /**
     * 2 - define sockets to serve custom stuffedanimalwar page Socket Events (e.g. chat message and gameboard tap message)
     */
    stuffedAnimalWarEndpoints.forEach(endpoint => {
        socket.on(endpoint + stuffedAnimalWarChatSocketEvent, function(chatMsgObject){
            //emit to everyone else
            sendChatMessage(endpoint + stuffedAnimalWarChatSocketEvent,chatMsgObject);
        });
        socket.on(endpoint + stuffedAnimalWarTapSocketEvent, function(tapMsgObject){
            //emit to everyone else
            sendTapMessage(endpoint + stuffedAnimalWarTapSocketEvent,tapMsgObject);
        });
        socket.on(endpoint + stuffedAnimalWarPathSocketEvent, (pathMsgObject) => {
            //emit to everyone else
            sendPathMessage(endpoint + stuffedAnimalWarPathSocketEvent,pathMsgObject);
        });
        socket.on(endpoint + stuffedAnimalWarPresentImageSocketEvent, (presentImageMsgObject) => {
            //emit to everyone else
            sendPresentImageMessage(endpoint + stuffedAnimalWarPresentImageSocketEvent,presentImageMsgObject);
        });
        socket.on(endpoint + stuffedAnimalWarAudioControlSocketEvent, (audioControlMsgObject) => {
            //broadcast audio control to everyone else (play, pause, seek, speed)
            sendAudioControlMessage(endpoint + stuffedAnimalWarAudioControlSocketEvent, audioControlMsgObject);
        });
        socket.on(endpoint + stuffedAnimalWarVideoControlSocketEvent, (videoControlMsgObject) => {
            //broadcast video control to everyone else (play, pause, seek, speed)
            sendVideoControlMessage(endpoint + stuffedAnimalWarVideoControlSocketEvent, videoControlMsgObject);
        });
        socket.on(endpoint + stuffedAnimalWarVoiceOfferSocketEvent, (offerMsgObject) => {
            //send voice offer to specific peer or broadcast to all in this endpoint
            let voiceClientAddress = getClientIp(socket);
            let voiceServerDate = new Date();
            let voicePstString = voiceServerDate.toLocaleString("en-US", {timeZone: "America/Los_Angeles"});

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

            console.log('VOICE OFFER:', JSON.stringify({
                endpoint: endpoint,
                from: socket.id,
                to: offerMsgObject.to || 'broadcast',
                userCount: stuffedAnimalWarPageCounters[endpoint]
            }));

            if (offerMsgObject.to) {
                io.to(offerMsgObject.to).emit(endpoint + stuffedAnimalWarVoiceOfferSocketEvent, reorderedOfferMsgObject);
            } else {
                io.emit(endpoint + stuffedAnimalWarVoiceOfferSocketEvent, reorderedOfferMsgObject);
            }
        });
        socket.on(endpoint + stuffedAnimalWarVoiceAnswerSocketEvent, (answerMsgObject) => {
            //send voice answer to the specific peer
            let voiceClientAddress = getClientIp(socket);
            let voiceServerDate = new Date();
            let voicePstString = voiceServerDate.toLocaleString("en-US", {timeZone: "America/Los_Angeles"});

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

            console.log('VOICE ANSWER:', JSON.stringify({
                endpoint: endpoint,
                from: socket.id,
                to: answerMsgObject.to,
                userCount: stuffedAnimalWarPageCounters[endpoint]
            }));

            io.to(answerMsgObject.to).emit(endpoint + stuffedAnimalWarVoiceAnswerSocketEvent, reorderedAnswerMsgObject);
        });
        socket.on(endpoint + stuffedAnimalWarVoiceIceCandidateSocketEvent, (iceMsgObject) => {
            //send ICE candidate to specific peer or broadcast to all in this endpoint
            let voiceClientAddress = getClientIp(socket);
            let voiceServerDate = new Date();
            let voicePstString = voiceServerDate.toLocaleString("en-US", {timeZone: "America/Los_Angeles"});

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

            console.log('VOICE ICE:', JSON.stringify({
                endpoint: endpoint,
                from: socket.id,
                to: iceMsgObject.to || 'broadcast',
                userCount: stuffedAnimalWarPageCounters[endpoint]
            }));

            if (iceMsgObject.to) {
                io.to(iceMsgObject.to).emit(endpoint + stuffedAnimalWarVoiceIceCandidateSocketEvent, reorderedIceMsgObject);
            } else {
                io.emit(endpoint + stuffedAnimalWarVoiceIceCandidateSocketEvent, reorderedIceMsgObject);
            }
        });

        // Camera endpoint WebRTC handlers
        const cameraEndpoint = endpoint + 'camera';

        socket.on(cameraEndpoint + 'camera' + 'voiceoffer', (offerMsgObject) => {
            console.log('CAMERA OFFER:', cameraEndpoint, 'from:', socket.id, 'to:', offerMsgObject.to || 'broadcast', 'name:', offerMsgObject.cameraName || '(none)');

            const reorderedOfferMsgObject = {
                offer: offerMsgObject.offer,
                from: socket.id,
                to: offerMsgObject.to || 'broadcast',
                cameraName: offerMsgObject.cameraName
            };

            if (offerMsgObject.to) {
                io.to(offerMsgObject.to).emit(cameraEndpoint + 'camera' + 'voiceoffer', reorderedOfferMsgObject);
            } else {
                io.emit(cameraEndpoint + 'camera' + 'voiceoffer', reorderedOfferMsgObject);
            }
        });

        socket.on(cameraEndpoint + 'camera' + 'voiceanswer', (answerMsgObject) => {
            console.log('CAMERA ANSWER:', cameraEndpoint, 'from:', socket.id, 'to:', answerMsgObject.to, 'name:', answerMsgObject.cameraName || '(none)');

            const reorderedAnswerMsgObject = {
                answer: answerMsgObject.answer,
                from: socket.id,
                to: answerMsgObject.to,
                cameraName: answerMsgObject.cameraName
            };

            io.to(answerMsgObject.to).emit(cameraEndpoint + 'camera' + 'voiceanswer', reorderedAnswerMsgObject);
        });

        socket.on(cameraEndpoint + 'camera' + 'voiceicecandidate', (iceMsgObject) => {
            console.log('CAMERA ICE:', cameraEndpoint, 'from:', socket.id, 'to:', iceMsgObject.to || 'broadcast');

            const reorderedIceMsgObject = {
                candidate: iceMsgObject.candidate,
                from: socket.id,
                to: iceMsgObject.to || 'broadcast'
            };

            if (iceMsgObject.to) {
                io.to(iceMsgObject.to).emit(cameraEndpoint + 'camera' + 'voiceicecandidate', reorderedIceMsgObject);
            } else {
                io.emit(cameraEndpoint + 'camera' + 'voiceicecandidate', reorderedIceMsgObject);
            }
        });

        socket.on(cameraEndpoint + 'camera' + 'nameupdate', (nameUpdateMsgObject) => {
            console.log('CAMERA NAME UPDATE:', cameraEndpoint, 'from:', socket.id, 'name:', nameUpdateMsgObject.cameraName || '(cleared)');

            const reorderedNameUpdateMsgObject = {
                cameraName: nameUpdateMsgObject.cameraName,
                userId: socket.id
            };

            // Broadcast to all clients (event name contains endpoint so only relevant clients receive it)
            io.emit(cameraEndpoint + 'camera' + 'nameupdate', reorderedNameUpdateMsgObject);
        });

        socket.on(cameraEndpoint + 'camera' + 'reconnect', (reconnectMsgObject) => {
            console.log('CAMERA RECONNECT REQUEST:', cameraEndpoint, 'from:', socket.id);

            const reorderedReconnectMsgObject = {
                userId: socket.id
            };

            // Broadcast to all clients (event name contains endpoint so only relevant clients receive it)
            io.emit(cameraEndpoint + 'camera' + 'reconnect', reorderedReconnectMsgObject);
        });

        socket.on(cameraEndpoint + 'camera' + 'requestroster', (rosterRequestMsgObject) => {
            console.log('CAMERA ROSTER REQUEST:', cameraEndpoint, 'from:', socket.id);

            const reorderedRosterRequestMsgObject = {
                userId: socket.id
            };

            // Broadcast to all clients so everyone announces themselves
            io.emit(cameraEndpoint + 'camera' + 'requestroster', reorderedRosterRequestMsgObject);
        });

        socket.on(cameraEndpoint + 'camera' + 'rosterresponse', (rosterResponseMsgObject) => {
            console.log('CAMERA ROSTER RESPONSE:', cameraEndpoint, 'from:', socket.id, 'to:', rosterResponseMsgObject.to, 'name:', rosterResponseMsgObject.cameraName || '(none)');

            const reorderedRosterResponseMsgObject = {
                from: socket.id,
                cameraName: rosterResponseMsgObject.cameraName
            };

            // Send to the specific requester
            io.to(rosterResponseMsgObject.to).emit(cameraEndpoint + 'camera' + 'rosterresponse', reorderedRosterResponseMsgObject);
        });
    });

    //GENERIC CHATMESSAGE SENDER, FOR MULTIPLE, INDEPENDENT CHAT CHANNELS
    function sendChatMessage(chatSocketEvent,chatMsgObject){
        //GET THE ADDRESS AND DATE
        let chatClientAddress = getClientIp(socket);
        let chatServerDate = new Date();
        let chatPstString = chatServerDate.toLocaleString("en-US", {timeZone: "America/Los_Angeles"});

        //create reordered object with server fields first
        const reorderedChatMsgObject = {
            CHATSERVERENDPOINT: endpoint,
            CHATSERVERPORT: listenPort,
            CHATSERVERUSER: chatClientAddress,
            CHATSERVERDATE: chatPstString,
            CHATUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            ...chatMsgObject
        };

        console.log(JSON.stringify(reorderedChatMsgObject));

        //broadcast
        io.emit(chatSocketEvent, reorderedChatMsgObject);
    }
    //GENERIC TAPMESSAGE SENDER, FOR MULTIPLE, INDEPENDENT CHAT CHANNELS
    function sendTapMessage(tapSocketEvent,tapMsgObject){

        //GET THE ADDRESS AND DATE
        let tapClientAddress = getClientIp(socket);
        let tapServerDate = new Date();
        let tapPstString = tapServerDate.toLocaleString("en-US", {timeZone: "America/Los_Angeles"});

        //create reordered object with server fields first
        const reorderedTapMsgObject = {
            CHATSERVERENDPOINT: endpoint,
            CHATSERVERPORT: listenPort,
            CHATSERVERUSER: tapClientAddress,
            CHATSERVERDATE: tapPstString,
            CHATUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            ...tapMsgObject
        };

        console.log(JSON.stringify(reorderedTapMsgObject));

        //broadcast TAP message (client page needs to have  a socket.on handler for this)
        io.emit(tapSocketEvent, reorderedTapMsgObject);

    }
    //GENERIC PATHMESSAGE SENDER, FOR MULTIPLE, INDEPENDENT CHAT CHANNELS
    function sendPathMessage(pathSocketEvent,pathMsgObject){
        let pathClientAddress = getClientIp(socket);
        let pathServerDate = new Date();
        let pathPstString = pathServerDate.toLocaleString("en-US", {timeZone: "America/Los_Angeles"});

        //create reordered object with server fields first
        const reorderedPathMsgObject = {
            CHATSERVERENDPOINT: endpoint,
            CHATSERVERPORT: listenPort,
            CHATSERVERUSER: pathClientAddress,
            CHATSERVERDATE: pathPstString,
            CHATUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            ...pathMsgObject
        };

        console.log(JSON.stringify(reorderedPathMsgObject));

        //broadcast TAP message (client page needs to have  a socket.on handler for this)
        io.emit(pathSocketEvent, reorderedPathMsgObject);
    }
    //GENERIC PRESENTATION IMAGE SENDER, FOR MULTIPLE, INDEPENDENT CHAT CHANNELS
    function sendPresentImageMessage(presentImageSocketEvent,presentImageMsgObject){
        let presentImageClientAddress = getClientIp(socket);
        let presentImageServerDate = new Date();
        let presentImagePstString = presentImageServerDate.toLocaleString("en-US", {timeZone: "America/Los_Angeles"});

        //create reordered object with server fields first
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
        let audioControlServerDate = new Date();
        let audioControlPstString = audioControlServerDate.toLocaleString("en-US", {timeZone: "America/Los_Angeles"});

        //create reordered object with server fields first
        const reorderedAudioControlMsgObject = {
            AUDIOCONTROLSERVERENDPOINT: endpoint,
            AUDIOCONTROLSERVERPORT: listenPort,
            AUDIOCONTROLSERVERUSER: audioControlClientAddress,
            AUDIOCONTROLSERVERDATE: audioControlPstString,
            AUDIOCONTROLUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            ...audioControlMsgObject
        };

        // Debug: log connected socket count
        const connectedSockets = io.sockets.sockets.size;
        console.log('AUDIO CONTROL: [' + connectedSockets + ' sockets] event=' + audioControlSocketEvent + ' ' + JSON.stringify(reorderedAudioControlMsgObject));

        io.emit(audioControlSocketEvent, reorderedAudioControlMsgObject);
    }

    function sendVideoControlMessage(videoControlSocketEvent, videoControlMsgObject){
        let videoControlClientAddress = getClientIp(socket);
        let videoControlServerDate = new Date();
        let videoControlPstString = videoControlServerDate.toLocaleString("en-US", {timeZone: "America/Los_Angeles"});

        //create reordered object with server fields first
        const reorderedVideoControlMsgObject = {
            VIDEOCONTROLSERVERENDPOINT: endpoint,
            VIDEOCONTROLSERVERPORT: listenPort,
            VIDEOCONTROLSERVERUSER: videoControlClientAddress,
            VIDEOCONTROLSERVERDATE: videoControlPstString,
            VIDEOCONTROLUSERCOUNT: stuffedAnimalWarPageCounters[endpoint],
            ...videoControlMsgObject
        };

        // Debug: log connected socket count
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



