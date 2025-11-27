/**
 * Automatic Camera Broadcaster for Raspberry Pi
 *
 * This module automatically launches a headless browser that broadcasts
 * the Pi camera, making it available in the video player dropdown without
 * manual intervention.
 */

const puppeteer = require('puppeteer');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

let browser = null;
let page = null;

/**
 * Check if a camera is available on this device
 */
async function detectCamera() {
    try {
        // Try libcamera-hello first (Pi Camera Module)
        const { stdout: libcameraOutput } = await execPromise('libcamera-hello --list-cameras 2>&1');
        if (libcameraOutput && !libcameraOutput.includes('No cameras available')) {
            console.log('✓ Detected Pi Camera Module');
            return true;
        }
    } catch (err) {
        // libcamera not available, try v4l2
    }

    try {
        // Try v4l2 (USB cameras, older Pi cameras)
        const { stdout: v4l2Output } = await execPromise('v4l2-ctl --list-devices 2>&1');
        if (v4l2Output && v4l2Output.trim().length > 0) {
            console.log('✓ Detected V4L2 camera device');
            return true;
        }
    } catch (err) {
        // v4l2 not available
    }

    console.log('✗ No camera detected on this device');
    return false;
}

/**
 * Start the automatic broadcaster
 */
async function startBroadcaster(serverUrl = 'http://localhost:8080') {
    try {
        console.log('Starting automatic camera broadcaster...');

        // Check if camera exists
        const hasCamera = await detectCamera();
        if (!hasCamera) {
            console.log('⚠ Automatic broadcaster disabled: No camera found');
            return false;
        }

        // Launch Puppeteer with args needed for camera access
        console.log('Launching headless browser...');
        browser = await puppeteer.launch({
            headless: true, // Can set to false for debugging
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--use-fake-ui-for-media-stream', // Auto-grant camera permissions
                '--use-fake-device-for-media-stream', // Use fake device for testing
                '--allow-file-access-from-files'
            ],
            // Use system Chromium on Raspberry Pi
            executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser'
        });

        page = await browser.newPage();

        // Grant camera permissions
        const context = browser.defaultBrowserContext();
        await context.overridePermissions(serverUrl, ['camera']);

        // Enable console logs from the page
        page.on('console', msg => console.log('📹 Broadcaster:', msg.text()));
        page.on('pageerror', error => console.error('📹 Broadcaster Error:', error.message));

        // Navigate to broadcaster page
        const broadcasterUrl = `${serverUrl}/camera-broadcaster`;
        console.log(`Opening broadcaster page: ${broadcasterUrl}`);
        await page.goto(broadcasterUrl, { waitUntil: 'networkidle2' });

        // Wait for page to load
        await page.waitForSelector('#startButton');

        // Click the start button
        console.log('Starting broadcast...');
        await page.click('#startButton');

        // Wait a bit to ensure broadcasting started
        await page.waitForTimeout(2000);

        console.log('✓ Automatic camera broadcaster is running');
        console.log('  Camera should now appear in video player dropdown for all clients');

        return true;

    } catch (error) {
        console.error('Error starting automatic broadcaster:', error.message);
        if (browser) {
            await browser.close();
        }
        return false;
    }
}

/**
 * Stop the automatic broadcaster
 */
async function stopBroadcaster() {
    if (browser) {
        console.log('Stopping automatic camera broadcaster...');
        await browser.close();
        browser = null;
        page = null;
        console.log('✓ Broadcaster stopped');
    }
}

/**
 * Check if broadcaster is running
 */
function isRunning() {
    return browser !== null && page !== null;
}

// Handle cleanup on process exit
process.on('SIGINT', async () => {
    await stopBroadcaster();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await stopBroadcaster();
    process.exit(0);
});

module.exports = {
    startBroadcaster,
    stopBroadcaster,
    isRunning,
    detectCamera
};
