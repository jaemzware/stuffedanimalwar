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
let listenPort =55556;
const setupRouter = require('./pisetup/setup-endpoint'); //RASBERRY PI wifi setup

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
app.use(express.json()); // ADD THIS LINE - Parse JSON request bodies
app.use(setupRouter);
//CONFIGURE EXPRESS TO TRUST PROXY ON FILE UPLOAD
app.set('trust proxy', true); // Trust the first proxy

//START LISTENING
server.listen(listenPort, () => {
    console.log(`listening on *:${listenPort}`);
});

/**
 * ENDPOINTS: Each endpoint uses the custom .json of the same name. if there is not a custom .json of the same name, the fallback is jim.json]
 */
const stuffedAnimalWarEndpoints = ['jim', 'maddie', 'jacob', 'katie', 'mark', 'nina', 'frank', 'bill', 'ted', 'picompat'];
const stuffedAnimalWarChatSocketEvent = 'chatmessage';
const stuffedAnimalWarTapSocketEvent = 'tapmessage';
const stuffedAnimalWarPathSocketEvent = 'pathmessage';
const stuffedAnimalWarPresentImageSocketEvent = 'presentimage';
const stuffedAnimalWarChatImageSocketEvent = 'uploadchatimage';
const stuffedAnimalWarChatVideoSocketEvent = 'uploadchatvideo';
const stuffedAnimalWarConnectSocketEvent = 'connect';
const stuffedAnimalWarDisconnectSocketEvent = 'disconnect';
const stuffedAnimalWarPageCounters = stuffedAnimalWarEndpoints.reduce((acc, page) => {
    acc[page] = 0; // Set each page name as a key with an initial value of 0
    return acc;
}, {});

// Load the template HTML once at startup
let templateHtml = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

//SERVE INDEX FOR NO ENDPOINT AFTER PORT ADDRESS
app.get('/', function(req, res){
    // Generate dynamic HTML with links from stuffedAnimalWarEndpoints
    const linksHtml = stuffedAnimalWarEndpoints.map(endpoint =>
        `            <h2><a class="jaemzwarelogo" href="${endpoint}">${endpoint}</a></h2>`
    ).join('\n');

    const html = `<!--STUFFED ANIMAL WAR - jaemzware.org - 20150611 -->
<!--STUFFED ANIMAL WAR - stuffedanimalwar.com - 20211128 -->

<!DOCTYPE html>
<html>
    <head>
        <title>stuffedanimalwar.com</title>
        <link rel="Stylesheet" href="stylebase.css" />
    </head>
    <body>
        <div class='seattlenativelinks'>
${linksHtml}
        </div>
    </body>
</html>
`;

    res.send(html);
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

            // Generate HTML by replacing placeholders in the template
            let html = templateHtml;
            html = html.replace('{{ENDPOINT}}', configData.endpoint);
            html = html.replace('{{MASTER_ALIAS}}', configData.masterAlias);
            html = html.replace('{{UNSPECIFIED_ALIAS}}', configData.unspecifiedAlias);
            html = html.replace('{{STUFFED_ANIMAL_MEDIA_OBJECT}}', JSON.stringify(configData.stuffedAnimalMediaObject, null, 2));
            html = html.replace('{{MEDIA_OBJECT}}', JSON.stringify(configData.mediaObject, null, 2));
            html = html.replace('{{RESPONSES_OBJECT}}', JSON.stringify(configData.responsesObject, null, 2));

            // Send the generated HTML
            res.send(html);
        } catch (error) {
            console.error(`Error generating page for endpoint ${endpoint}:`, error);
            res.status(500).send(`Error generating page for endpoint ${endpoint}: ${error.message}`);
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
 * mp3 metadata
 */
// MP3 metadata proxy endpoint
app.get('/mp3-metadata', async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        // Check if it's a remote URL (and not localhost/127.0.0.1)
        const isRemoteUrl = url.startsWith('http') &&
            !url.includes('localhost') &&
            !url.includes('127.0.0.1');

        if (isRemoteUrl) {
            // Remote URL - fetch the file
            const response = await fetch(url);
            if (!response.ok) {
                return res.status(response.status).json({
                    error: `Failed to fetch: ${response.statusText}`
                });
            }

            // Get the file data
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            try {
                // Read tags using NodeID3
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
                console.error('Error parsing metadata:', metadataError);

                // Fallback to basic info
                const filename = url.split('/').pop().split('.')[0];

                res.json({
                    title: filename,
                    artist: '',
                    album: '',
                    artwork: null
                });
            }
        } else {
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
                // Read tags using NodeID3
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
        res.status(500).json({ error: 'Error processing metadata' });
    }
});
/**
 *  ON PERSISTENT CONNECTION
 *  handler for incoming socket connections
 *  curl https://ipinfo.io/71.212.60.26 for ip address info (replace ip with desired ip)
 */
io.on('connection', function(socket){
    //Get endpoint that made the connection (passed in .html io() instantiation)
    const endpoint =  socket.handshake.query.endpoint;
    let chatClientAddress = socket.handshake.address;
    let chatServerDate = new Date();
    let connectChatPstString = chatServerDate.toLocaleString("en-US", {timeZone: "America/Los_Angeles"});
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

    //COMMON--------------------------------------------------------------------------------------
    socket.on('disconnect', function(){
        let chatClientAddress = socket.handshake.address;
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
    });
         
    //ON ERROR
    socket.on('error', function(errorMsgObject){
        let chatClientAddress = socket.handshake.address;
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
    });

    //GENERIC CHATMESSAGE SENDER, FOR MULTIPLE, INDEPENDENT CHAT CHANNELS
    function sendChatMessage(chatSocketEvent,chatMsgObject){
        //GET THE ADDRESS AND DATE
        let chatClientAddress = socket.handshake.address;
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
        let tapClientAddress = socket.handshake.address;
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
        let pathClientAddress = socket.handshake.address;
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
        let presentImageClientAddress = socket.handshake.address;
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

});



