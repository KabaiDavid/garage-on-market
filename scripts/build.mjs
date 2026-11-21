// Garage Bar — static site build. Zero dependencies (Node >= 18).
//
//   src/*.html + src/partials/*.html  ->  dist/  (rendered pages)
//   public/**                         ->  dist/  (copied as-is)
//
// Template tags:
//   {{>name}}                             include src/partials/<name>.html
//   {{img:name|alt|sizes|class|eager}}    responsive <picture> (AVIF / WebP / JPEG)
//   {{active:key}}                        aria-current="page" on the current page's nav link

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const PUBLIC = join(ROOT, 'public');
const DIST = join(ROOT, 'dist');
const IMG = join(PUBLIC, 'assets', 'img');
const MANIFEST = JSON.parse(readFileSync(join(IMG, 'manifest.json'), 'utf8'));

const PAGES = [
  ['index.html', 'index.html', 'home'],
  ['menu.html', 'menu/index.html', 'menu'],
  ['events.html', 'events/index.html', 'events'],
  ['404.html', '404.html', '404'],
];

const errors = [];

function picture(arg) {
  const [name, alt = '', sizesIn = '', cls = '', eager = ''] = arg.split('|').map(s => s.trim());
  const m = MANIFEST[name];
  if (!m) { errors.push(`Unknown image "${name}"`); return ''; }
  const widths = [640, 1200, 1920].filter(w => existsSync(join(IMG, `${name}-${w}.webp`)));
  const jpgWidths = widths.filter(w => existsSync(join(IMG, `${name}-${w}.jpg`)));
  for (const w of widths) if (!existsSync(join(IMG, `${name}-${w}.avif`))) errors.push(`Missing ${name}-${w}.avif`);
  const sizes = sizesIn || '100vw';
  const set = (ws, ext) => ws.map(w => `/assets/img/${name}-${w}.${ext} ${w}w`).join(', ');
  const h = Math.round(1200 * m.h / m.w);
  const load = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<picture class="${cls}"><source type="image/avif" srcset="${set(widths, 'avif')}" sizes="${sizes}">` +
    `<source type="image/webp" srcset="${set(widths, 'webp')}" sizes="${sizes}">` +
    `<img src="/assets/img/${name}-${jpgWidths.at(-1)}.jpg" srcset="${set(jpgWidths, 'jpg')}" sizes="${sizes}" width="1200" height="${h}" ` +
    `alt="${alt}" ${load} decoding="async"></picture>`;
}

function render(text, page) {
  return text
    .replace(/\{\{>(\w+)\}\}/g, (_, n) => render(readFileSync(join(SRC, 'partials', `${n}.html`), 'utf8'), page))
    .replace(/\{\{img:([\s\S]*?)\}\}/g, (_, a) => picture(a))
    .replace(/\{\{active:(\w+)\}\}/g, (_, k) => (k === page ? 'aria-current="page"' : ''));
}

// 1. clean + copy static files
rmSync(DIST, { recursive: true, force: true });
cpSync(PUBLIC, DIST, { recursive: true, filter: src => !src.endsWith('manifest.json') || !src.includes(join('assets', 'img')) });

// 2. render pages
for (const [src, dst, key] of PAGES) {
  const html = render(readFileSync(join(SRC, src), 'utf8'), key);
  if (/\{\{/.test(html)) errors.push(`Unrendered template tag left in ${dst}`);
  const out = join(DIST, dst);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log(`  page  ${dst.padEnd(20)} ${(html.length / 1024).toFixed(1)} KB`);
}

// 3. verify every local asset referenced by the pages exists in dist
for (const [, dst] of PAGES) {
  const html = readFileSync(join(DIST, dst), 'utf8');
  const refs = new Set([...html.matchAll(/(?:src|href|srcset)="([^"]+)"/g)]
    .flatMap(m => m[1].split(',').map(s => s.trim().split(' ')[0]))
    .filter(u => u.startsWith('/') && !u.startsWith('//')));
  for (const u of refs) {
    const p = join(DIST, decodeURIComponent(u.split(/[?#]/)[0]));
    const ok = existsSync(p) && (statSync(p).isFile() || existsSync(join(p, 'index.html')));
    if (!ok) errors.push(`${dst}: missing ${u}`);
  }
  // hero video: data-src-* hold a basename; every variant must exist in both codecs
  for (const m of html.matchAll(/data-src-\w+="([^"]+)"/g))
    for (const ext of ['.webm', '.mp4']) if (!existsSync(join(DIST, m[1] + ext))) errors.push(`${dst}: missing ${m[1]}${ext}`);
}

if (errors.length) {
  console.error('\nBuild failed:\n  ' + errors.join('\n  '));
  process.exit(1);
}

const count = d => readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(join(d, e.name)) : 1), 0);
console.log(`\n✓ Built ${PAGES.length} pages, ${count(DIST)} files → ${relative(ROOT, DIST)}/`);
