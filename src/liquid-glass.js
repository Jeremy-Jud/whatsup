// Design „Liquid Glass“: echte Lichtbrechung am Glasrand, gleitender Tab-Tropfen,
// schwebende Chat-Leisten. Wird von app.js über LiquidGlass.set(true/false) geschaltet.
//
// Lichtbrechung: Für jede Glasleiste wird eine Verschiebungskarte (Displacement Map) in
// genau ihrer Größe und Rundung berechnet. Ein SVG-Filter verbiegt damit den Hintergrund
// am Rand wie eine gewölbte Glaskante, mit leichtem Farbsaum. Das kann nur Chromium
// (Windows-App, Chrome, Edge); Safari bekommt Milchglas mit Unschärfe aus der CSS-Datei.
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const ua = navigator.userAgent;
  const CAN_REFRACT = !!window.chrome && /Chrome\/\d+/.test(ua) && !/CriOS|EdgiOS|FxiOS/.test(ua);

  // Welche Leisten Licht brechen: Stärke (scale), Breite der Glaskante (edge), Unschärfe (blur)
  const GLASS = [
    { sel: '#tabbar', scale: 42, edge: 22, blur: 3, sat: 1.9 },
    { sel: '#viewChat .chatbar', scale: 36, edge: 20, blur: 1.6, sat: 1.9 },
    { sel: '#sendForm', scale: 36, edge: 20, blur: 1.6, sat: 1.9 },
    { sel: '#chatSearchBar', scale: 30, edge: 18, blur: 2.4, sat: 1.8 },
  ];

  let on = false;
  let svg = null;
  let uid = 0;
  const glass = new Map();   // Element -> { id, filter, key }
  let ro = null;             // ResizeObserver für Glasleisten
  let chatRo = null;         // ResizeObserver für die schwebenden Chat-Leisten
  let tabMo = null;          // MutationObserver für den aktiven Tab
  let pill = null;
  let pillAt = null;         // { x, w } zuletzt
  const $ = (s) => document.querySelector(s);

  // ---------- Verschiebungskarte ----------
  // Rot = Verschiebung in x, Grün = in y (128 = keine). Innen neutral, zur Kante hin
  // wird der Hintergrund immer stärker nach innen gezogen – wie bei einer Glaslinse.
  function buildMap(w, h, r, edge) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    const d = img.data;
    const hw = w / 2, hh = h / 2;
    r = Math.min(r, hw, hh);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = x + 0.5 - hw, py = y + 0.5 - hh;
        const qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
        const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
        const inside = -(Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r); // Abstand zur Kante
        let nx = 0, ny = 0, k = 0;
        if (inside < edge) {
          if (ox > 0 || oy > 0) {
            const L = Math.hypot(ox, oy) || 1;
            nx = (ox / L) * Math.sign(px); ny = (oy / L) * Math.sign(py);
          } else if (qx > qy) nx = Math.sign(px);
          else ny = Math.sign(py);
          const t = 1 - Math.max(0, inside) / edge;      // 0 innen … 1 an der Kante
          k = 1 - Math.sqrt(Math.max(0, 1 - t * t));     // Kreisprofil: Kante biegt stark
        }
        const i = (y * w + x) * 4;
        d[i] = 128 - nx * k * 127;      // nach innen ziehen: nie über den Rand hinaus lesen
        d[i + 1] = 128 - ny * k * 127;
        d[i + 2] = 128;
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  }

  function ensureSvg() {
    if (svg) return;
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
    svg.appendChild(document.createElementNS(NS, 'defs'));
    document.body.appendChild(svg);
  }

  function node(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // Filter: leicht weichzeichnen → am Rand brechen (Rot/Grün/Blau etwas unterschiedlich
  // stark = feiner Farbsaum) → Farben kräftiger
  function buildFilter(id, w, h, map, o) {
    const f = node('filter', {
      id, x: 0, y: 0, width: w, height: h,
      filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse',
      'color-interpolation-filters': 'sRGB',
    });
    node('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: o.blur, result: 'b' }, f);
    node('feImage', { href: map, x: 0, y: 0, width: w, height: h, preserveAspectRatio: 'none', result: 'm' }, f);
    const ch = [['r', 1, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'],
      ['g', 0.93, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'],
      ['bl', 0.86, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0']];
    for (const [n, s, m] of ch) {
      node('feDisplacementMap', { in: 'b', in2: 'm', scale: (o.scale * s).toFixed(1), xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' + n }, f);
      node('feColorMatrix', { in: 'd' + n, type: 'matrix', values: m, result: n }, f);
    }
    node('feBlend', { in: 'r', in2: 'g', mode: 'screen', result: 'rg' }, f);
    node('feBlend', { in: 'rg', in2: 'bl', mode: 'screen', result: 'rgb' }, f);
    node('feColorMatrix', { in: 'rgb', type: 'saturate', values: o.sat }, f);
    return f;
  }

  function refresh(el) {
    const g = glass.get(el);
    if (!g) return;
    const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
    if (!w || !h) return;
    const r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    const key = w + 'x' + h + 'r' + r;
    if (key === g.key) return;
    g.key = key;
    const f = buildFilter(g.id, w, h, buildMap(w, h, r, g.o.edge), g.o);
    if (g.filter) g.filter.replaceWith(f); else svg.firstChild.appendChild(f);
    g.filter = f;
    el.style.setProperty('--lg-bf', `url(#${g.id})`);
  }

  function startGlass() {
    if (!CAN_REFRACT) return;
    ensureSvg();
    // ResizeObserver meldet sich nach dem Layout – auch wenn ein Element sichtbar wird
    ro = new ResizeObserver((entries) => entries.forEach((e) => refresh(e.target)));
    for (const o of GLASS) {
      const el = $(o.sel);
      if (!el) continue;
      glass.set(el, { id: 'lg-f' + (++uid), filter: null, key: '', o });
      ro.observe(el);
      refresh(el);
    }
    document.documentElement.classList.add('lg-refract');
  }

  function stopGlass() {
    if (ro) { ro.disconnect(); ro = null; }
    glass.forEach((g, el) => { el.style.removeProperty('--lg-bf'); if (g.filter) g.filter.remove(); });
    glass.clear();
    document.documentElement.classList.remove('lg-refract');
  }

  // ---------- Gleitender Tropfen in der Tab-Leiste ----------
  function placePill(animate) {
    const bar = $('#tabbar');
    if (!pill || !bar || bar.classList.contains('hidden')) return;
    const t = bar.querySelector('.tab.active');
    if (!t) { pill.style.opacity = '0'; return; }
    const to = { x: t.offsetLeft, w: t.offsetWidth };
    const from = pillAt;
    pill.style.opacity = '1';
    pill.style.width = to.w + 'px';
    pill.style.transform = `translateX(${to.x}px)`;
    pillAt = to;
    if (!animate || !from || (from.x === to.x && from.w === to.w) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Wie ein Tropfen: dehnt sich in Laufrichtung, schwingt am Ziel kurz nach
    const dist = Math.abs(to.x - from.x);
    const stretch = Math.min(1.45, 1 + dist / 260);
    const mid = from.x + (to.x - from.x) * 0.55;
    pill.animate([
      { transform: `translateX(${from.x}px) scale(1, 1)`, width: from.w + 'px' },
      { transform: `translateX(${mid}px) scale(${stretch}, ${(1 / Math.sqrt(stretch)).toFixed(3)})`, width: ((from.w + to.w) / 2) + 'px', offset: 0.45 },
      { transform: `translateX(${to.x}px) scale(.94, 1.06)`, width: to.w + 'px', offset: 0.78 },
      { transform: `translateX(${to.x}px) scale(1, 1)`, width: to.w + 'px' },
    ], { duration: 560, easing: 'cubic-bezier(.3, .7, .2, 1)' });
  }

  function startPill() {
    const bar = $('#tabbar');
    if (!bar) return;
    pill = document.createElement('span');
    pill.className = 'lg-pill';
    pill.style.transformOrigin = 'center';
    bar.prepend(pill);
    bar.classList.add('has-pill');
    pillAt = null;
    tabMo = new MutationObserver(() => placePill(true));
    tabMo.observe(bar, { subtree: true, attributes: true, attributeFilter: ['class'] });
    placePill(false);
  }

  function stopPill() {
    if (tabMo) { tabMo.disconnect(); tabMo = null; }
    if (pill) { pill.remove(); pill = null; }
    const bar = $('#tabbar');
    if (bar) bar.classList.remove('has-pill');
  }

  // ---------- Schwebende Chat-Leisten: Platz in der Nachrichtenliste freihalten ----------
  function syncChatSpace() {
    const view = $('#viewChat'), box = $('#messages');
    const top = $('#viewChat .chat-top'), bottom = $('#viewChat .chat-bottom');
    if (!view || !box || !top || !bottom) return;
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 48;
    view.style.setProperty('--lg-top', top.offsetHeight + 'px');
    view.style.setProperty('--lg-bottom', bottom.offsetHeight + 'px');
    if (atBottom) box.scrollTop = box.scrollHeight;
  }

  function startChat() {
    const top = $('#viewChat .chat-top'), bottom = $('#viewChat .chat-bottom');
    if (!top || !bottom) return;
    chatRo = new ResizeObserver(syncChatSpace);
    chatRo.observe(top); chatRo.observe(bottom);
  }

  function stopChat() {
    if (chatRo) { chatRo.disconnect(); chatRo = null; }
    const view = $('#viewChat');
    if (view) { view.style.removeProperty('--lg-top'); view.style.removeProperty('--lg-bottom'); }
  }

  // ---------- Fenster inaktiv → Hintergrund pausieren (spart Akku) ----------
  const idle = () => document.documentElement.classList.toggle('lg-idle', !document.hasFocus() || document.hidden);
  window.addEventListener('blur', idle);
  window.addEventListener('focus', idle);
  document.addEventListener('visibilitychange', idle);
  window.addEventListener('resize', () => { if (on) placePill(false); });

  function set(enable) {
    enable = !!enable;
    if (enable === on) return;
    on = enable;
    if (on) { startGlass(); startPill(); startChat(); idle(); }
    else { stopGlass(); stopPill(); stopChat(); }
  }

  window.LiquidGlass = { set, get supported() { return CAN_REFRACT; } };
})();
