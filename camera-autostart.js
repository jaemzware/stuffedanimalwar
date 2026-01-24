#!/usr/bin/env node
/**
 * camera-autostart.js
 *
 * Puppeteer script to automatically join a room's camera page
 * and start sharing camera as a peer.
 *
 * Usage:
 *   node camera-autostart.js <domain> <room> [cameraName]
 *
 * Examples:
 *   node camera-autostart.js localhost:55556 jim999 "Pi Camera"    -> https://localhost:55556/jim999camera
 *   node camera-autostart.js stuffedanimalwar.local frontdoor      -> https://stuffedanimalwar.local/frontdoorcamera
 *   node camera-autostart.js stuffedanimalwar.com kitchen "Kitchen"-> https://stuffedanimalwar.com/kitchencamera
 *
 * Environment variables:
 *   CAMERA_DOMAIN - Domain (e.g., stuffedanimalwar.local:55556)
 *   CAMERA_ROOM   - Room name (e.g., jim999)
 *   CAMERA_NAME   - Display name for the camera
 *   CAMERA_DELAY  - Delay in ms before enabling camera (default: 3000)
 *   USE_SYSTEM_CHROMIUM - Set to "true" to use system Chromium (for Pi)
 */

const fs = require('fs');

// Detect if we're on a Pi by checking for system Chromium
const systemChromiumPaths = [
    '/usr/bin/chromium-browser',  // Raspberry Pi OS
    '/usr/bin/chromium',          // Some Linux distros
];
const systemChromium = systemChromiumPaths.find(p => fs.existsSync(p));
const useSystemChromium = process.env.USE_SYSTEM_CHROMIUM === 'true' || !!systemChromium;

// Use puppeteer-core if system Chromium, otherwise regular puppeteer
const puppeteer = useSystemChromium
    ? require('puppeteer-core')
    : require('puppeteer');

// Configuration
const domain = process.argv[2] || process.env.CAMERA_DOMAIN;
const room = process.argv[3] || process.env.CAMERA_ROOM;
const cameraName = process.argv[4] || process.env.CAMERA_NAME || 'Pi Camera';
const startDelay = parseInt(process.env.CAMERA_DELAY) || 3000;

function printUsage() {
    console.log(`
Usage: node camera-autostart.js <domain> <room> [cameraName]

Arguments:
  domain      Server domain with optional port (e.g., localhost:55556, stuffedanimalwar.local)
  room        Room name to join (e.g., jim999, frontdoor)
  cameraName  Display name for camera (default: "Pi Camera")

Examples:
  node camera-autostart.js localhost:55556 jim999                    -> /jim999camera
  node camera-autostart.js localhost:55556 jim999 "Pi Camera"        -> /jim999camera
  node camera-autostart.js stuffedanimalwar.local kitchen "Kitchen"  -> /kitchencamera

Environment variables:
  CAMERA_DOMAIN, CAMERA_ROOM, CAMERA_NAME, CAMERA_DELAY
`);
}

if (!domain || !room) {
    console.error('Error: domain and room are required');
    printUsage();
    process.exit(1);
}

const url = `https://${domain}/${room}camera`;

async function main() {
    console.log('=== Camera Auto-Start ===');
    console.log(`URL: ${url}`);
    console.log(`Room: ${room}`);
    console.log(`Camera Name: ${cameraName}`);
    console.log(`Start delay: ${startDelay}ms`);
    if (useSystemChromium) {
        console.log(`Using system Chromium: ${systemChromium}`);
    }
    console.log('');

    let browser;

    try {
        console.log('Launching browser...');

        const launchOptions = {
            headless: false,  // Headed mode - you can watch it
            ignoreHTTPSErrors: true,  // Accept self-signed certificates
            args: [
                '--use-fake-ui-for-media-stream',  // Auto-accept camera permission
                '--enable-usermedia-screen-capturing',
                '--allow-http-screen-capture',
                '--auto-accept-camera-and-microphone-capture',
                '--autoplay-policy=no-user-gesture-required',
                '--no-sandbox',  // Often needed on Pi
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',  // Helps with memory on Pi
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--start-maximized',
                '--ignore-certificate-errors',  // For self-signed certs
                '--disable-features=WebRtcHideLocalIpsWithMdns',  // Help with WebRTC on local network
                '--disable-breakpad',  // Disable crash reporter
                '--disable-crash-reporter',
                '--password-store=basic',  // Don't use system keyring (avoids password prompt)
                '--disable-background-networking'
            ],
        };

        // Use system Chromium on Pi
        if (useSystemChromium && systemChromium) {
            launchOptions.executablePath = systemChromium;
        }

        browser = await puppeteer.launch(launchOptions);

        // Grant camera and microphone permissions via browser context
        const context = browser.defaultBrowserContext();
        await context.overridePermissions(`https://${domain}`, [
            'camera',
            'microphone'
        ]);
        console.log('Granted camera/microphone permissions');

        const page = await browser.newPage();

        // Set viewport
        await page.setViewport({ width: 1024, height: 768 });

        // Listen for console messages from the page
        page.on('console', msg => {
            const text = msg.text();
            // Filter to show relevant camera/connection messages
            if (text.includes('Camera') || text.includes('camera') ||
                text.includes('connect') || text.includes('peer') ||
                text.includes('WebRTC') || text.includes('error') ||
                text.includes('Error')) {
                console.log(`[Browser] ${text}`);
            }
        });

        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for the page to fully load
        console.log('Waiting for page to load...');
        await page.waitForSelector('#cameraToggleButton', { timeout: 30000 });

        // Wait for socket connection (status updates or connect button becomes available)
        console.log('Waiting for socket connection...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Set the camera name
        console.log(`Setting camera name to: ${cameraName}`);
        await page.evaluate((name) => {
            const input = document.getElementById('cameraNameInput');
            if (input) {
                input.value = name;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }, cameraName);

        // Wait before enabling camera
        console.log(`Waiting ${startDelay}ms before enabling camera...`);
        await new Promise(resolve => setTimeout(resolve, startDelay));

        // Click the camera toggle button to enable camera
        console.log('Enabling camera...');
        await page.click('#cameraToggleButton');

        // Wait for camera to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify camera is enabled (button should have 'active' class)
        const cameraEnabled = await page.evaluate(() => {
            const btn = document.getElementById('cameraToggleButton');
            return btn && btn.classList.contains('active');
        });

        if (cameraEnabled) {
            console.log('');
            console.log('=== Camera Enabled! ===');
            console.log(`Broadcasting in room: ${room}`);
            console.log(`Camera name: ${cameraName}`);
            console.log('');
            console.log('The browser will stay open. Press Ctrl+C to stop.');
            console.log('');
        } else {
            console.log('Warning: Camera may not have enabled correctly. Check the browser window.');
        }

        // Keep the script running - the browser stays open
        await new Promise(() => {});  // Wait forever

    } catch (error) {
        console.error('Error:', error.message);
        if (browser) {
            await browser.close();
        }
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nShutting down...');
    process.exit(0);
});

main();
