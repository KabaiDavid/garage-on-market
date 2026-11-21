/* Garage Bar — interaction layer. Vanilla, dependency-free, progressive:
   every section is fully readable without this file. */
(() => {
  'use strict';
  const d = document, root = d.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];

  /* ---------- Hours & live open status (America/New_York — Louisville) ---------- */
  // [open, close] in minutes after midnight; close past midnight is > 1440. null = closed.
  const HOURS = { 0: [720, 1560], 1: null, 2: [960, 1560], 3: [960, 1560], 4: [960, 1560], 5: [960, 1560], 6: [720, 1560] };
  const fmt = m => { m %= 1440; const h = Math.floor(m / 60), mm = m % 60; if (m === 720) return 'Noon'; const h12 = h % 12 || 12; return h12 + (mm ? ':' + String(mm).padStart(2, '0') : '') + (h < 12 ? ' AM' : ' PM'); };
  function louisvilleNow() {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const g = t => p.find(x => x.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'));
    return { day, min: (+g('hour') % 24) * 60 + +g('minute') };
  }
  function status() {
    const { day, min } = louisvilleNow();
    const today = HOURS[day], yday = HOURS[(day + 6) % 7];
    if (yday && min + 1440 < yday[1]) return { open: true, text: `Open now · till ${fmt(yday[1])}`, day: (day + 6) % 7 };
    if (today && min >= today[0] && min < today[1]) return { open: true, text: `Open now · till ${fmt(today[1])}`, day };
    if (today && min < today[0]) return { open: false, text: `Opens today · ${fmt(today[0])}`, day };
    for (let i = 1; i <= 7; i++) { const n = (day + i) % 7; if (HOURS[n]) return { open: false, text: `Closed · opens ${i === 1 ? 'tomorrow' : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][n]} ${fmt(HOURS[n][0])}`, day }; }
  }
  function paintStatus() {
    const s = status();
    $$('[data-status]').forEach(el => { el.classList.toggle('is-open', s.open); const t = $('[data-status-text]', el); if (t) t.textContent = s.text; });
    $$('[data-hours] tr').forEach(tr => tr.classList.toggle('is-today', +tr.dataset.day === s.day));
  }
  paintStatus(); setInterval(paintStatus, 60000);
  $$('[data-year]').forEach(e => e.textContent = new Date().getFullYear());

  /* ---------- Nav: solid on scroll, hide on scroll-down ---------- */
  const nav = $('[data-nav]');
  let lastY = scrollY;
  const onNav = () => {
    const y = scrollY;
    nav.classList.toggle('is-solid', y > 40 || !d.body.classList.contains('is-home'));
    const open = nav.classList.contains('is-menu');
    nav.classList.toggle('is-hidden', !open && y > 600 && y > lastY + 4);
    if (y < lastY - 4 || y < 600) nav.classList.remove('is-hidden');
    lastY = y;
  };
  addEventListener('scroll', onNav, { passive: true }); onNav();

  /* ---------- Mobile drawer ---------- */
  const burger = $('[data-burger]'), drawer = $('[data-drawer]');
  if (burger && drawer) {
    const set = open => {
      burger.setAttribute('aria-expanded', open);
      $('.sr-only', burger).textContent = open ? 'Close menu' : 'Open menu';
      nav.classList.toggle('is-menu', open); nav.classList.toggle('is-solid', open || scrollY > 40);
      if (open) { drawer.hidden = false; requestAnimationFrame(() => drawer.classList.add('is-open')); d.body.style.overflow = 'hidden'; setTimeout(() => $('a', drawer)?.focus(), 300); }
      else { drawer.classList.remove('is-open'); d.body.style.overflow = ''; setTimeout(() => { if (!drawer.classList.contains('is-open')) drawer.hidden = true; }, 700); }
    };
    burger.addEventListener('click', () => set(burger.getAttribute('aria-expanded') !== 'true'));
    drawer.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    d.addEventListener('keydown', e => { if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { set(false); burger.focus(); } });
  }

  /* ---------- Hero video: only on capable connections, never with reduced motion ---------- */
  const vid = $('[data-hero-video]'), toggle = $('[data-video-toggle]');
  const conn = navigator.connection || {};
  if (vid && !reduce && !conn.saveData && !/(^|-)2g/.test(conn.effectiveType || '')) {
    // Portrait screens get a dedicated 720x1280 encode (full source resolution in the visible crop);
    // landscape screens get the native 1280x720. VP9/WebM where supported, H.264/MP4 otherwise (Safari).
    const ext = vid.canPlayType('video/webm; codecs="vp9"') ? '.webm' : '.mp4';
    const portrait = matchMedia('(max-aspect-ratio: 1/1)');
    const pick = () => (portrait.matches ? vid.dataset.srcPort : vid.dataset.srcLand) + ext;
    vid.src = pick();
    portrait.addEventListener?.('change', () => {
      const t = vid.currentTime, playing = !vid.paused;
      vid.src = pick(); vid.currentTime = t; if (playing) vid.play().catch(() => {});
    });
    const start = () => vid.play().then(() => { vid.classList.add('is-playing'); toggle.hidden = false; }).catch(() => {});
    const later = () => setTimeout(() => (window.requestIdleCallback || setTimeout)(start, { timeout: 1500 }), 1200);
    if (d.readyState === 'complete') later(); else addEventListener('load', later);
    toggle.addEventListener('click', () => {
      const paused = toggle.getAttribute('aria-pressed') === 'true';
      if (paused) { vid.play(); toggle.setAttribute('aria-pressed', 'false'); $('.sr-only', toggle).textContent = 'Pause background video'; }
      else { vid.pause(); toggle.setAttribute('aria-pressed', 'true'); $('.sr-only', toggle).textContent = 'Play background video'; }
    });
    // pause offscreen to save battery
    new IntersectionObserver(([e]) => { if (toggle.getAttribute('aria-pressed') === 'true') return; e.isIntersecting ? vid.play().catch(() => {}) : vid.pause(); }).observe(vid);
  }

  /* ---------- Reveal on scroll ---------- */
  const revs = $$('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) revs.forEach(e => e.classList.add('is-in'));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    revs.forEach(e => io.observe(e));
  }

  /* ---------- Scroll-driven scenes (single rAF loop, only while visible) ---------- */
  const scenes = [];
  const vh = () => innerHeight;
  // Parallax
  if (!reduce) $$('[data-parallax]').forEach(el => scenes.push({ el, run() {
    const r = el.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh() + 100) return;
    const c = (r.top + r.height / 2 - vh() / 2); el.style.translate = `0 ${(c * +el.dataset.parallax).toFixed(1)}px`;
  } }));
  // Collision sculpture: halves close the gap as you scroll through the section
  const crash = $('[data-crash]');
  if (crash && !reduce) scenes.push({ el: crash, run() {
    const r = crash.getBoundingClientRect(); const total = r.height - vh();
    if (r.bottom < 0 || r.top > vh()) return;
    const p = Math.min(1, Math.max(0, -r.top / (total * .85)));
    crash.style.setProperty('--p', (1 - Math.pow(1 - p, 2)).toFixed(4));
  } });
  // The Lot: vertical scroll drives a horizontal film strip on wide, fine-pointer screens
  const lot = $('[data-lot]'), track = $('[data-lot-track]');
  const wide = matchMedia('(min-width: 1025px) and (pointer: fine)');
  let lotDist = 0;
  const setupLot = () => {
    if (!lot) return;
    const on = wide.matches && !reduce;
    lot.classList.toggle('is-pinned', on);
    if (!on) { track.style.removeProperty('--lot-x'); return; }
    lotDist = Math.max(0, track.scrollWidth - innerWidth + 40);
    lot.style.setProperty('--lot-h', `${vh() + lotDist}px`);
  };
  if (lot) {
    setupLot(); addEventListener('resize', setupLot); wide.addEventListener?.('change', setupLot);
    addEventListener('load', setupLot);
    scenes.push({ el: lot, run() {
      if (!lot.classList.contains('is-pinned')) return;
      const r = lot.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh()) return;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh())));
      lot.style.setProperty('--lot-x', `${(-p * lotDist).toFixed(1)}px`);
    } });
  }
  if (scenes.length) {
    let ticking = false;
    const loop = () => { scenes.forEach(s => s.run()); ticking = false; };
    const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(loop); } };
    addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); loop();
  }

  /* ---------- Reviews ---------- */
  const stack = $('[data-reviews]');
  if (stack) {
    const items = $$('.rev', stack); let i = 0;
    const show = n => {
      items[i].classList.remove('is-on'); items[i].hidden = true;
      i = (n + items.length) % items.length;
      items[i].hidden = false; void items[i].offsetWidth; items[i].classList.add('is-on');
      $('[data-rev-n]').textContent = String(i + 1).padStart(2, '0');
    };
    $('[data-rev-prev]').addEventListener('click', () => show(i - 1));
    $('[data-rev-next]').addEventListener('click', () => show(i + 1));
    let x0 = null;
    stack.addEventListener('touchstart', e => x0 = e.touches[0].clientX, { passive: true });
    stack.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
  }

  /* ---------- Map facade: load Google Maps only on request (privacy + performance) ---------- */
  const mapBtn = $('[data-map-load]');
  if (mapBtn) mapBtn.addEventListener('click', () => {
    const f = d.createElement('iframe');
    f.src = 'https://maps.google.com/maps?q=Garage%20Bar%2C%20700%20E%20Market%20St%2C%20Louisville%2C%20KY%2040202&z=16&output=embed';
    f.title = 'Map showing Garage Bar at 700 East Market Street, Louisville'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
    const m = $('[data-map]'); m.appendChild(f); $('.map__facade', m).remove(); f.focus();
  });

  /* ---------- Menu page: active category in sticky sub-nav ---------- */
  const mlinks = $$('.mnav a');
  if (mlinks.length && 'IntersectionObserver' in window) {
    const map = new Map(mlinks.map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { mlinks.forEach(a => a.classList.remove('is-active')); const a = map.get(e.target.id); if (a) { a.classList.add('is-active'); const ul = a.closest('ul'); ul.scrollTo({ left: a.offsetLeft - ul.clientWidth / 2 + a.clientWidth / 2, behavior: reduce ? 'auto' : 'smooth' }); } } }), { rootMargin: '-40% 0px -55% 0px' });
    map.forEach((_, id) => { const s = d.getElementById(id); if (s) io.observe(s); });
  }
})();
