# Changelog
All notable changes to SeedVault will be documented here.

## [1.2.1] - 2026-05-10
### Added
- Backup reminder banner on dashboard — orange if never backed up, yellow after 7 days, red after 14 days, click to go straight to backup
- Last backup date tracked automatically whenever ZIP or JSON export is downloaded

## [1.2.0] - 2026-05-10
### Added
- Weather log rows clickable — full detail modal showing all logged fields with Edit button
- Growing Degree Days (GDD) — automatic calculation from last frost date with crop progress bars for cucumbers, tomatoes, peppers, beans, corn, and squash
- Companion planting — built-in data for 13 crop types, DB storage for custom entries, Add/Edit UI, falls back to built-in data automatically
- Season Comparison Report — compare variety performance across multiple seasons side by side
- Weather "View All" toggle — show all logged entries, not just the last 10
- Docker Hub auto-tags version from package.json on every push via GitHub Actions
### Fixed
- Backup now includes weather_logs and frost_events in all export formats (ZIP, JSON, import)
- Duplicate GitHub Actions workflow file removed
- Version display updated to v1.2.0 in nav bar and settings

## [1.1.1] - 2026-05-10
### Added
- Transplant tracking — start method, indoor start date, transplant date and location
- Growth timeline in plant detail view
- ZIP backup with photos — full backup including all uploaded images
- GitHub Actions — auto build and push to Docker Hub on every commit
- Multi-arch Docker images — AMD64 and ARM64 (Raspberry Pi) support
### Fixed
- Nav bar overflow on smaller screens
- Beans species code corrected to BEAN
- Quantity display — 700.00 mg now shows as 700 mg

## [1.1.0] - 2026-05-09
### Added
- Seed lot detail view — click any row to see all info and photos
- Plant detail view — click any row to see harvest, observations, amendments, crosses
- Variety detail view — click any row to see linked seed lots
- Project detail view — click any card to see crosses and stats
- Location detail view — click any card to see plants and amendment history
- Lineage tree visualization — parent/child relationships across generations
- Season summary print report
- Dymo label printing — multiple label sizes with QR code
- QR codes for seed lots and plant stakes
- Weather widget — live weather from OpenWeatherMap
- Frost date settings and warnings
- Planting window calculator based on frost dates
- Search and filter on every page
- Quick action buttons on dashboard
- Dashboard charts — seed lots by species, plants by variety
- Amendment and fertilizer log per plant and location
- Growing info fields — days to germinate/harvest, depth, spacing, sun, watering
- Seed quantity — count or weight with units (seeds, mg, g, oz)
- Origin, container size, sell by date, lot number, UPC fields
- Editable generation on existing seed lots
- G0 generation support for commercial seeds
- Keyboard shortcuts — number keys for nav, N for new, S for search, Escape for modal
- Full backup/restore — all tables including amendments, crosses, observations
- ZIP export/import with photos
- Plant photo uploads persistent across container restarts
- Tooltips on action buttons
- PWA install prompt
- Docker Hub publish — duhato/seedvault
### Fixed
- iPad login — no more cache clearing needed
- Photo uploads persistent across restarts
- Days to germinate/harvest accept ranges like 7-14
- Depth and spacing fields accept text like 1/4 - 1/2 in

## [1.0.0] - 2026-05-08
### Added
- Initial release
- JWT authentication with 30-day sessions
- Multi-user support with admin and standard roles
- Seed lot tracking with designation system
- Plant records by season and location
- Germination testing from planting through thinning
- Harvest log with fruit measurements
- Cross pollination tracker
- Breeding projects
- Fruit observations
- Garden locations
- Seed sources directory
- Dark mode
- HTTPS with self-signed certificate
- JSON and CSV backup/restore
- Docker deployment
