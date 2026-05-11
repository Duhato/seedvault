# 🍓 SeedVault — Raspberry Pi Installation Guide

This guide walks you through running SeedVault on a Raspberry Pi as a always-on home server. Once set up, SeedVault will be available to every device on your home network 24/7.

---

## What You Need

- Raspberry Pi 4 (2GB RAM minimum, 4GB recommended)
- MicroSD card (16GB minimum, 32GB recommended — use a good quality card like SanDisk or Samsung)
- Power supply for your Pi
- Internet connection (ethernet recommended for a server, WiFi works too)
- Another computer to set up the SD card

---

## Step 1 — Install Raspberry Pi OS

1. On your computer, download **Raspberry Pi Imager** from **https://www.raspberrypi.com/software/**
2. Insert your microSD card into your computer
3. Open Raspberry Pi Imager
4. Click **Choose Device** → select your Pi model
5. Click **Choose OS** → select **Raspberry Pi OS Lite (64-bit)** — we want the version without a desktop since this will be a headless server
6. Click **Choose Storage** → select your microSD card
7. Click **Next**
8. When asked if you want to apply OS customisation settings click **Edit Settings**:
   - Set a **hostname** (e.g. `seedvault`)
   - Set a **username and password** — remember these!
   - Configure your **WiFi** if not using ethernet (enter your network name and password)
   - Under **Services** tab enable **SSH**
9. Click **Save** then **Yes** to apply settings
10. Click **Yes** to write — this will erase the card and write the OS

---

## Step 2 — Boot the Pi

1. Insert the microSD card into your Raspberry Pi
2. Connect ethernet cable if using wired connection
3. Plug in power
4. Wait 2-3 minutes for first boot

---

## Step 3 — Connect to the Pi

On your computer open a terminal (Mac/Linux) or PowerShell (Windows) and connect via SSH:

```bash
ssh username@seedvault.local
```

Replace `username` with the username you set in the imager. If `.local` doesn't work find your Pi's IP address from your router's admin page and use that instead.

Type `yes` when asked about the fingerprint, then enter your password.

---

## Step 4 — Update the Pi

```bash
sudo apt update && sudo apt upgrade -y
```

This may take a few minutes.

---

## Step 5 — Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

Verify Docker installed correctly:

```bash
docker --version
```

---

## Step 6 — Install SeedVault

```bash
mkdir ~/seedvault
cd ~/seedvault
curl -fsSL https://raw.githubusercontent.com/Duhato/seedvault/main/app/docker-compose.yml -o docker-compose.yml && docker compose up -d
```

The first run downloads the SeedVault image which is about 200MB. This may take several minutes on a slower connection.

---

## Step 7 — Find Your Pi's IP Address

```bash
hostname -I
```

Write down the IP address — it will look like `192.168.1.xxx`. This is how every device on your network will access SeedVault.

---

## Step 8 — Set a Static IP Address (Important!)

Without a static IP your Pi's address could change after a reboot making SeedVault unreachable. Set a static IP so the address never changes.

**Option A — Set it in your router (easiest):**
1. Log into your router admin page (usually `192.168.1.1` or `192.168.0.1`)
2. Find **DHCP Reservations** or **Static IP** or **Address Reservation**
3. Find your Pi in the list and assign it a fixed IP
4. Save and reboot the router

**Option B — Set it on the Pi:**

```bash
sudo nano /etc/dhcpcd.conf
```

Add these lines at the bottom (adjust to match your network):
Press `Ctrl+X`, then `Y`, then `Enter` to save. Reboot:

```bash
sudo reboot
```

---

## Step 9 — Open SeedVault

On any device on your home network open a browser and go to:
Use the static IP you set. You will see a certificate warning — click Advanced and proceed. This is normal.

---

## Step 10 — First Time Setup

Create your admin account, set your zip code and frost dates, and you are ready to go.

---

## Accessing SeedVault

From any device on your home WiFi:
- **Browser:** `https://192.168.1.100:8765`
- **Install as app:** In Chrome tap the menu and select **Add to Home Screen**

Bookmark it on every device for easy access.

---

## Make Sure SeedVault Survives Reboots

Docker is configured to restart containers automatically. Verify:

```bash
docker compose ps
```

You should see your containers running. The `unless-stopped` restart policy means they start automatically after a reboot.

Enable Docker to start on boot:

```bash
sudo systemctl enable docker
```

---

## Updating SeedVault

```bash
cd ~/seedvault
docker compose pull
docker compose up -d
```

---

## Useful Commands

```bash
# Check if SeedVault is running
docker compose ps

# View logs
docker compose logs -f app

# Stop SeedVault
docker compose down

# Start SeedVault
docker compose up -d

# Restart SeedVault
docker compose restart app
```

---

## Troubleshooting

**Cannot connect after reboot:**
- Check your Pi is on with `ping seedvault.local`
- SSH in and run `docker compose up -d` from the seedvault folder

**Running out of storage:**
- Check storage: `df -h`
- Old Docker images take space: `docker system prune -a`

**Pi is slow:**
- Make sure you are using a good quality SD card
- Check temperature: `vcgencmd measure_temp` — should be under 80°C
- Consider adding a heatsink or fan

**WiFi drops:**
- Ethernet is more reliable for a server
- Disable WiFi power saving: `sudo iwconfig wlan0 power off`
