# StuffedAnimalWar Pi Setup

Raspberry Pi configuration for dual-mode WiFi operation by Jaemzware LLC.

## Overview

This setup allows your Raspberry Pi to operate in two modes:

1. **AP Mode** - Creates a wireless access point for "in the woods" use (no internet required)
2. **Home WiFi Mode** - Connects to your home network for local LAN access

The Pi automatically falls back to AP mode if it can't connect to your saved WiFi network.

## Hardware Requirements

- Raspberry Pi Zero 2 W (or any Pi with WiFi)
- MicroSD card (8GB minimum)
- Power supply

## Services Included

- **StuffedAnimalWar** - Chat and media sharing platform
- **AnalogArchive** - Audio streaming service (optional)

## Installation

### 1. Prepare SD Card

Flash Raspberry Pi OS Lite (headless) to your SD card.

### 2. Clone Repositories

```bash
cd /home/jaemzware

# Clone StuffedAnimalWar (main repository with setup scripts)
git clone https://github.com/jaemzware/stuffedanimalwar.git

# Clone AnalogArchive (optional, for audio streaming)
git clone https://github.com/jaemzware/analogarchivejs.git analogarchive

cd stuffedanimalwar
```

**Note:** The AnalogArchive repository is cloned as `analogarchive` (not `analogarchivejs`) to match the expected directory structure.

### 3. Install Dependencies

```bash
cd pisetup
sudo ./install.sh
```

The installer will:
- Install nginx, NetworkManager, and other dependencies
- Generate self-signed SSL certificates
- Configure the access point
- Set up systemd services
- Offer to reboot

### 4. First Boot

On first boot (or when no WiFi credentials are saved):
- Pi starts in **AP Mode**
- Connect to WiFi: **StuffedAnimalWAP**
- Password: **stuffedanimal**
- Navigate to: `https://stuffedanimalwar.local/setup`
- Enter your home WiFi credentials
- Pi will reboot and connect to your home network

## Usage

### Accessing Services

**AP Mode (in the woods):**
- Connect to: StuffedAnimalWAP
- StuffedAnimalWar: `https://stuffedanimalwar.local`
- AnalogArchive: `https://analogarchive.local`

**Home WiFi Mode:**
- Ensure devices are on the same network as the Pi
- StuffedAnimalWar: `https://stuffedanimalwar.local`
- AnalogArchive: `https://analogarchive.local`

### Resetting WiFi

To return to AP mode:

**Method 1: Delete credentials file**
1. Power off Pi
2. Remove SD card
3. Delete `/home/jaemzware/stuffedanimalwar/wifi-credentials.json`
4. Reinsert card and boot

**Method 2: Automatic fallback**
- If the Pi can't connect to saved WiFi after 60 seconds, it automatically switches to AP mode
- This happens when you take it somewhere without your home WiFi

### Viewing Logs

```bash
# WiFi manager logs
sudo journalctl -u wifi-manager -f

# StuffedAnimalWar logs
sudo journalctl -u stuffedanimalwar -f

# AnalogArchive logs
sudo journalctl -u analogarchive -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

## File Structure

```
/home/jaemzware/
├── stuffedanimalwar/
│   ├── pisetup/
│   │   ├── install.sh                    # Master installation script
│   │   ├── wifi-manager.sh               # WiFi fallback logic
│   │   ├── wifi-manager.service          # Systemd service for WiFi
│   │   ├── generate-certs.sh             # SSL certificate generation
│   │   ├── setup-endpoint.js             # WiFi setup web interface
│   │   ├── stuffedanimalwar.service      # App service file
│   │   ├── analogarchive.service         # AnalogArchive service file
│   │   ├── nginx-stuffedanimalwar.conf   # Nginx reverse proxy
│   │   ├── nginx-analogarchive.conf      # Nginx reverse proxy
│   │   └── README.md                     # This file
│   ├── sslcert/                          # Generated SSL certificates
│   │   ├── cert.pem
│   │   └── key.pem
│   ├── wifi-credentials.json             # Saved WiFi credentials (created via /setup)
│   └── index.js                          # Main application
└── analogarchive/                        # Optional: AnalogArchive audio streaming
    └── index.js
```

## Default AP Settings

- **SSID:** StuffedAnimalWAP
- **Password:** stuffedanimal
- **IP Address:** 192.168.4.1
- **DHCP Range:** 192.168.4.2-192.168.4.50

To change these, edit `install.sh` before running.

## Troubleshooting

**Can't access .local addresses:**
- Ensure avahi-daemon is running: `sudo systemctl status avahi-daemon`
- Try IP address instead: `https://192.168.4.1` (AP mode)

**Services won't start:**
- Check logs: `sudo journalctl -u stuffedanimalwar -n 50`
- Verify Node.js is installed: `node --version`

**WiFi won't connect:**
- Check NetworkManager: `sudo systemctl status NetworkManager`
- View saved connections: `nmcli connection show`
- Manually test: `sudo nmcli connection up HomeWiFi`

**Certificate warnings:**
- Expected with self-signed certificates
- Click "Advanced" → "Proceed" in your browser
- Certificate shows "Jaemzware LLC" organization

## Support

For issues or questions:
- GitHub: https://github.com/jaemzware/stuffedanimalwar
- Check logs using journalctl commands above

## License

© 2025 Jaemzware LLC