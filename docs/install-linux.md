# 🐧 SeedVault — Linux Installation Guide

This guide covers installing SeedVault on Ubuntu, Debian, and most other Linux distributions.

---

## What You Need

- A computer or server running Ubuntu 20.04+ or Debian 11+
- Terminal access
- sudo privileges
- An internet connection

---

## Step 1 — Install Docker

Open a terminal and run these commands one at a time:

```bash
# Update package list
sudo apt update

# Install required packages
sudo apt install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**Add yourself to the docker group** so you don't need sudo every time:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

**Verify Docker is working:**

```bash
docker --version
```

You should see something like `Docker version 24.x.x`

---

## Step 2 — Create a Folder for SeedVault

```bash
mkdir ~/seedvault
cd ~/seedvault
```

---

## Step 3 — Install SeedVault

```bash
curl -fsSL https://raw.githubusercontent.com/Duhato/seedvault/main/app/docker-compose.yml -o docker-compose.yml && docker compose up -d
```

Docker will download SeedVault and start it. This takes a few minutes the first time.

---

## Step 4 — Open SeedVault

Open your browser and go to **https://localhost:8765**

You will see a security warning about the certificate — click **Advanced** then **Proceed**. This is normal for a self-signed certificate.

---

## Step 5 — First Time Setup

Create your admin account, enter your zip code, set your frost dates, and you are ready to go.

---

## Make SeedVault Start Automatically on Boot

By default Docker containers restart unless you stop them manually. Verify this is set:

```bash
docker compose ps
```

You should see `unless-stopped` in the restart policy. If SeedVault is not starting on boot:

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

---

## Accessing From Other Devices

Find your IP address:

```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

Then on any device on the same network go to `https://YOUR-IP:8765`

---

## Setting Up a Firewall (Optional but Recommended)

```bash
sudo ufw allow 8765/tcp
sudo ufw enable
```

---

## Updating SeedVault

```bash
cd ~/seedvault
docker compose pull
docker compose up -d
```

---

## Stopping and Starting

```bash
# Stop
docker compose down

# Start
docker compose up -d

# View logs
docker compose logs -f app
```

---

## Troubleshooting

**Permission denied running docker:**
- Run `sudo usermod -aG docker $USER` then log out and back in

**Port 8765 already in use:**
- Edit docker-compose.yml and change `8765:3000` to another port like `8766:3000`

**Container keeps restarting:**
- Check logs: `docker compose logs app`
