// Motion, galleries, lightbox and contact for Nguyễn Khánh Chi's site, ported from the
// approved hi-fi (hifi.html). Progressive enhancement only: without it every section reads.
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The build's own script adds is-loaded to <html>, which lifts the loader.

  // Every image opens larger on click or Enter. A slide deck opens at its top slide and
  // pages with the Previous and Next buttons or the arrow keys. The lightbox is only built
  // on the first click, so nothing on the page sits hidden behind one.
  let lb = null, lbImg = null, lbCount = null;
  let list = [], at = 0;
  // the largest file in the image's srcset (the build copies every variant listed there)
  const bigger = (img) => {
    const set = (img.getAttribute('srcset') || '').split(',').map((s) => s.trim().split(/\s+/)[0]).filter(Boolean);
    return [...set.reverse(), img.getAttribute('src')];
  };
  const show = () => {
    const img = list[at], tries = bigger(img);
    let k = 0;
    lbImg.onerror = () => { if (++k < tries.length) lbImg.src = tries[k]; };
    lbImg.src = tries[0]; lbImg.alt = img.alt;
    lbCount.textContent = (at + 1) + ' / ' + list.length;
  };
  const step = (d) => { at = (at + d + list.length) % list.length; show(); };
  const build = () => {
    lb = document.createElement('dialog');
    lb.className = 'lightbox'; lb.setAttribute('aria-label', 'Enlarged image');
    lb.innerHTML = '<img alt=""><div class="lb-bar"><button type="button" data-prev data-deck-nav>Previous slide</button><span class="lb-count" data-deck-nav aria-live="polite"></span><button type="button" data-next data-deck-nav>Next slide</button><button type="button" data-close>Close</button></div>';
    document.body.append(lb);
    lbImg = lb.querySelector('img'); lbCount = lb.querySelector('.lb-count');
    lb.addEventListener('click', (e) => {
      const t = e.target;
      if (t.matches('[data-prev]')) step(-1);
      else if (t.matches('[data-next]')) step(1);
      else if (t === lb || t === lbImg || t.matches('[data-close]')) lb.close();
    });
    lb.addEventListener('keydown', (e) => {
      if (list.length < 2) return;
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });
  };
  const open = (imgs, k) => { if (!lb) build(); list = imgs; at = k; lb.classList.toggle('is-deck', imgs.length > 1); show(); if (!lbOpen()) lb.showModal(); };
  const lbOpen = () => Boolean(lb && lb.open);
  document.querySelectorAll('main img').forEach((img) => {
    if (img.closest('[data-deck]')) return;
    img.dataset.zoom = ''; img.tabIndex = 0; img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => open([img], 0));
    img.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open([img], 0); } });
  });
  // Contact: "Copy address" puts the email on the clipboard.
  document.querySelectorAll('[data-copy]').forEach((btn) => btn.addEventListener('click', async () => {
    const was = btn.textContent;
    try { await navigator.clipboard.writeText(btn.dataset.copy); btn.textContent = 'Copied'; } catch { btn.textContent = btn.dataset.copy; }
    setTimeout(() => { btn.textContent = was; }, 1600);
  }));
  // A deck is a pile: the top slide with the next two peeking out behind it.
  const decks = [...document.querySelectorAll('[data-deck]')].map((d) => {
    const imgs = [...d.querySelectorAll('img')];
    let top = 0;
    const place = () => imgs.forEach((im, k) => { const p = (k - top + imgs.length) % imgs.length; if (p < 3) im.dataset.pos = p; else delete im.dataset.pos; });
    const next = () => {
      const was = imgs[top]; top = (top + 1) % imgs.length; place();
      was.dataset.pos = 'out'; setTimeout(() => { if (was.dataset.pos === 'out') delete was.dataset.pos; }, 600);
    };
    place();
    d.dataset.zoom = '';
    d.addEventListener('click', () => open(imgs, top));
    d.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(imgs, top); } });
    return { d, next };
  });

  // Galleries. Every frame keeps its image's ratio. For each gallery the script tries every
  // order of its items and picks the rows that fill the card at an even height close to
  // --row-h: landscape images stay under --cap-h, videos under --video-cap-h and a slide deck
  // under --deck-cap-h. A row that cannot fill under its cap stays short, at the height of
  // the full rows beside it.
  const ratio = (f) => { const m = f.querySelector('img, video'); const w = +m.getAttribute('width'), h = +m.getAttribute('height'); return w && h ? w / h : 16 / 9; };
  const kindOf = (f) => (f.classList.contains('vid') ? 'vid' : f.hasAttribute('data-deck') ? 'deck' : 'img');
  const perms = (n) => {
    const out = [], a = [...Array(n).keys()];
    const go = (k) => { if (k === n) { out.push([...a]); return; } for (let q = k; q < n; q++) { [a[k], a[q]] = [a[q], a[k]]; go(k + 1); [a[k], a[q]] = [a[q], a[k]]; } };
    go(0); return out;
  };
  const justify = (g) => {
    if (!g.hasAttribute('data-laid')) { [...g.children].forEach((f, q) => { f.dataset.i = q; }); g.setAttribute('data-laid', ''); }
    const items = [...g.children].sort((a, b) => a.dataset.i - b.dataset.i);
    const n = items.length; if (!n) return;
    const cs = getComputedStyle(g), px = (v, d) => parseFloat(cs.getPropertyValue(v)) || d;
    const gap = parseFloat(cs.columnGap) || 0, T = px('--row-h', 300), O = px('--deck-off', 0);
    const caps = { img: px('--cap-h', Infinity), deck: px('--deck-cap-h', Infinity), vid: px('--video-cap-h', Infinity) };
    const plain = items.find((f) => kindOf(f) !== 'deck');
    const bw = plain ? 2 * (parseFloat(getComputedStyle(plain).borderLeftWidth) || 0) : 4;
    const W = g.clientWidth - 1;
    const ar = items.map(ratio), kind = items.map(kindOf);
    // a deck is wider than its top slide by the two peeking slides
    const extra = kind.map((k, q) => (k === 'deck' ? bw + 2 * O * (1 - ar[q]) : bw));
    const cap = kind.map((k, q) => (k === 'img' ? (ar[q] >= 1 ? caps.img : Infinity) : caps[k]));
    const row = (ids) => {
      const sum = ids.reduce((s, q) => s + ar[q], 0), ex = ids.reduce((s, q) => s + extra[q], 0);
      const fill = (W - gap * (ids.length - 1) - ex) / sum;
      // next to a video or a deck, photos grow with it; a row of two or more may fill up to
      // 1.35 times the cap, a lone image up to 1.06 times (never one photo blown up)
      const lead = ids.filter((q) => kind[q] !== 'img');
      const rowCap = Math.min(...(lead.length ? lead : ids).map((q) => cap[q]));
      const h = fill <= rowCap * (ids.length > 1 ? 1.35 : 1.06) ? fill : rowCap;
      const used = (h * sum + gap * (ids.length - 1) + ex) / W;
      let c = ((h - T) / T) ** 2 + 16 * (1 - used) ** 2;
      for (const q of ids) {
        const [mw, mh] = ar[q] < 1 ? [160, 220] : [250, 165];
        const s = Math.max(0, 1 - (h * ar[q]) / Math.min(mw, W), 1 - h / Math.min(mh, W / ar[q]));
        c += 20 * s * s;
      }
      return { ids, h, fill, c };
    };
    const layout = (o) => {
      const cost = [0], cut = [0], pick = [null];
      for (let j = 1; j <= n; j++) {
        cost[j] = Infinity;
        for (let i = j - 1; i >= 0; i--) {
          const r = row(o.slice(i, j));
          if (j - i > 1 && r.fill < 120) break;
          if (cost[i] + r.c < cost[j]) { cost[j] = cost[i] + r.c; cut[j] = i; pick[j] = r; }
        }
      }
      const rows = [];
      for (let j = n; j > 0; j = cut[j]) rows.unshift(pick[j]);
      return { rows, cost: cost[n] };
    };
    let best = null;
    for (const o of n <= 7 ? perms(n) : [items.map((_, q) => q)]) {
      const L = layout(o), hs = L.rows.map((r) => r.h), mean = hs.reduce((a, b) => a + b, 0) / hs.length;
      const spread = hs.reduce((s, h) => s + ((h - mean) / T) ** 2, 0);
      const moved = o.reduce((s, q, k) => s + Math.abs(q - k), 0) / n;
      const cost = L.cost + 0.5 * spread + 0.05 * moved;
      if (!best || cost < best.cost) best = { ...L, cost };
    }
    const plainRow = (r) => r.ids.every((q) => kind[q] === 'img');
    const full = best.rows.filter((r) => r.h >= r.fill - 1 && plainRow(r)).map((r) => r.h);
    best.rows.forEach((r) => { r.short = r.h < r.fill - 1; if (r.short && plainRow(r) && full.length) r.h = Math.min(r.h, Math.max(...full)); });
    for (const r of best.rows) for (const q of r.ids) {
      const f = items[q];
      g.append(f);
      f.style.flex = 'none';
      f.toggleAttribute('data-short', r.short);
      if (kind[q] === 'deck') {
        f.style.boxSizing = 'border-box'; f.style.aspectRatio = 'auto';
        f.style.width = (ar[q] * (r.h - 2 * O) + bw + 2 * O) + 'px'; f.style.height = (r.h + bw) + 'px';
      } else {
        f.style.boxSizing = 'content-box';
        f.style.width = (r.h * ar[q]) + 'px'; f.style.height = r.h + 'px';
      }
    }
  };
  const galleries = [...document.querySelectorAll('.gallery')];
  const ro = new ResizeObserver((es) => es.forEach((e) => justify(e.target)));
  galleries.forEach((g) => { justify(g); ro.observe(g); });

  // Videos autoplay muted while on screen; paused under reduced motion.
  // Videos load nothing until they come near the screen (the page stays light); then the
  // poster and metadata load, and on screen they play muted and looping. Under reduced
  // motion they stay on the poster with controls.
  const vids = [...document.querySelectorAll('video[data-autoplay]')];
  const near = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const v = e.target;
    if (v.dataset.poster) { v.poster = v.dataset.poster; delete v.dataset.poster; }
    v.preload = 'metadata'; near.unobserve(v);
  }), { rootMargin: '600px' });
  vids.forEach((v) => near.observe(v));
  if (reduce) { vids.forEach((v) => { v.pause(); v.controls = true; }); return; }
  const vio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.play().catch(() => {}); else e.target.pause(); }), { threshold: 0.25 });
  vids.forEach((v) => vio.observe(v));
  root.classList.add('motion');

  // Decks deal the next slide every few seconds while on screen and not hovered.
  decks.forEach(({ d, next }) => {
    let timer = 0, hover = false;
    d.addEventListener('pointerenter', () => { hover = true; });
    d.addEventListener('pointerleave', () => { hover = false; });
    new IntersectionObserver(([e]) => { clearInterval(timer); if (e.isIntersecting) timer = setInterval(() => { if (!hover && !lbOpen()) next(); }, 2600); }, { threshold: 0.5 }).observe(d);
  });

  const name = document.querySelector('[data-bounce]');
  const text = name.textContent; name.textContent = '';
  let i = 0;
  text.split(' ').forEach((word, wi) => {
    if (wi) name.append(' ');
    const w = document.createElement('span'); w.className = 'word';
    for (const ch of word) { const s = document.createElement('span'); s.className = 'ch'; s.style.animationDelay = (700 + i++ * 40) + 'ms'; s.textContent = ch; w.append(s); }
    name.append(w);
  });

  const stickers = [...document.querySelectorAll('.tile-name .sticker')];
  const dirs = [[-1, -1], [1, -1], [-1, 1], [1, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
  const cards = [...document.querySelectorAll('.card')];
  const hero = document.querySelector('.hero');
  const bandBox = document.querySelector('.band');
  const band = bandBox.querySelector('.band-row');
  const coin = document.querySelector('.coin');
  const awards = document.querySelector('.awards');
  // Section figures turn (and the laptop opens, the coins drop in) as their section scrolls past.
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const pose = {
    book: (f, p) => { f.el.style.transform = `rotateX(12deg) rotateY(${-28 + p * 360}deg)`; },
    laptop: (f, p) => {
      f.el.style.transform = `rotateX(-18deg) rotateY(${-30 + p * 60}deg)`;
      f.lid.style.transform = `translateZ(-120px) rotateX(${-90 + clamp01(p * 2.5) * 102}deg)`;
    },
    coins: (f, p) => {
      f.el.style.transform = `rotateX(-24deg) rotateY(${p * 300}deg)`;
      f.coins.forEach((c, i) => { const t = i ? clamp01((p - (i - 1) * 0.07) / 0.08) : 1; c.style.setProperty('--drop', ((1 - t) * 90) + 'px'); c.style.opacity = t; });
    },
    heart: (f, p) => { f.el.style.transform = `rotateY(${-20 + p * 360}deg)`; },
    globe: (f, p) => { f.el.style.transform = `rotateY(${20 + p * 540}deg)`; }
  };
  const figs = [...document.querySelectorAll('[data-fig]')].map((el) => ({ el, sec: el.closest('section'), kind: el.dataset.fig, lid: el.querySelector('.lt-lid'), coins: [...el.querySelectorAll('.cs')], last: -1 }));

  // Smooth scrolling: positions are measured once (and again when the page resizes), never
  // inside a frame, so a frame only writes styles and never forces a layout. One update per
  // frame, only for what is on screen, and only when a value actually changed.
  const pageTop = (el) => { let t = 0; for (let n = el; n; n = n.offsetParent) t += n.offsetTop; return t; };
  let geo;
  const measure = () => {
    geo = {
      heroEnd: pageTop(hero) + hero.offsetHeight,
      band: [pageTop(bandBox), bandBox.offsetHeight],
      awards: [pageTop(awards), awards.offsetHeight],
      figs: figs.map((f) => [pageTop(f.sec), f.sec.offsetHeight]),
      cards: cards.map((c) => pageTop(c))
    };
  };
  const cardT = cards.map(() => -1);
  let lastHeroY = -1, lastCoin = -1;
  const tick = () => {
    const y = scrollY, vh = innerHeight;
    const seen = ([top, h]) => top < y + vh && top + h > y;
    // hero stickers and the band only while the top of the page is on screen
    const hy = Math.min(y, geo.heroEnd);
    if (hy !== lastHeroY) {
      lastHeroY = hy;
      stickers.forEach((s, k) => { const [dx, dy] = dirs[k]; s.style.translate = `${dx * hy * 0.18}px ${dy * hy * 0.12}px`; s.style.rotate = `${dx * hy * 0.05}deg`; });
    }
    if (seen(geo.band)) band.style.transform = `translateX(${-y * 0.35}px)`;
    if (seen(geo.awards)) {
      const prog = clamp01((vh * 0.5 - (geo.awards[0] - y)) / geo.awards[1]);
      if (prog !== lastCoin) { lastCoin = prog; coin.style.transform = `rotateY(${-25 + prog * 720}deg) rotateX(8deg)`; }
    }
    figs.forEach((f, k) => {
      if (!seen(geo.figs[k])) return;
      const p = clamp01((vh * 0.5 - (geo.figs[k][0] - y)) / geo.figs[k][1]);
      if (p !== f.last) { f.last = p; pose[f.kind](f, p); }
    });
    // cards straighten as they arrive; a settled card is never touched again until it leaves
    cards.forEach((c, k) => {
      const t = Math.round(clamp01((vh - (geo.cards[k] - y)) / (vh * 0.2)) * 1000) / 1000;
      if (t === cardT[k]) return;
      cardT[k] = t;
      c.style.transform = t === 1 ? 'none' : `translateY(${(1 - t) * 30}px) rotate(${(1 - t) * 3 * (k % 2 ? 1 : -1)}deg)`;
    });
  };
  let queued = false;
  const frame = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; tick(); }); };
  addEventListener('scroll', frame, { passive: true });
  new ResizeObserver(() => { measure(); frame(); }).observe(document.querySelector('main'));
  measure();
  tick();

  // Floating stickers and figures that are off screen stop animating.
  const offIO = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-off', !e.isIntersecting)), { rootMargin: '100px' });
  document.querySelectorAll('.sticker, .card-sticker, .fig3d, .medal3d').forEach((el) => offIO.observe(el));
})();
