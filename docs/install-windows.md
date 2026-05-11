# 🪟 SeedVault — Windows Installation Guide

This guide will walk you through installing SeedVault on Windows step by step. No technical experience required.

---

## What You Need

- A Windows 10 or Windows 11 computer
- An internet connection
- About 10 minutes

---

## Step 1 — Install Docker Desktop

Docker is the software that runs SeedVault. Think of it as a container that holds everything SeedVault needs.

1. Open your browser and go to **https://www.docker.com/products/docker-desktop**
2. Click **Download for Windows**
3. Run the installer that downloads
4. When asked, make sure **Use WSL 2 instead of Hyper-V** is checked
5. Click OK and let it install
6. Restart your computer when prompted

After restarting, Docker Desktop will start automatically. You will see the Docker whale icon in your system tray (bottom right of the screen).

> **Note:** Docker Desktop is free for personal use.

---

## Step 2 — Open PowerShell

1. Press the **Windows key** on your keyboard
2. Type **PowerShell**
3. Click **Windows PowerShell** to open it

You will see a blue window with a blinking cursor. This is where you will type commands.

---

## Step 3 — Create a Folder for SeedVault

Type this command and press Enter:

```powershell
mkdir C:\SeedVault
cd C:\SeedVault
```

---

## Step 4 — Install SeedVault

Copy and paste this entire command into PowerShell and press Enter:

```powershell
curl -fsSL https://raw.githubusercontent.com/Duhato/seedvault/main/app/docker-compose.yml -o docker-compose.yml; docker compose up -d
```

Docker will now download SeedVault. This may take a few minutes depending on your internet speed. You will see text scrolling as it downloads.

When you see something like `Started` or `Running` you are done.

---

## Step 5 — Open SeedVault

1. Open your web browser (Chrome, Edge, Firefox)
2. Go to **https://localhost:8765**
3. You will see a security warning — this is normal because SeedVault uses a self-signed certificate
4. Click **Advanced** and then **Proceed to localhost** (or similar wording)
5. You will see the SeedVault setup screen

---

## Step 6 — First Time Setup

1. Create your admin account with a username and password
2. Enter your zip code for weather features
3. Set your last and first frost dates
4. You are in!

---

## Accessing SeedVault From Other Devices on Your Network

To access SeedVault from your phone or tablet on the same WiFi:

1. Find your computer's IP address — open PowerShell and type `ipconfig`
2. Look for **IPv4 Address** — it will look like `192.168.1.xxx`
3. On your other device go to `https://192.168.1.xxx:8765`
4. Accept the security warning the same way as above

---

## Starting and Stopping SeedVault

SeedVault starts automatically with Docker. If you need to manually control it:

**Stop SeedVault:**
```powershell
cd C:\SeedVault
docker compose down
```

**Start SeedVault:**
```powershell
cd C:\SeedVault
docker compose up -d
```

---

## Updating to a New Version

```powershell
cd C:\SeedVault
docker compose pull
docker compose up -d
```

---

## Keeping Docker Running on Startup

Docker Desktop starts automatically on login by default. If it is not:

1. Open Docker Desktop
2. Go to **Settings → General**
3. Check **Start Docker Desktop when you log in**

---

## Troubleshooting

**Docker says WSL 2 is not installed:**
- Open PowerShell as Administrator and run: `wsl --install`
- Restart your computer and try again

**The page won't load:**
- Make sure Docker Desktop is running (whale icon in system tray)
- Try `docker compose up -d` again from the SeedVault folder

**Forgot your password:**
- Open PowerShell in the SeedVault folder and run:
  `docker exec -it seedvault-app-1 node reset-password.js`

---

## Your Data

All your data is stored in Docker volumes on your computer. It will not be lost when you update SeedVault. To back up your data use the **Export ZIP** option inside SeedVault under Settings → Backup & Restore.
