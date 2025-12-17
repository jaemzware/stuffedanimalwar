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

**Choose your installation path:**

- **Pi Zero 2 W with Raspberry Pi OS Lite (32-bit)**: Follow the standard installation below
- **Pi 5 with hostname `marginalway` and full Raspberry Pi OS (64-bit)**: Use `install-marginalway.sh` (see Alternative Installation below)

---

### Alternative Installation: Pi 5 with Full OS and Custom Hostname

If you have a **Raspberry Pi 5** with the **full 64-bit Raspberry Pi OS** and want a custom hostname (instead of `stuffedanimalwar`), use this installer:

```bash
cd /home/jaemzware/stuffedanimalwar/pisetup
chmod +x install-marginalway.sh

# Default hostname (marginalway)
sudo ./install-marginalway.sh

# Or specify a custom hostname for multiple devices
sudo ./install-marginalway.sh marginal1
sudo ./install-marginalway.sh marginal2
sudo ./install-marginalway.sh mycustomname
```

**Hostname Parameter:**
- If no hostname is provided, defaults to `marginalway`
- Hostname must be alphanumeric (hyphens allowed, but not at start/end)
- The script sets the system hostname, Samba netbios name, and displays correct URLs

This variant:
- ✅ Works with Raspberry Pi 5 and full OS (64-bit)
- ✅ Supports custom hostnames for running multiple devices on the same network
- ✅ Includes all dual WiFi setup features
- ✅ Uses `nginx-marginalway.conf` for proper hostname routing
- ✅ Access services at `https://{hostname}.local/`

**Suggested Credentials:**

These are the recommended credentials for this installation (based on the initial setup):

- **Username:** `jaemzware`
- **SSH Password:** `marginal`
- **Hostname:** `marginalway` (or your custom hostname)
- **SMB Password:** `marginalway`
- **WiFi SSID:** `StuffedAnimalWAP`
- **WiFi Password:** `stuffedanimal`

After installation, the Pi will boot into AP mode. Connect to **StuffedAnimalWAP** (password: **stuffedanimal**) and configure your home WiFi at `https://{hostname}.local/setup`.

---

### Standard Installation: Pi Zero 2 W with OS Lite

### 1. Prepare SD Card

Flash Raspberry Pi OS Lite (32-bit) to your SD card using Raspberry Pi Imager.

**Important Imager Settings:**
- **OS:** Raspberry Pi OS Lite (32-bit)
- **Hostname:** `stuffedanimalwar` (without .local)
- **Username:** `jaemzware` (CRITICAL - scripts expect this exact username)
- **Password:** Set your own password
- **Configure wireless LAN:** **CHECK** and enter your WiFi credentials (temporary, for initial setup only)
- **Enable SSH:** **CHECK** (required for initial setup)
- **Enable telemetry:** **UNCHECK** (optional, for privacy)

**Note:** You're configuring WiFi temporarily so you can SSH in and run the installer. After installation, you'll remove these credentials so the Pi starts in AP mode.

### 2. SSH Into the Pi

After flashing the SD card and booting the Pi, SSH into the device:

```bash
ssh jaemzware@stuffedanimalwar.local
```

Use the password you set in the Raspberry Pi Imager settings.

### 3. Install Git and Clone Repositories

```bash
# Install git (not included in Raspberry Pi OS Lite by default)
sudo apt update
sudo apt install -y git

cd /home/jaemzware

# Clone StuffedAnimalWar (main repository with setup scripts)
git clone https://github.com/jaemzware/stuffedanimalwar.git

# Clone AnalogArchive (optional, for audio streaming)
git clone https://github.com/jaemzware/analogarchivejs.git analogarchive

cd stuffedanimalwar
```

**Note:** The AnalogArchive repository is cloned as `analogarchive` (not `analogarchivejs`) to match the expected directory structure.

### 4. Configure Environment Variables

Both applications require `.env` files for configuration:

```bash
# StuffedAnimalWar
cd /home/jaemzware/stuffedanimalwar
cp .env.example .env
# Edit if needed (defaults should work for Pi setup)

# AnalogArchive
cd /home/jaemzware/analogarchive
cp .env.example .env
# Edit B2 credentials if you want cloud storage (optional)
```

**Note:** The `.env.example` files are included in the repositories with sensible defaults for Raspberry Pi use. The SSL certificate paths will be automatically populated by the installer.

**SSL Certificates:** AnalogArchive reuses the SSL certificates generated for StuffedAnimalWar - you don't need to create separate certificates. Just ensure your AnalogArchive `.env` file points to the StuffedAnimalWar certificate directory:
```bash
SSL_KEY_PATH=/home/jaemzware/stuffedanimalwar/sslcert/key.pem
SSL_CERT_PATH=/home/jaemzware/stuffedanimalwar/sslcert/cert.pem
```

### 4a. Add Music Files (AnalogArchive only)

If you're using AnalogArchive, create a music directory and add MP3 files:

```bash
# Create music directory
mkdir -p /home/jaemzware/analogarchive/music

# Copy MP3 files to the music directory
# You can do this via SCP from your computer:
# scp /path/to/your/songs/*.mp3 jaemzware@stuffedanimalwar.local:/home/jaemzware/analogarchive/music/
```

**Note:** AnalogArchive requires at least one MP3 file in the `/music` directory to function properly.

### 5. Install Dependencies

```bash
cd /home/jaemzware/stuffedanimalwar/pisetup
sudo ./install.sh
```

The installer will:
- Install nginx, NetworkManager, and other dependencies
- Generate self-signed SSL certificates
- Configure the access point
- Set up systemd services
- Install and configure Samba file sharing
- Offer to reboot

**Note:** During installation, you will be prompted to set a separate SMB (Samba) password for the `jaemzware` user. This password is used for network file sharing and can be different from your SSH password.

**Choose YES to reboot when prompted.**

After rebooting, the Pi will automatically start in AP mode (since no WiFi credentials are saved yet). Connect to the **StuffedAnimalWAP** access point (password: **stuffedanimal**) and SSH back in:

```bash
ssh jaemzware@stuffedanimalwar.local
```

### 6. Remove Initial WiFi Configuration

Now remove the temporary WiFi credentials that were set in the imager:

```bash
# Remove the WiFi configuration from the imager
sudo rm /etc/NetworkManager/system-connections/preconfigured.nmconnection
```

You're now ready to test the `/setup` page!

### 7. First AP Mode Boot

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
- AnalogArchive: `https://stuffedanimalwar.local:55557`

**Home WiFi Mode:**
- Ensure devices are on the same network as the Pi
- StuffedAnimalWar: `https://stuffedanimalwar.local`
- AnalogArchive: `https://stuffedanimalwar.local:55557`

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
│   │   ├── install.sh                    # Master installation script (Pi Zero 2 W)
│   │   ├── install-marginalway.sh        # Installation script with custom hostname support
│   │   ├── wifi-manager.sh               # WiFi fallback logic
│   │   ├── wifi-manager.service          # Systemd service for WiFi
│   │   ├── generate-certs.sh             # SSL certificate generation
│   │   ├── setup-endpoint.js             # WiFi setup web interface
│   │   ├── stuffedanimalwar.service      # App service file
│   │   ├── analogarchive.service         # AnalogArchive service file
│   │   ├── nginx-stuffedanimalwar.conf   # Nginx reverse proxy (stuffedanimalwar hostname)
│   │   ├── nginx-marginalway.conf        # Nginx reverse proxy (marginalway hostname)
│   │   └── README.md                     # This file
│   ├── sslcert/                          # Generated SSL certificates
│   │   ├── cert.pem
│   │   └── key.pem
│   ├── wifi-credentials.json             # Saved WiFi credentials (created via /setup)
│   └── index.js                          # Main application
└── analogarchive/                        # Optional: AnalogArchive audio streaming
    ├── music/                            # Music files directory
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

## Endpoints

**Stuffed Animal War (Port 55556)**
- `https://stuffedanimalwar.local/` - Main chat endpoint index (lists all available rooms: jim, maddie, jacob, katie, mark, nina, frank, bill, ted)
- `https://stuffedanimalwar.local/jim` - Real-time collaborative canvas and chat room (replace 'jim' with any endpoint name)
- `https://stuffedanimalwar.local/picompat` - Chat endpoint using only onboard media (configured via picompat.json for offline/WAP use)
- `https://stuffedanimalwar.local/setup` - WiFi configuration interface (enter credentials; falls back to WAP if connection fails or network unavailable)

**Analog Archive JS (Port 55557)**
- `https://stuffedanimalwar.local:55557/` - Audio player for onboard music folders (scanned from Pi's hard drives)
- `https://stuffedanimalwar.local:55557/analog` - Backblaze B2 bucket audio library (requires home WiFi with gateway)
- `https://stuffedanimalwar.local:55557/live` - Backblaze B2 live recordings library (requires home WiFi with gateway)

## Support

For issues or questions:
- GitHub: https://github.com/jaemzware/stuffedanimalwar
- Check logs using journalctl commands above

## License

© 2025 Jaemzware LLC