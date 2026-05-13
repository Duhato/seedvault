# Changelog
All notable changes to SeedVault will be documented here.

## [1.3.0] - 2026-05-12
### Added
- AI Assistant integration — connect Google Gemini, OpenAI ChatGPT, Anthropic Claude, or Ollama (local/free)
- Growing info lookup on seed lots — AI fills in empty planting depth, spacing, days to germinate/harvest, sun, water, frost tolerance
- Companion planting AI fallback — unknown crops automatically looked up via AI if no builtin data
- Pest & Disease Helper on plants — describe symptoms or upload a photo, AI identifies problem and suggests organic and chemical treatments
- Photo upload support in pest helper — Gemini, OpenAI, and Claude can analyze plant photos
- AI disclaimers on all AI features — reminders to verify AI suggestions
- Season Planner — AI generates 8-week planting plan based on your frost dates, location, and seed vault
- Harvest Analysis — AI reviews harvest log and recommends best plants for seed saving
- Reports page — dedicated nav page for all print reports and AI features
- Seed Resources page — 12 seed exchanges and references with clickable cards
- Detailed install guides for Windows, Linux, and Raspberry Pi in /docs folder
- Remote access guide — Tailscale, Cloudflare Tunnel, port forwarding + DuckDNS, ZeroTier
- GitHub Issues templates — bug report, feature request, question
- Contributing guide (CONTRIBUTING.md)
- Companion planting expanded to flowers and herbs — marigolds, nasturtiums, borage, sunflowers, chamomile, zinnias, calendula, basil, dill, cilantro, parsley, chives, rosemary, sage, thyme, mint
- Companion card expand on click — how to plant, distance, timing details
- GDD per-crop base temps — carrots, lettuce, spinach, peas, onions now use 40°F base
- Backup reminder banner — orange if never backed up, yellow at 7 days, red at 14 days
- One-line Docker install — single curl command
### Fixed
- Backup export missing weather_logs and frost_events
- Backup reminder not clearing after export
- Nav wraps to second row instead of scrollbar

## [1.2.3] - 2026-05-10
### Fixed
- ZIP and JSON export failing due to wrong table name (weather_logs vs weather_log)
- Backup reminder banner not clearing after export — settings API was using POST instead of PUT
- Duplicate companion_plants key in export data object

## [1.2.2] - 2026-05-10
### Added
- Companion cards expand on click showing how to plant, distance, and timing details
- Extended companion data for all vegetables, flowers, and herbs — marigolds, nasturtiums, borage, sunflowers, chamomile, zinnias, calendula, basil, dill, cilantro, parsley, chives, rosemary, sage, thyme, mint
- Backup reminder banner on dashboard — orange if never backed up, yellow after 7 days, red after 14 days
- Last backup date tracked automatically on every ZIP or JSON export
- Portable one-line Docker install — single curl command pulls and starts everything
- Fixed docker-compose.yml to use named volumes and Docker Hub image

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
