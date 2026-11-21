"""Tiny static page builder. No runtime dependencies.

src/*.html  ->  site root (index.html, menu/index.html, events/index.html, 404.html)

Template tags:
  {{>header}} {{>footer}}                         include src/partials/<name>.html
  {{img:name|alt|sizes|class|eager}}             responsive <picture> (AVIF/WebP/JPEG)
  {{active:key}}                                 aria-current on nav links for the current page
"""
import json, os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'src')
IMG = os.path.join(ROOT, 'assets', 'img')
MANIFEST = json.load(open(os.path.join(IMG, 'manifest.json')))

PAGES = {
    'index.html': ('index.html', 'home'),
    'menu.html': ('menu/index.html', 'menu'),
    'events.html': ('events/index.html', 'events'),
    '404.html': ('404.html', '404'),
}


def widths(name):
    return [w for w in (640, 1200, 1920) if os.path.exists(os.path.join(IMG, f'{name}-{w}.webp'))]


def picture(arg):
    parts = (arg.split('|') + [''] * 5)[:5]
    name, alt, sizes, cls, eager = [p.strip() for p in parts]
    if name not in MANIFEST:
        raise SystemExit(f'unknown image {name}')
    m = MANIFEST[name]
    ws = widths(name)
    sizes = sizes or '100vw'
    srcset = lambda ext, ws=ws: ', '.join(f'/assets/img/{name}-{w}.{ext} {w}w' for w in ws)
    jws = [w for w in ws if w < 1920]
    jpg = ', '.join(f'/assets/img/{name}-{w}.jpg {w}w' for w in jws)
    h = round(1200 * m['h'] / m['w'])
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    return (f'<picture class="{cls}"><source type="image/avif" srcset="{srcset("avif")}" sizes="{sizes}">'
            f'<source type="image/webp" srcset="{srcset("webp")}" sizes="{sizes}">'
            f'<img src="/assets/img/{name}-{jws[-1]}.jpg" srcset="{jpg}" sizes="{sizes}" width="1200" height="{h}" '
            f'alt="{alt}" {load} decoding="async"></picture>')


def render(text, page):
    text = re.sub(r'\{\{>(\w+)\}\}', lambda m: render(open(os.path.join(SRC, 'partials', m.group(1) + '.html')).read(), page), text)
    text = re.sub(r'\{\{img:(.*?)\}\}', lambda m: picture(m.group(1)), text, flags=re.S)
    text = re.sub(r'\{\{active:(\w+)\}\}', lambda m: 'aria-current="page"' if m.group(1) == page else '', text)
    return text


for src, (dst, key) in PAGES.items():
    out = os.path.join(ROOT, dst)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    html = render(open(os.path.join(SRC, src)).read(), key)
    open(out, 'w').write(html)
    print('built', dst, len(html))
