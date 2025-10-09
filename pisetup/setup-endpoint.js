// WiFi Setup Endpoint for Raspberry Pi
// Jaemzware LLC

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');

const CREDS_FILE = '/home/jaemzware/stuffedanimalwar/wifi-credentials.json';

// Serve the setup page
router.get('/setup', async (req, res) => {
    // Check if credentials file exists and read it
    let existingSSID = '';
    let hasExistingCreds = false;
    let isInAPMode = false;

    try {
        const credsData = await fs.readFile(CREDS_FILE, 'utf8');
        const creds = JSON.parse(credsData);
        existingSSID = creds.ssid || '';
        hasExistingCreds = true;
    } catch (error) {
        // File doesn't exist or is invalid - that's okay
    }

    // Check if we're currently in AP mode
    try {
        const { stdout } = await execPromise('nmcli -t -f NAME connection show --active');
        isInAPMode = stdout.includes('StuffedAnimalWAP');
    } catch (error) {
        // If we can't check, assume not in AP mode
    }

    // Only show warning if we have existing creds AND we're in AP mode (connection failed)
    const showWarning = hasExistingCreds && isInAPMode;

    const html = `<!DOCTYPE html>
<html>
<head>
    <title>WiFi Setup - StuffedAnimalWar</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 500;
        }
        input[type="text"], input[type="password"], button {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input[type="text"]:focus, input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            cursor: pointer;
            font-weight: 600;
            margin-top: 10px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        .loading {
            display: none;
            text-align: center;
            margin-top: 20px;
            color: #667eea;
        }
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .status {
            margin-top: 20px;
            padding: 12px;
            border-radius: 6px;
            display: none;
        }
        .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #999;
            font-size: 12px;
        }
        .hint {
            font-size: 12px;
            color: #999;
            margin-top: 4px;
        }
        .warning-box {
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 20px;
            color: #856404;
        }
        .warning-box strong {
            display: block;
            margin-bottom: 5px;
        }
        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        .button-secondary {
            background: #dc3545 !important;
            flex: 1;
        }
        .button-secondary:hover {
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4) !important;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>WiFi Setup</h1>
        <p class="subtitle">Connect your StuffedAnimalWar to your home network</p>
        
        ${showWarning ? `
        <div class="warning-box">
            <strong>⚠️ Previous Connection Failed</strong>
            The Pi couldn't connect to "${existingSSID}". Check your password or try a different network.
        </div>
        ` : ''}
        
        <form id="wifiForm">
            <div class="form-group">
                <label for="ssid">Network Name (SSID):</label>
                <input type="text" id="ssid" name="ssid" list="networks" placeholder="Enter your WiFi network name" value="${existingSSID}" required autocomplete="off">
                <datalist id="networks">
                </datalist>
                <div class="hint">Type your network name or select from detected networks</div>
            </div>
            
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" placeholder="Enter WiFi password" required>
                <div class="hint">Re-enter your password to try again</div>
            </div>
            
            <div class="button-group">
                <button type="submit" id="submitBtn">Connect</button>
                ${hasExistingCreds ? `<button type="button" class="button-secondary" id="resetBtn">Clear & Reboot</button>` : ''}
            </div>
        </form>
        
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Connecting and rebooting...</p>
            <p style="font-size: 14px; margin-top: 10px;">This will take about 60 seconds.</p>
        </div>
        
        <div class="status" id="status"></div>
        
        <div class="footer">
            © 2025 Jaemzware LLC
        </div>
    </div>

    <script>
        // Scan for networks on page load
        async function scanNetworks() {
            try {
                const response = await fetch('/setup/scan');
                const data = await response.json();
                
                const datalist = document.getElementById('networks');
                datalist.innerHTML = '';
                
                if (data.networks && data.networks.length > 0) {
                    data.networks.forEach(network => {
                        const option = document.createElement('option');
                        option.value = network;
                        datalist.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Error scanning networks:', error);
                // Silent fail - user can still type network name manually
            }
        }

        // Handle form submission
        document.getElementById('wifiForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const ssid = document.getElementById('ssid').value.trim();
            const password = document.getElementById('password').value;
            const submitBtn = document.getElementById('submitBtn');
            const loading = document.getElementById('loading');
            const status = document.getElementById('status');
            
            if (!ssid || !password) {
                showStatus('Please enter a network name and password.', 'error');
                return;
            }
            
            // Disable form and show loading
            submitBtn.disabled = true;
            loading.style.display = 'block';
            status.style.display = 'none';
            
            try {
                const response = await fetch('/setup/connect', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ssid, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showStatus('WiFi configured! Rebooting... The Pi will connect to your home network.', 'success');
                } else {
                    showStatus('Error: ' + data.message, 'error');
                    submitBtn.disabled = false;
                    loading.style.display = 'none';
                }
            } catch (error) {
                console.error('Error:', error);
                showStatus('Connection error. Please try again.', 'error');
                submitBtn.disabled = false;
                loading.style.display = 'none';
            }
        });

        function showStatus(message, type) {
            const status = document.getElementById('status');
            status.textContent = message;
            status.className = 'status ' + type;
            status.style.display = 'block';
        }

        // Handle reset button
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                if (!confirm('Clear saved WiFi credentials and reboot? The Pi will restart in AP mode.')) {
                    return;
                }
                
                resetBtn.disabled = true;
                document.getElementById('submitBtn').disabled = true;
                document.getElementById('loading').style.display = 'block';
                
                try {
                    const response = await fetch('/setup/reset', {
                        method: 'POST'
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        showStatus('Credentials cleared. Rebooting to AP mode...', 'success');
                    } else {
                        showStatus('Error: ' + data.message, 'error');
                        resetBtn.disabled = false;
                        document.getElementById('submitBtn').disabled = false;
                        document.getElementById('loading').style.display = 'none';
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showStatus('Reset error. Please try again.', 'error');
                    resetBtn.disabled = false;
                    document.getElementById('submitBtn').disabled = false;
                    document.getElementById('loading').style.display = 'none';
                }
            });
        }

        // Scan networks on page load (may not work in AP mode, but try anyway)
        scanNetworks();
    </script>
</body>
</html>`;

    res.send(html);
});

// Scan for available WiFi networks
router.get('/setup/scan', async (req, res) => {
    try {
        const { stdout } = await execPromise('nmcli -t -f SSID dev wifi list');
        const networks = stdout
            .split('\n')
            .filter(ssid => ssid.trim() && ssid !== '--' && ssid !== 'StuffedAnimalWAP')
            .filter((ssid, index, self) => self.indexOf(ssid) === index); // Remove duplicates

        res.json({ networks });
    } catch (error) {
        console.error('Error scanning WiFi:', error);
        res.status(500).json({ error: 'Failed to scan networks', networks: [] });
    }
});

// Save WiFi credentials and reboot
router.post('/setup/connect', async (req, res) => {
    try {
        const { ssid, password } = req.body;

        if (!ssid || !password) {
            return res.status(400).json({ success: false, message: 'SSID and password required' });
        }

        // Save credentials to JSON file
        const credentials = { ssid, password };
        await fs.writeFile(CREDS_FILE, JSON.stringify(credentials, null, 2));

        console.log(`WiFi credentials saved for SSID: ${ssid}`);

        // Send success response before rebooting
        res.json({ success: true, message: 'Credentials saved. Rebooting...' });

        // Reboot after a short delay to allow response to be sent
        setTimeout(() => {
            exec('sudo reboot', (error) => {
                if (error) {
                    console.error('Reboot error:', error);
                }
            });
        }, 1000);

    } catch (error) {
        console.error('Error saving credentials:', error);
        res.status(500).json({ success: false, message: 'Failed to save credentials' });
    }
});

// Clear WiFi credentials and reboot
router.post('/setup/reset', async (req, res) => {
    try {
        // Delete credentials file if it exists
        try {
            await fs.unlink(CREDS_FILE);
            console.log('WiFi credentials deleted');
        } catch (error) {
            // File might not exist - that's okay
        }

        // Send success response before rebooting
        res.json({ success: true, message: 'Credentials cleared. Rebooting...' });

        // Reboot after a short delay to allow response to be sent
        setTimeout(() => {
            exec('sudo reboot', (error) => {
                if (error) {
                    console.error('Reboot error:', error);
                }
            });
        }, 1000);

    } catch (error) {
        console.error('Error resetting credentials:', error);
        res.status(500).json({ success: false, message: 'Failed to reset credentials' });
    }
});

module.exports = router;