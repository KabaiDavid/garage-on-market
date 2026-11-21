# Garage Bar — garageonmarket.com redesign

A static, dependency-free website for Garage Bar (700 E. Market St., NuLu, Louisville).
Concept: **"Service Bay"** — the building's auto-garage past, presented as numbered bays
(The Building, The Oven, The Bar, Art at Garage, The Lot, Book the Garage, Find the Garage).

## Structure
- `src/*.html`, `src/partials/` — page sources (edit these)
- `index.html`, `menu/`, `events/`, `404.html` — built output (deploy the repo root)
- `assets/css/site.css`, `assets/js/site.js` — the design system and interactions (vanilla JS)
- `assets/img/` — responsive AVIF/WebP/JPEG photography (the restaurant's own photos)
- `assets/video/` — hero loop cut from the restaurant's own brand video (WebM VP9 + MP4 H.264)

## Build
```bash
python3 tools/build_pages.py          # render src/ → site root
python3 tools/build_images.py <cache> # re-fetch and re-encode photography (needs Pillow with AVIF)
```

## Content sources
Everything comes from the restaurant's public website and its SpotHopper data feed: copy, hours,
contact, cocktail list and prices, Google reviews shown on the current site, photos and video.
The food menu is not itemized here. The current menu lives on the Toast ordering page,
which is linked throughout.

## Deploy
Any static host. `netlify.toml` sets the cache headers.
