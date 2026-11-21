/* Garage Bar — interaction layer. Vanilla, dependency-free, progressive:
   every section is fully readable without this file, and every feature below runs in
   isolation so one failure can never leave content hidden. */
(() => {
  'use strict';
  const d = document, root = d.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];

  // Fail-safe: if anything throws, every scroll-reveal element is shown immediately.
  const revealAll = () => { root.classList.add('reveal-all'); $$('[data-reveal]').forEach(e => e.classList.add('is-in')); };
  addEventListener('error', revealAll);
  const safe = (name, fn) => { try { fn(); } catch (err) { console.error(`[garage] ${name} failed`, err); revealAll(); } };

  /* ---------- Reveal on scroll (runs first, so nothing below can block it) ---------- */
  safe('reveal', () => {
    const revs = $$('[data-reveal]');
    if (reduce || !('IntersectionObserver' in window)) { revs.forEach(e => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    revs.forEach(e => io.observe(e));
    // Belt and braces: anything on screen or already scrolled past is shown even if an observer callback is missed.
    let t;
    const sweep = () => revs.forEach(e => { if (!e.classList.contains('is-in') && e.getBoundingClientRect().top < innerHeight) e.classList.add('is-in'); });
    addEventListener('load', () => setTimeout(sweep, 400));
    addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(sweep, 250); }, { passive: true });
  });

  /* ---------- Hours & live open status (America/New_York — Louisville) ---------- */
  // [open, close] in minutes after midnight; close past midnight is > 1440. null = closed.
  const HOURS = { 0: [720, 1560], 1: null, 2: [960, 1560], 3: [960, 1560], 4: [960, 1560], 5: [960, 1560], 6: [720, 1560] };
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fmt = m => { m %= 1440; const h = Math.floor(m / 60), mm = m % 60; if (m === 720) return 'Noon'; const h12 = h % 12 || 12; return h12 + (mm ? ':' + String(mm).padStart(2, '0') : '') + (h < 12 ? ' AM' : ' PM'); };
  function louisvilleNow() {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const g = t => p.find(x => x.type === t).value;
    return { day: DAYS.indexOf(g('weekday')), min: (+g('hour') % 24) * 60 + +g('minute') };
  }
  function status() {
    const { day, min } = louisvilleNow();
    const today = HOURS[day], yday = HOURS[(day + 6) % 7];
    if (yday && min + 1440 < yday[1]) return { open: true, text: `Open now · till ${fmt(yday[1])}`, day: (day + 6) % 7 };
    if (today && min >= today[0] && min < today[1]) return { open: true, text: `Open now · till ${fmt(today[1])}`, day };
    if (today && min < today[0]) return { open: false, text: `Opens today · ${fmt(today[0])}`, day };
    for (let i = 1; i <= 7; i++) { const n = (day + i) % 7; if (HOURS[n]) return { open: false, text: `Closed · opens ${i === 1 ? 'tomorrow' : DAYS[n]} ${fmt(HOURS[n][0])}`, day }; }
  }
  function paintStatus() {
    const s = status();
    $$('[data-status]').forEach(el => { el.classList.toggle('is-open', s.open); const t = $('[data-status-text]', el); if (t) t.textContent = s.text; });
    $$('[data-hours] tr').forEach(tr => tr.classList.toggle('is-today', +tr.dataset.day === s.day));
  }
  safe('status', () => { paintStatus(); setInterval(() => safe('status', paintStatus), 60000); });
  safe('year', () => $$('[data-year]').forEach(e => { e.textContent = new Date().getFullYear(); }));

  /* ---------- Nav: solid on scroll, hide on scroll-down ---------- */
  const nav = $('[data-nav]') || d.createElement('div');
  safe('nav', () => {
    let lastY = scrollY;
    const onNav = () => {
      const y = scrollY;
      nav.classList.toggle('is-solid', y > 40 || !d.body.classList.contains('is-home') || nav.classList.contains('is-menu'));
      const open = nav.classList.contains('is-menu');
      nav.classList.toggle('is-hidden', !open && y > 600 && y > lastY + 4);
      if (y < lastY - 4 || y < 600) nav.classList.remove('is-hidden');
      lastY = y;
    };
    addEventListener('scroll', onNav, { passive: true }); onNav();
  });

  /* ---------- Mobile drawer ---------- */
  safe('drawer', () => {
    const burger = $('[data-burger]'), drawer = $('[data-drawer]');
    if (!burger || !drawer) return;
    const set = open => {
      burger.setAttribute('aria-expanded', open);
      $('.sr-only', burger).textContent = open ? 'Close menu' : 'Open menu';
      nav.classList.toggle('is-menu', open); nav.classList.toggle('is-solid', open || scrollY > 40 || !d.body.classList.contains('is-home'));
      if (open) { drawer.hidden = false; requestAnimationFrame(() => drawer.classList.add('is-open')); d.body.style.overflow = 'hidden'; setTimeout(() => { const a = $('a', drawer); if (a) a.focus(); }, 300); }
      else { drawer.classList.remove('is-open'); d.body.style.overflow = ''; setTimeout(() => { if (!drawer.classList.contains('is-open')) drawer.hidden = true; }, 700); }
    };
    burger.addEventListener('click', () => set(burger.getAttribute('aria-expanded') !== 'true'));
    drawer.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    d.addEventListener('keydown', e => { if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { set(false); burger.focus(); } });
  });

  /* ---------- Hero video ----------
     The same 1280x720 loop on every device. VP9/WebM where supported, H.264/MP4 otherwise;
     if a source fails it falls through to the next. The poster shows until the first frame
     plays, and stays only if no source can play at all. Skipped only on 2G connections. */
  safe('video', () => {
    const vid = $('[data-hero-video]'), toggle = $('[data-video-toggle]');
    if (!vid || !vid.dataset.src) return;
    const conn = navigator.connection || {};
    if (/(^|-)2g$/.test(conn.effectiveType || '')) return;
    const queue = [];
    if (vid.canPlayType('video/webm; codecs="vp9"')) queue.push(vid.dataset.src + '.webm');
    if (vid.canPlayType('video/mp4; codecs="avc1.640028"') || vid.canPlayType('video/mp4')) queue.push(vid.dataset.src + '.mp4');
    if (!queue.length) return;
    let userPaused = false, visible = true;
    const shown = () => { vid.classList.add('is-playing'); if (toggle) toggle.hidden = false; };
    const play = () => {
      if (userPaused || !visible) return;
      const p = vid.play();
      if (p && p.then) p.then(shown).catch(() => {});
    };
    const next = () => { const src = queue.shift(); if (!src) return; vid.src = src; vid.load(); play(); };
    vid.addEventListener('error', next);
    vid.addEventListener('playing', shown);
    vid.addEventListener('canplay', play);
    if (d.readyState === 'complete') setTimeout(next, 100); else addEventListener('load', () => setTimeout(next, 100));
    if (toggle) toggle.addEventListener('click', () => {
      userPaused = toggle.getAttribute('aria-pressed') !== 'true';
      toggle.setAttribute('aria-pressed', String(userPaused));
      $('.sr-only', toggle).textContent = userPaused ? 'Play background video' : 'Pause background video';
      if (userPaused) vid.pause(); else play();
    });
    // pause while scrolled out of view to save battery
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) play(); else vid.pause(); }).observe(vid);
  });

  /* ---------- Scroll-driven scenes (single rAF loop, only while visible) ---------- */
  safe('scenes', () => {
    const scenes = [];
    const vh = () => innerHeight;
    // Parallax
    if (!reduce) $$('[data-parallax]').forEach(el => scenes.push({ run() {
      const r = el.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh() + 100) return;
      const c = (r.top + r.height / 2 - vh() / 2); el.style.translate = `0 ${(c * +el.dataset.parallax).toFixed(1)}px`;
    } }));
    // Collision sculpture: halves close the gap as you scroll through the section
    const crash = $('[data-crash]');
    if (crash && !reduce) scenes.push({ run() {
      const r = crash.getBoundingClientRect(); const total = Math.max(1, r.height - vh());
      if (r.bottom < 0 || r.top > vh()) return;
      const p = Math.min(1, Math.max(0, (vh() * .35 - r.top) / (total + vh() * .35) / .8));
      crash.style.setProperty('--p', (1 - Math.pow(1 - p, 2)).toFixed(4));
    } });
    // The Lot: vertical scroll drives a horizontal film strip on wide, fine-pointer screens
    const lot = $('[data-lot]'), track = $('[data-lot-track]');
    if (lot && track) {
      const wide = matchMedia('(min-width: 1025px) and (pointer: fine)');
      let lotDist = 0;
      const setupLot = () => {
        const on = wide.matches && !reduce;
        lot.classList.toggle('is-pinned', on);
        if (!on) { lot.style.removeProperty('--lot-x'); return; }
        lotDist = Math.max(0, track.scrollWidth - innerWidth + 40);
        lot.style.setProperty('--lot-h', `${vh() + lotDist}px`);
      };
      setupLot(); addEventListener('resize', setupLot); if (wide.addEventListener) wide.addEventListener('change', setupLot);
      addEventListener('load', setupLot);
      scenes.push({ run() {
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
  });

  /* ---------- Reviews ---------- */
  safe('reviews', () => {
    const stack = $('[data-reviews]');
    if (!stack) return;
    const items = $$('.rev', stack), tabs = $$('[data-rev-tab]'); let i = 0;
    const show = n => {
      i = (n + items.length) % items.length;
      items.forEach((el, k) => { el.classList.toggle('is-on', k === i); el.setAttribute('aria-hidden', String(k !== i)); });
      tabs.forEach((t, k) => t.setAttribute('aria-pressed', String(k === i)));
      $('[data-rev-n]').textContent = String(i + 1).padStart(2, '0');
    };
    tabs.forEach(t => t.addEventListener('click', () => show(+t.dataset.revTab)));
    $('[data-rev-prev]').addEventListener('click', () => show(i - 1));
    $('[data-rev-next]').addEventListener('click', () => show(i + 1));
    let x0 = null;
    stack.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    stack.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
  });

  /* ---------- Map facade: load Google Maps only on request (privacy + performance) ---------- */
  safe('map', () => {
    const btn = $('[data-map-load]');
    if (!btn) return;
    btn.addEventListener('click', () => safe('map-load', () => {
      const f = d.createElement('iframe');
      f.src = 'https://maps.google.com/maps?q=Garage%20Bar%2C%20700%20E%20Market%20St%2C%20Louisville%2C%20KY%2040202&z=16&output=embed';
      f.title = 'Map showing Garage Bar at 700 East Market Street, Louisville'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
      const m = $('[data-map]'); m.appendChild(f);
      const facade = $('.map__facade', m); if (facade) facade.hidden = true;
      f.focus();
    }));
  });

  /* ---------- Menu page: active category in sticky sub-nav ---------- */
  safe('menu-nav', () => {
    const links = $$('.mnav a');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.remove('is-active'));
      const a = byId.get(e.target.id); if (!a) return;
      a.classList.add('is-active');
      const ul = a.closest('ul'); ul.scrollTo({ left: a.offsetLeft - ul.clientWidth / 2 + a.clientWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
    }), { rootMargin: '-40% 0px -55% 0px' });
    byId.forEach((_, id) => { const s = d.getElementById(id); if (s) io.observe(s); });
  });
})();
