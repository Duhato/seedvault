# 🌱 SeedVault

A self-hosted seed saving and plant breeding tracker for home gardeners and seed savers.

## Features

- 🫙 **Seed Lot Tracking** — Track every seed packet and saved seed batch with full growing info, packet photos, QR codes, and Dymo labels
- 🪴 **Plant Records** — Log plants by season, location, and seed save status with multi-photo gallery and growth timeline
- 🌿 **Germination Testing** — Track germination rates from planting through thinning
- 📋 **Harvest Log** — Record fruit measurements, seed counts, and processing method
- 🌸 **Cross Pollination** — Log hand pollination attempts for breeding projects
- 🧬 **Breeding Projects** — Organize breeding goals and track progress
- 🔍 **Fruit Observations** — Mid-season notes on color, texture, flavor, and health
- 🌿 **Amendment Log** — Track fertilizer and soil amendments per plant or location
- 📍 **Garden Locations** — Manage beds, grow bags, and containers
- 🌤️ **Weather History** — Auto-log daily weather via OpenWeatherMap, manual entry, frost event tracking, year comparison
- 🌡️ **Growing Degree Days** — Automatic GDD calculation with crop progress bars from last frost date
- 🌿 **Companion Planting** — Built-in companion data for 13+ crops, add/edit custom data for any crop
- 📊 **Reports** — Seed inventory, variety performance, season-to-season crop comparison
- ⬛ **QR Codes** — Generate and print QR codes for seed packets and plant stakes
- 🏷️ **Dymo Labels** — Print seed labels for multiple Dymo label sizes
- 🖨️ **Season Summary** — Print a full season report
- 🌿 **Lineage Tree** — Visualize parent/child relationships across generations
- 👥 **Multi-user** — Admin and standard user roles
- 🌙 **Dark/Light Mode** — Full theme support
- 💾 **Backup/Restore** — ZIP (full backup with photos), JSON, and CSV export/import — all data including weather and frost events

## Docker Hub

```bash
Available tags: `latest`, `1.2.0`, `1.1.1`, `1.1.0`

Multi-arch: **AMD64** and **ARM64** (Raspberry Pi)

## Quick Start

### Requirements
- Docker and Docker Compose
- 1GB RAM minimum (Raspberry Pi 4 or better)

### Installation

```bash
sudo tee /mnt/ssd-apps/seedvault/app/README.md << 'EOF'
# 🌱 SeedVault

A self-hosted seed saving and plant breeding tracker for home gardeners and seed savers.

## Features

- 🫙 **Seed Lot Tracking** — Track every seed packet and saved seed batch with full growing info, packet photos, QR codes, and Dymo labels
- 🪴 **Plant Records** — Log plants by season, location, and seed save status with multi-photo gallery and growth timeline
- 🌿 **Germination Testing** — Track germination rates from planting through thinning
- 📋 **Harvest Log** — Record fruit measurements, seed counts, and processing method
- 🌸 **Cross Pollination** — Log hand pollination attempts for breeding projects
- 🧬 **Breeding Projects** — Organize breeding goals and track progress
- 🔍 **Fruit Observations** — Mid-season notes on color, texture, flavor, and health
- 🌿 **Amendment Log** — Track fertilizer and soil amendments per plant or location
- 📍 **Garden Locations** — Manage beds, grow bags, and containers
- 🌤️ **Weather History** — Auto-log daily weather via OpenWeatherMap, manual entry, frost event tracking, year comparison
- 🌡️ **Growing Degree Days** — Automatic GDD calculation with crop progress bars from last frost date
- 🌿 **Companion Planting** — Built-in companion data for 13+ crops, add/edit custom data for any crop
- 📊 **Reports** — Seed inventory, variety performance, season-to-season crop comparison
- ⬛ **QR Codes** — Generate and print QR codes for seed packets and plant stakes
- 🏷️ **Dymo Labels** — Print seed labels for multiple Dymo label sizes
- 🖨️ **Season Summary** — Print a full season report
- 🌿 **Lineage Tree** — Visualize parent/child relationships across generations
- 👥 **Multi-user** — Admin and standard user roles
- 🌙 **Dark/Light Mode** — Full theme support
- 💾 **Backup/Restore** — ZIP (full backup with photos), JSON, and CSV export/import — all data including weather and frost events

## Docker Hub

```bash
docker pull duhato/seedvault:latest
```

Available tags: `latest`, `1.2.0`, `1.1.1`, `1.1.0`

Multi-arch: **AMD64** and **ARM64** (Raspberry Pi)

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

## Weather & GDD

Set your zip code and optionally an OpenWeatherMap API key in Settings. Weather logs automatically each day. Growing Degree Days are calculated from your last frost date using your logged high/low temps — crop progress bars show how far through the season each crop type is.

## Companion Planting

Click 🌿 Companions on any seed lot to see good neighbors and plants to avoid. Built-in data covers:

- **Vegetables** — cucumbers, tomatoes, peppers, carrots, beans, lettuce, squash, corn, spinach, melons, onions, peas
- **Flowers** — marigolds, nasturtiums, borage, sunflowers, chamomile, zinnias, calendula
- **Herbs** — basil, dill, cilantro, parsley, chives, rosemary, sage, thyme, mint

Click any companion card to expand it and see how to plant the pairing, recommended spacing, and timing. For any crop not in the built-in list click **+ Add Companion Data** to add your own — stored in your database, included in backups, and editable any time.

## Backup & Restore

Go to Settings → Backup & Restore. The **Export ZIP** option includes everything:
- All varieties, seed lots, plants, and records
- Weather logs and frost events
- Companion planting data
- All uploaded photos

Import the ZIP on a fresh install to restore completely.

SeedVault reminds you to back up via a dashboard banner — yellow after 7 days, red after 14 days. Click it to go straight to the backup page. Save your ZIP to a flash drive, your PC, or anywhere you keep important files.

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
