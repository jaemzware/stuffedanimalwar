#!/usr/bin/env node
/**
 * camera-autostart.js
 *
 * Puppeteer script to automatically open the camera broadcaster page
 * and start broadcasting without manual intervention.
 *
 * Usage:
 *   node camera-autostart.js [port] [label]
 *
 * Examples:
 *   node camera-autostart.js                    # Uses localhost:55556, default label
 *   node camera-autostart.js 55556              # Specify port
 *   node camera-autostart.js 55556 "Pi Camera"  # Specify port and label
 *
 * Environment variables:
 *   CAMERA_URL    - Full URL to camera-broadcaster.html (overrides port)
 *   CAMERA_LABEL  - Label for the camera broadcast
 *   CAMERA_DELAY  - Delay in ms before clicking start (default: 2000)
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
const port = process.argv[2] || process.env.PORT || 55556;
const label = process.argv[3] || process.env.CAMERA_LABEL || 'Pi Camera';
const url = process.env.CAMERA_URL || `https://localhost:${port}/camera-broadcaster.html`;
const startDelay = parseInt(process.env.CAMERA_DELAY) || 2000;

async function main() {
    console.log('=== Camera Auto-Start ===');
    console.log(`URL: ${url}`);
    console.log(`Label: ${label}`);
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
                '--autoplay-policy=no-user-gesture-required',
                '--no-sandbox',  // Often needed on Pi
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',  // Helps with memory on Pi
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--start-maximized',
                '--ignore-certificate-errors'  // For self-signed certs
            ],
        };

        // Use system Chromium on Pi
        if (useSystemChromium && systemChromium) {
            launchOptions.executablePath = systemChromium;
        }

        browser = await puppeteer.launch(launchOptions);

        const page = await browser.newPage();

        // Set viewport
        await page.setViewport({ width: 1024, height: 768 });

        // Listen for console messages from the page
        page.on('console', msg => {
            console.log(`[Browser] ${msg.text()}`);
        });

        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Wait for the status to show "Connected"
        console.log('Waiting for server connection...');
        await page.waitForFunction(
            () => document.getElementById('status').textContent.includes('Connected'),
            { timeout: 30000 }
        );
        console.log('Connected to server!');

        // Wait for camera to be enumerated (the select should have more than 1 option)
        console.log('Waiting for camera enumeration...');
        await page.waitForFunction(
            () => document.getElementById('cameraSelect').options.length > 1,
            { timeout: 30000 }
        );

        // Get camera info
        const cameraInfo = await page.evaluate(() => {
            const select = document.getElementById('cameraSelect');
            return {
                count: select.options.length - 1,  // Minus the "Select a camera..." option
                selected: select.options[select.selectedIndex].textContent
            };
        });
        console.log(`Found ${cameraInfo.count} camera(s). Selected: ${cameraInfo.selected}`);

        // Set the label
        console.log(`Setting label to: ${label}`);
        await page.evaluate((newLabel) => {
            document.getElementById('labelInput').value = newLabel;
        }, label);

        // Wait a moment for the preview to stabilize
        console.log(`Waiting ${startDelay}ms before starting broadcast...`);
        await new Promise(resolve => setTimeout(resolve, startDelay));

        // Click the start button
        console.log('Clicking "Start Broadcasting"...');
        await page.click('#startBtn');

        // Verify broadcasting started
        await page.waitForFunction(
            () => document.getElementById('status').textContent.includes('Broadcasting'),
            { timeout: 10000 }
        );
        console.log('');
        console.log('=== Broadcasting Started! ===');
        console.log('The browser will stay open. Press Ctrl+C to stop.');
        console.log('');

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
