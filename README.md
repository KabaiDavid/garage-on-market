# Garage Bar — garageonmarket.com

Website for Garage Bar, 700 E. Market St., NuLu, Louisville.
The concept is **"Service Bay"**: the building's past as an auto garage, shown as numbered bays
(The Building, The Oven, The Bar, Art at Garage, The Lot, Book the Garage, Find the Garage).

It's a static site with **no framework and no runtime dependencies**: plain HTML, CSS and JavaScript,
put together by a small Node build script.

## Deploy — Cloudflare Pages

| Setting                | Value           |
|------------------------|-----------------|
| Framework preset       | **None**        |
| Build command          | `npm run build` |
| Build output directory | `dist`          |
| Root directory         | *(leave empty — repository root)* |
| Production branch      | `main`          |
| Node version           | 18 or newer (`.nvmrc` pins 20) |

`public/_headers` sets the caching and security headers. The build stamps `site.css` and `site.js` with a
content hash (`?v=…`), so a deploy can never mix new HTML with an old cached script or stylesheet. Cloudflare Pages serves `dist/404.html`
automatically for unknown URLs.

## Local development

```bash
npm run build     # src/ + public/ → dist/  (also checks that every referenced asset exists)
npm run preview   # serves dist/ at http://localhost:4173
npm run dev       # build, then preview
```

## Structure

```
src/                 page sources: index.html, menu.html, events.html, 404.html
src/partials/        header + footer, shared by all pages
public/              copied to dist/ unchanged
  assets/css/        site.css: the design system
  assets/js/         site.js: interactions (vanilla, progressive enhancement)
  assets/img/        restaurant photography in AVIF / WebP / JPEG at 640, 1200 and 1920px
  assets/video/      the original hero loop, 1280x720 for every device, WebM VP9 + MP4 H.264
                     (rebuild from the brand video: scripts/build_hero_video.sh <original.mp4>)
  assets/fonts/      self-hosted WOFF2 fonts
  _headers           Cloudflare Pages headers
  robots.txt, sitemap.xml, site.webmanifest, favicons
scripts/build.mjs    the build (zero dependencies)
scripts/preview.mjs  local static server
scripts/build_images.py  optional: re-fetch and re-encode photography (Python + Pillow with AVIF)
```

### Template tags (in `src/`)
- `{{>header}}`: include `src/partials/header.html`
- `{{img:name|alt text|sizes|class|eager}}`: responsive `<picture>` for `public/assets/img/name-*.{avif,webp,jpg}`
- `{{active:menu}}`: marks the nav link for the current page with `aria-current="page"`

## Content sources
All content comes from the restaurant's public website and its SpotHopper data feed: copy, hours,
contact details, the cocktail list and prices, the Google reviews shown on the current site, photos
and video. The food menu is not itemized here. The current menu lives on the Toast ordering page,
which is linked throughout. Add the itemized food menu to `src/menu.html` once the restaurant
supplies it.
