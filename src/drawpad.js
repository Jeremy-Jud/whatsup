/* Zeichenfläche (Kritzelpost): Finger, Stift und Maus.
 * Stift, Radierer, Füllen, Farben (inkl. eigener Farbe), Stiftdicke, Rückgängig/Wiederholen, Leeren.
 * Unabhängig vom Rest der App: window.WHATSUP_DRAWPAD.create() liefert { el, toDataURL, isBlank, clear, load, destroy }. */
(() => {
  'use strict';
  const SIZE = 640; // Zeichnung ist immer 640 × 640 Pixel, egal wie gross sie angezeigt wird
  const COLORS = ['#111111', '#ffffff', '#8a8a8a', '#d0d0d0', '#e53935', '#fb8c00', '#fdd835', '#7cb342',
    '#2e7d32', '#00acc1', '#1e88e5', '#3949ab', '#8e24aa', '#d81b60', '#6d4c41', '#ffccbc'];
  const SIZES = [3, 8, 16, 30];
  const UNDO_MAX = 15;
  const FILL_TOL = 48; // Toleranz beim Füllen (weiche Kanten mitfüllen)

  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const hexRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

  function create() {
    const root = h('div', 'dp');
    const stage = h('div', 'dp-stage');
    const canvas = h('canvas', 'dp-canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let tool = 'pen', color = '#111111', size = 8, changed = false;
    const undo = [], redo = [];

    function wipe() { ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, SIZE, SIZE); ctx.restore(); }
    wipe();
    const snapshot = () => ctx.getImageData(0, 0, SIZE, SIZE);
    function remember() { undo.push(snapshot()); if (undo.length > UNDO_MAX) undo.shift(); redo.length = 0; syncButtons(); }

    // ---------- Werkzeugleiste ----------
    const bar = h('div', 'dp-bar');
    const tools = h('div', 'dp-tools');
    const toolBtns = {};
    [['pen', '✏️', 'Stift'], ['eraser', '🧽', 'Radierer'], ['fill', '🪣', 'Füllen']].forEach(([id, ic, label]) => {
      const b = h('button', 'dp-btn' + (id === tool ? ' on' : ''), ic);
      b.type = 'button'; b.title = label; b.setAttribute('aria-label', label);
      b.onclick = () => { tool = id; Object.values(toolBtns).forEach((x) => x.classList.toggle('on', x === b)); };
      toolBtns[id] = b; tools.appendChild(b);
    });
    const undoBtn = h('button', 'dp-btn', '↶'); undoBtn.type = 'button'; undoBtn.title = 'Rückgängig';
    const redoBtn = h('button', 'dp-btn', '↷'); redoBtn.type = 'button'; redoBtn.title = 'Wiederholen';
    const clearBtn = h('button', 'dp-btn', '🗑️'); clearBtn.type = 'button'; clearBtn.title = 'Alles löschen';
    tools.append(h('span', 'dp-gap'), undoBtn, redoBtn, clearBtn);

    const colors = h('div', 'dp-colors');
    const swatches = [];
    const pickColor = (c, sw) => {
      color = c;
      swatches.forEach((x) => x.classList.toggle('on', x === sw));
      if (tool === 'eraser') { tool = 'pen'; Object.entries(toolBtns).forEach(([id, x]) => x.classList.toggle('on', id === 'pen')); }
      dot.style.background = color;
    };
    COLORS.forEach((c) => {
      const sw = h('button', 'dp-sw' + (c === color ? ' on' : ''));
      sw.type = 'button'; sw.style.background = c; sw.title = c; sw.setAttribute('aria-label', 'Farbe ' + c);
      sw.onclick = () => pickColor(c, sw);
      swatches.push(sw); colors.appendChild(sw);
    });
    // Eigene Farbe
    const customWrap = h('label', 'dp-sw dp-custom');
    customWrap.title = 'Eigene Farbe';
    const custom = h('input'); custom.type = 'color'; custom.value = '#ff66cc';
    custom.oninput = () => { customWrap.style.background = custom.value; pickColor(custom.value, customWrap); };
    customWrap.appendChild(custom);
    swatches.push(customWrap); colors.appendChild(customWrap);

    const sizes = h('div', 'dp-sizes');
    const dot = h('span', 'dp-dot');
    const slider = h('input', 'dp-slider'); slider.type = 'range'; slider.min = '2'; slider.max = '48'; slider.value = String(size);
    slider.setAttribute('aria-label', 'Stiftdicke');
    const showSize = () => { const px = Math.max(4, Math.min(28, size * 0.6)); dot.style.width = dot.style.height = px + 'px'; dot.style.background = color; };
    slider.oninput = () => { size = Number(slider.value); showSize(); };
    SIZES.forEach((s) => {
      const b = h('button', 'dp-size'); b.type = 'button'; b.title = `Dicke ${s}`;
      const d = h('span'); d.style.width = d.style.height = Math.max(4, s * 0.6) + 'px'; b.appendChild(d);
      b.onclick = () => { size = s; slider.value = String(s); showSize(); };
      sizes.appendChild(b);
    });
    sizes.append(slider, dot);
    showSize();

    bar.append(tools, colors, sizes);
    stage.appendChild(canvas);
    root.append(stage, bar);

    function syncButtons() { undoBtn.disabled = !undo.length; redoBtn.disabled = !redo.length; }
    syncButtons();
    undoBtn.onclick = () => { if (!undo.length) return; redo.push(snapshot()); ctx.putImageData(undo.pop(), 0, 0); changed = true; syncButtons(); };
    redoBtn.onclick = () => { if (!redo.length) return; undo.push(snapshot()); ctx.putImageData(redo.pop(), 0, 0); changed = true; syncButtons(); };
    clearBtn.onclick = () => { remember(); wipe(); changed = false; };

    // ---------- Zeichnen ----------
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * SIZE / r.width, y: (e.clientY - r.top) * SIZE / r.height }; };
    let drawing = null; // { id, last, mid }
    const widthOf = (e) => (e.pointerType === 'pen' && e.pressure > 0 ? size * (0.35 + e.pressure * 0.9) : size);
    function strokeStyle(e) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = ctx.fillStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = widthOf(e);
    }
    canvas.addEventListener('pointerdown', (e) => {
      if (drawing || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      const p = pos(e);
      remember();
      changed = true;
      if (tool === 'fill') { fill(Math.floor(p.x), Math.floor(p.y)); return; }
      try { canvas.setPointerCapture(e.pointerId); } catch {}
      drawing = { id: e.pointerId, last: p, mid: p };
      strokeStyle(e);
      ctx.beginPath(); ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); // Punkt beim Antippen
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drawing || e.pointerId !== drawing.id) return;
      e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of (evs.length ? evs : [e])) {
        const p = pos(ev), mid = { x: (drawing.last.x + p.x) / 2, y: (drawing.last.y + p.y) / 2 };
        strokeStyle(ev);
        ctx.beginPath(); ctx.moveTo(drawing.mid.x, drawing.mid.y); ctx.quadraticCurveTo(drawing.last.x, drawing.last.y, mid.x, mid.y); ctx.stroke();
        drawing.last = p; drawing.mid = mid;
      }
    });
    const end = (e) => {
      if (!drawing || e.pointerId !== drawing.id) return;
      ctx.beginPath(); ctx.moveTo(drawing.mid.x, drawing.mid.y); ctx.lineTo(drawing.last.x, drawing.last.y); ctx.stroke();
      drawing = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Füllen: zusammenhängende Fläche ähnlicher Farbe (Scanline-Verfahren)
    function fill(x, y) {
      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
      const img = ctx.getImageData(0, 0, SIZE, SIZE), d = img.data;
      const at = (y * SIZE + x) * 4, t = [d[at], d[at + 1], d[at + 2]];
      const [fr, fg, fb] = hexRgb(color);
      if (Math.abs(t[0] - fr) + Math.abs(t[1] - fg) + Math.abs(t[2] - fb) < 6) return; // schon diese Farbe
      const seen = new Uint8Array(SIZE * SIZE);
      const like = (i) => !seen[i] && Math.abs(d[i * 4] - t[0]) <= FILL_TOL && Math.abs(d[i * 4 + 1] - t[1]) <= FILL_TOL && Math.abs(d[i * 4 + 2] - t[2]) <= FILL_TOL;
      const stack = [[x, y]];
      while (stack.length) {
        let [cx, cy] = stack.pop();
        let i = cy * SIZE + cx;
        while (cx > 0 && like(i - 1)) { cx--; i--; }
        let up = false, down = false;
        for (; cx < SIZE && like(i); cx++, i++) {
          seen[i] = 1;
          d[i * 4] = fr; d[i * 4 + 1] = fg; d[i * 4 + 2] = fb; d[i * 4 + 3] = 255;
          if (cy > 0) { const u = like(i - SIZE); if (u && !up) { stack.push([cx, cy - 1]); up = true; } else if (!u) up = false; }
          if (cy < SIZE - 1) { const w = like(i + SIZE); if (w && !down) { stack.push([cx, cy + 1]); down = true; } else if (!w) down = false; }
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    // Rückgängig per Tastatur (Strg+Z / Strg+Y), solange die Zeichenfläche sichtbar ist
    const onKey = (e) => {
      if (!root.isConnected || !root.offsetParent || !(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undoBtn.click(); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redoBtn.click(); }
    };
    document.addEventListener('keydown', onKey);

    return {
      el: root,
      isBlank: () => !changed,
      clear: () => { wipe(); undo.length = redo.length = 0; changed = false; syncButtons(); },
      // Bild als Daten-URL, möglichst klein genug für den Versand (PNG, sonst JPEG in sinkender Qualität)
      toDataURL(maxLen = 500000) {
        let url = canvas.toDataURL('image/png');
        for (const q of [0.88, 0.75, 0.6, 0.45]) { if (url.length <= maxLen) break; url = canvas.toDataURL('image/jpeg', q); }
        return url;
      },
      // Entwurf wiederherstellen (z. B. nach dem Neuladen)
      load(dataUrl) {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => { wipe(); ctx.drawImage(img, 0, 0, SIZE, SIZE); changed = true; resolve(true); };
          img.onerror = () => resolve(false);
          img.src = dataUrl;
        });
      },
      destroy() { document.removeEventListener('keydown', onKey); },
    };
  }

  window.WHATSUP_DRAWPAD = { create, SIZE };
})();
