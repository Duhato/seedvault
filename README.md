# 🌱 SeedVault

A self-hosted seed saving and plant breeding tracker for home gardeners and seed savers.

## Features

- 🫙 **Seed Lot Tracking** — Track every seed packet and saved seed batch with full growing info
- 🪴 **Plant Records** — Log plants by season, location, and seed save status
- 🌿 **Germination Testing** — Track germination rates from planting through thinning
- 📋 **Harvest Log** — Record fruit measurements, seed counts, and processing method
- 🌸 **Cross Pollination** — Log hand pollination attempts for breeding projects
- 🧬 **Breeding Projects** — Organize breeding goals and track progress
- 🔍 **Fruit Observations** — Mid-season notes on color, texture, flavor, and health
- 🌿 **Amendment Log** — Track fertilizer and soil amendments per plant or location
- 📍 **Garden Locations** — Manage beds, grow bags, and containers
- ⬛ **QR Codes** — Generate and print QR codes for seed packets and plant stakes
- 🏷️ **Dymo Labels** — Print seed labels for multiple Dymo label sizes
- 🖨️ **Season Summary** — Print a full season report
- 🌿 **Lineage Tree** — Visualize parent/child relationships across generations
- 👥 **Multi-user** — Admin and standard user roles
- 🌙 **Dark Mode** — Full dark theme support
- 💾 **Backup/Restore** — JSON and CSV export/import

## Quick Start

### Requirements
- Docker and Docker Compose
- 1GB RAM minimum (Raspberry Pi 4 or better)

### Installation

```bash
git clone https://github.com/Duhato/seedvault.git
cd seedvault/app
cp .env.example .env
# Edit .env and set a strong JWT_SECRET
docker compose up -d
```

Then open `https://localhost:8765` in your browser.

On first launch you will be prompted to create an admin account.

> **Note:** SeedVault uses a self-signed SSL certificate by default. Your browser will show a security warning — click Advanced and proceed to continue.

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DB_HOST` | PostgreSQL host | `db` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `seedvault` |
| `DB_USER` | Database user | `seedvault` |
| `DB_PASSWORD` | Database password | `seedvault2024` |
| `PORT` | App port | `3000` |
| `JWT_SECRET` | Secret key for auth tokens | **Change this!** |

### Persistent Storage

Photos and database are stored in mounted volumes:
- Database: `./postgres/`
- Uploads: `./uploads/`

These directories are created automatically on first run.

## Running on TrueNAS SCALE

SeedVault runs as a custom app on TrueNAS SCALE. Use the docker-compose.yml as your custom app YAML and ensure the uploads volume is mounted:

```yaml
volumes:
  - /mnt/your-pool/seedvault/uploads:/app/uploads
```

## Running on Raspberry Pi

SeedVault runs on Raspberry Pi 4 (4GB recommended) with 64-bit Raspberry Pi OS.

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone and run
git clone https://github.com/Duhato/seedvault.git
cd seedvault/app
docker compose up -d
```

Access at `http://raspberry-pi-ip:8765`

## Designation System

SeedVault uses a structured designation code for every seed lot and plant:

| Type | Format | Example |
|---|---|---|
| Seed Lot | `SPECIES-VARIETY-G{gen}-{year}` | `CUC-S8-G2-2025` |
| Plant | `{seed-lot}-P{number}` | `CUC-S8-G2-2025-P01` |

- **G0** = Commercial/purchased seeds
- **G1** = First generation saved seeds
- **G2+** = Subsequent generations

## QR Code Workflow

1. Add a seed lot to SeedVault
2. Click ⬛ QR to generate a QR code
3. Print and stick on your seed envelope or packet
4. Scan next season to instantly pull up that seed lot

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Frontend:** Vanilla JavaScript PWA
- **Container:** Docker + Docker Compose
- **Auth:** JWT with bcrypt

## License

AGPL-3.0 — see [LICENSE](LICENSE)

## Author

Jason (Duhato) — Clarksburg, WV
