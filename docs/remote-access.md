# 🌐 Remote Access Guide

By default SeedVault is only accessible on your home network. This guide covers several ways to access it from anywhere — pick the one that works best for you.

---

## Option 1 — Tailscale (Easiest, Recommended)

Tailscale creates a private VPN between your devices. No port forwarding, no domain needed, works everywhere.

**Cost:** Free for personal use (up to 3 users, 100 devices)

### Setup

**On your SeedVault server:**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Follow the link it gives you to authenticate with your Tailscale account.

**On each device you want to access SeedVault from:**
- Install the Tailscale app (iOS, Android, Windows, Mac, Linux)
- Sign in with the same account

**Access SeedVault:**
- Find your server's Tailscale IP in the Tailscale admin panel (looks like `100.x.x.x`)
- Go to `https://100.x.x.x:8765` from any device on your Tailscale network

That's it. Works from anywhere in the world as long as both devices have Tailscale running.

---

## Option 2 — Cloudflare Tunnel (Free, No Port Forwarding)

Cloudflare Tunnel gives SeedVault a real public URL with proper SSL. Requires a free Cloudflare account and a domain name.

**Cost:** Free (you need a domain — cheapest are ~$8-12/year)

### Setup

1. Sign up at **cloudflare.com** and add your domain
2. Install cloudflared on your server:
```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

3. Log in:
```bash
cloudflared tunnel login
```

4. Create a tunnel:
```bash
cloudflared tunnel create seedvault
```

5. Create config file at `~/.cloudflared/config.yml`:
```yaml
tunnel: YOUR-TUNNEL-ID
credentials-file: /home/USER/.cloudflared/YOUR-TUNNEL-ID.json

ingress:
  - hostname: seedvault.yourdomain.com
    service: https://localhost:8765
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

6. Route DNS:
```bash
cloudflared tunnel route dns seedvault seedvault.yourdomain.com
```

7. Run the tunnel:
```bash
cloudflared tunnel run seedvault
```

8. Make it start on boot:
```bash
sudo cloudflared service install
sudo systemctl start cloudflared
```

Access SeedVault at `https://seedvault.yourdomain.com` from anywhere.

---

## Option 3 — Port Forwarding + DuckDNS (Free, No Extra Software)

Forward port 8765 on your router to your SeedVault server, and use DuckDNS for a free dynamic domain name.

**Cost:** Free

### Step 1 — Get a Free Domain with DuckDNS

1. Go to **duckdns.org** and sign in with Google
2. Create a subdomain like `mygarden.duckdns.org`
3. Copy your token from the DuckDNS page

### Step 2 — Auto-update DuckDNS with your IP

```bash
mkdir ~/duckdns
nano ~/duckdns/duck.sh
```

Paste this (replace YOUR-TOKEN and YOUR-SUBDOMAIN):
```bash
echo url="https://www.duckdns.org/update?domains=YOUR-SUBDOMAIN&token=YOUR-TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
```

Make it executable and run it every 5 minutes:
```bash
chmod +x ~/duckdns/duck.sh
crontab -e
```

Add this line:
*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
### Step 3 — Forward Port on Your Router

1. Log into your router (usually `192.168.1.1` or `192.168.0.1`)
2. Find **Port Forwarding** or **NAT** settings
3. Add a rule:
   - External port: `8765`
   - Internal IP: your SeedVault server's local IP
   - Internal port: `8765`
   - Protocol: TCP
4. Save and restart router

### Step 4 — Access SeedVault

Go to `https://mygarden.duckdns.org:8765` from anywhere.

> **Note:** You will see a certificate warning since SeedVault uses a self-signed cert. Click Advanced and proceed — your data is still encrypted.

---

## Option 4 — ZeroTier (Free, Similar to Tailscale)

ZeroTier is another VPN option similar to Tailscale.

**Cost:** Free for up to 25 devices

1. Sign up at **zerotier.com** and create a network
2. Install on your server:
```bash
curl -s https://install.zerotier.com | sudo bash
sudo zerotier-cli join YOUR-NETWORK-ID
```
3. Approve the device in the ZeroTier admin panel
4. Install ZeroTier on your other devices and join the same network
5. Access SeedVault using the ZeroTier IP shown in your admin panel

---

## Which Option Should I Choose?

| Option | Difficulty | Cost | Domain needed | Port forwarding |
|--------|-----------|------|---------------|-----------------|
| Tailscale | Very easy | Free | No | No |
| Cloudflare Tunnel | Medium | Free + domain | Yes | No |
| Port Forward + DuckDNS | Medium | Free | No (duckdns.org subdomain) | Yes |
| ZeroTier | Easy | Free | No | No |

**For most people: Tailscale** — install it in 5 minutes, works everywhere, completely free for personal use.

**If you want a real URL:** Cloudflare Tunnel — but you need a domain name.

**If you don't want any extra accounts:** Port forwarding + DuckDNS.
