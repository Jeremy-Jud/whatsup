// Bewegte Hintergründe für die Designs: ein Canvas hinter der App (z-index -1).
// app.js schaltet mit ThemeFx.set('galaxy' | … | null).
// Spart Akku: läuft nur, wenn das Fenster sichtbar ist (requestAnimationFrame),
// ohne Fokus nur mit ~20 Bildern pro Sekunde, und bei „Bewegung reduzieren“ als Standbild.
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let canvas = null, ctx = null, cur = null, scene = null, st = null;
  let W = 0, H = 0, DPR = 1, raf = 0, last = 0, lastDraw = 0;

  // Weicher Lichtpunkt (vorberechnet, schneller als jedes Mal einen Verlauf zu bauen)
  const sprites = new Map();
  function glow(color, size) {
    const key = color + size;
    if (sprites.has(key)) return sprites.get(key);
    const c = document.createElement('canvas');
    c.width = c.height = size * 2;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(size, size, 0, size, size, size);
    gr.addColorStop(0, color); gr.addColorStop(0.25, color.replace(/[\d.]+\)$/, '0.45)')); gr.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
    g.fillStyle = gr; g.fillRect(0, 0, size * 2, size * 2);
    sprites.set(key, c);
    return c;
  }
  const drawGlow = (c, sprite, x, y, r, a) => { c.globalAlpha = a; c.drawImage(sprite, x - r, y - r, r * 2, r * 2); };

  // ======================= Szenen =======================
  const SCENES = {
    // ---------- Galaxy: funkelnde Sterne in drei Tiefen + Sternschnuppen ----------
    galaxy: {
      init() {
        const n = Math.round((W * H) / 1100);
        const stars = Array.from({ length: n }, () => {
          const layer = Math.random() < 0.7 ? 0 : Math.random() < 0.75 ? 1 : 2;
          return { x: rnd(0, W), y: rnd(0, H), layer, r: [0.55, 0.95, 1.5][layer] * rnd(0.7, 1.2), a: rnd(0.45, 1), tw: rnd(0.6, 2.4), ph: rnd(0, TAU), tint: pick(['255,255,255', '255,255,255', '200,215,255', '255,230,210']) };
        });
        return { stars, meteors: [], next: rnd(0.6, 1.8) };
      },
      frame(c, s, dt, t) {
        const speed = [1.2, 2.6, 4.5];
        for (const p of s.stars) {
          p.x -= speed[p.layer] * dt; p.y += speed[p.layer] * 0.25 * dt;
          if (p.x < -4) p.x = W + 4; if (p.y > H + 4) p.y = -4;
          const a = p.a * (0.6 + 0.4 * Math.sin(t * p.tw + p.ph));
          if (p.layer === 2) {
            drawGlow(c, glow(`rgba(${p.tint},1)`, 16), p.x, p.y, p.r * 5, a * 0.55);
            c.globalAlpha = a; c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill();
          } else {
            c.globalAlpha = a; c.fillStyle = `rgb(${p.tint})`; c.fillRect(p.x, p.y, p.r * 1.4, p.r * 1.4);
          }
        }
        // Sternschnuppen
        s.next -= dt;
        if (s.next <= 0) {
          const fire = Math.random() < 0.15;
          const ang = rnd(2.45, 2.75); // nach links unten
          const sp = rnd(380, 620);
          s.meteors.push({ x: rnd(W * 0.3, W * 1.1), y: rnd(-20, H * 0.35), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, len: rnd(150, 280) * (fire ? 1.4 : 1), life: rnd(1.1, 1.7), age: 0, w: fire ? 3 : rnd(2, 2.6), col: fire ? pick(['140,220,255', '210,160,255', '255,200,140']) : '255,255,255' });
          s.next = Math.random() < 0.2 ? rnd(0.2, 0.5) : rnd(0.9, 2.8);
        }
        c.globalCompositeOperation = 'lighter';
        s.meteors = s.meteors.filter((m) => {
          m.age += dt;
          if (m.age > m.life) return false;
          const k = m.age / m.life;
          const env = Math.min(1, k * 8) * (k > 0.55 ? 1 - (k - 0.55) / 0.45 : 1);
          const hx = m.x + m.vx * m.age, hy = m.y + m.vy * m.age;
          const v = Math.hypot(m.vx, m.vy), L = m.len * Math.min(1, m.age * 4);
          const tx = hx - (m.vx / v) * L, ty = hy - (m.vy / v) * L;
          const g = c.createLinearGradient(hx, hy, tx, ty);
          g.addColorStop(0, `rgba(${m.col},${env})`); g.addColorStop(0.4, `rgba(${m.col},${0.55 * env})`); g.addColorStop(1, `rgba(${m.col},0)`);
          c.lineCap = 'round';
          // breiter, weicher Schein + heller Kern
          c.globalAlpha = 0.22; c.strokeStyle = g; c.lineWidth = m.w * 4;
          c.beginPath(); c.moveTo(hx, hy); c.lineTo(tx, ty); c.stroke();
          c.globalAlpha = 1; c.lineWidth = m.w;
          c.stroke();
          drawGlow(c, glow(`rgba(${m.col},1)`, 24), hx, hy, 8 * m.w, env);
          return true;
        });
        c.globalCompositeOperation = 'source-over';
      },
    },

    // ---------- Synthwave: gestreifte Sonne, Gitter rast auf dich zu ----------
    synthwave: {
      opacity: 0.8,
      init() {
        return { stars: Array.from({ length: 70 }, () => ({ x: rnd(0, W), y: rnd(0, H * 0.55), a: rnd(0.3, 0.9), ph: rnd(0, TAU) })) };
      },
      frame(c, s, dt, t) {
        const hy = H * 0.62;
        for (const p of s.stars) { c.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t * 1.5 + p.ph)); c.fillStyle = '#ffd6ff'; c.fillRect(p.x, p.y, 1.2, 1.2); }
        // Sonne mit Streifen, die langsam nach oben wandern
        const R = Math.min(W * 0.3, 120), cx = W / 2, cy = hy - R * 0.28;
        drawGlow(c, glow('rgba(255,70,170,1)', 64), cx, cy, R * 2.1, 0.35);
        const sg = c.createLinearGradient(0, cy - R, 0, cy + R);
        sg.addColorStop(0, '#ffe766'); sg.addColorStop(0.5, '#ff8a4c'); sg.addColorStop(1, '#ff2fa0');
        c.save();
        c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.rect(0, hy, W, H); c.clip('evenodd');
        c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip();
        c.globalAlpha = 0.62; c.fillStyle = sg; c.fillRect(cx - R, cy - R, R * 2, R * 2);
        c.globalCompositeOperation = 'destination-out';
        const off = (t * 10) % 14;
        for (let y = cy - R * 0.05 + off; y < cy + R; y += 14) {
          const th = 1.5 + ((y - cy) / R) * 6;
          if (th > 0) c.fillRect(cx - R, y, R * 2, th);
        }
        c.restore();
        // Horizont-Leuchten
        const hg = c.createLinearGradient(0, hy - 30, 0, hy + 8);
        hg.addColorStop(0, 'rgba(255,60,180,0)'); hg.addColorStop(0.8, 'rgba(255,80,200,.55)'); hg.addColorStop(1, 'rgba(255,80,200,0)');
        c.globalAlpha = 1; c.fillStyle = hg; c.fillRect(0, hy - 30, W, 38);
        // Gitter
        c.lineWidth = 1;
        const phase = (t * 0.9) % 1;
        c.beginPath();
        for (let i = 0; i < 26; i++) {
          const d = i + 1 - phase;
          const y = hy + (H - hy) * (1.1 / d);
          if (y > H + 2) continue;
          c.moveTo(0, y); c.lineTo(W, y);
        }
        for (let j = -14; j <= 14; j++) { c.moveTo(cx + j * W * 0.015, hy); c.lineTo(cx + j * W * 0.16, H); }
        const lg = c.createLinearGradient(0, hy, 0, H);
        lg.addColorStop(0, 'rgba(255,60,210,.05)'); lg.addColorStop(0.35, 'rgba(255,60,210,.55)'); lg.addColorStop(1, 'rgba(120,200,255,.75)');
        c.strokeStyle = lg; c.globalAlpha = 1; c.stroke();
      },
    },

    // ---------- Tiefsee: wiegende Lichtstrahlen, aufsteigende Luftblasen, Schwebeteilchen ----------
    tiefsee: {
      init() {
        return {
          rays: Array.from({ length: 6 }, (_, i) => ({ x: (i + rnd(0.1, 0.9)) * (W / 6), w0: rnd(10, 30), w1: rnd(50, 110), ph: rnd(0, TAU), sp: rnd(0.15, 0.35), a: rnd(0.06, 0.12) })),
          bubbles: Array.from({ length: Math.round(W / 9) }, () => this.bubble(true)),
          motes: Array.from({ length: 70 }, () => ({ x: rnd(0, W), y: rnd(0, H), vx: rnd(-4, 4), vy: rnd(-3, 3), a: rnd(0.15, 0.45), r: rnd(0.5, 1.3) })),
        };
      },
      bubble(any) { return { x: rnd(0, W), y: any ? rnd(0, H) : H + rnd(5, 60), r: Math.random() < 0.8 ? rnd(1.2, 3.2) : rnd(3.5, 6.5), sp: rnd(22, 55), wob: rnd(4, 12), ph: rnd(0, TAU) }; },
      frame(c, s, dt, t) {
        c.globalCompositeOperation = 'lighter';
        for (const r of s.rays) {
          const sway = Math.sin(t * r.sp + r.ph) * 40;
          const g = c.createLinearGradient(0, 0, 0, H * 0.85);
          const a = r.a * (0.7 + 0.3 * Math.sin(t * r.sp * 2.3 + r.ph));
          g.addColorStop(0, `rgba(170,255,240,${a})`); g.addColorStop(1, 'rgba(170,255,240,0)');
          c.globalAlpha = 1; c.fillStyle = g;
          c.beginPath(); c.moveTo(r.x - r.w0, -10); c.lineTo(r.x + r.w0, -10); c.lineTo(r.x + sway + r.w1, H * 0.85); c.lineTo(r.x + sway - r.w1, H * 0.85); c.closePath(); c.fill();
        }
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#bff6ff';
        for (const m of s.motes) {
          m.x += m.vx * dt; m.y += m.vy * dt;
          if (m.x < 0) m.x += W; if (m.x > W) m.x -= W; if (m.y < 0) m.y += H; if (m.y > H) m.y -= H;
          c.globalAlpha = m.a; c.fillRect(m.x, m.y, m.r, m.r);
        }
        for (let i = 0; i < s.bubbles.length; i++) {
          const b = s.bubbles[i];
          b.y -= b.sp * (1 + b.r / 8) * dt;
          const x = b.x + Math.sin(t * 2 + b.ph) * b.wob * 0.4;
          if (b.y < -10) { s.bubbles[i] = this.bubble(false); continue; }
          c.globalAlpha = 0.55; c.strokeStyle = 'rgba(200,255,255,1)'; c.lineWidth = b.r > 3.5 ? 1.2 : 0.9;
          c.beginPath(); c.arc(x, b.y, b.r, 0, TAU); c.stroke();
          c.globalAlpha = 0.12; c.fillStyle = '#cffcff'; c.fill();
          c.globalAlpha = 0.85; c.fillStyle = '#fff'; c.beginPath(); c.arc(x - b.r * 0.35, b.y - b.r * 0.35, Math.max(0.6, b.r * 0.22), 0, TAU); c.fill();
        }
      },
    },

    // ---------- Kirschblüte: taumelnde Blütenblätter im Wind ----------
    sakura: {
      init() { return { petals: Array.from({ length: Math.round(W / 11) }, () => this.petal(true)) }; },
      petal(any) {
        return { x: rnd(-20, W), y: any ? rnd(-20, H) : rnd(-60, -10), s: rnd(5, 10), rot: rnd(0, TAU), vr: rnd(-1.6, 1.6), fl: rnd(0, TAU), vf: rnd(1.5, 3.5), vy: rnd(28, 58), vx: rnd(8, 26), sw: rnd(0.8, 2), ph: rnd(0, TAU), col: pick([['#ffe0ea', '#f590b4'], ['#ffd3e2', '#ee7aa5'], ['#fff0f5', '#f7a8c4']]) };
      },
      frame(c, s, dt, t) {
        const wind = 1 + 0.6 * Math.sin(t * 0.25) + 0.3 * Math.sin(t * 0.9);
        for (let i = 0; i < s.petals.length; i++) {
          const p = s.petals[i];
          p.y += p.vy * dt; p.x += (p.vx * wind + Math.sin(t * p.sw + p.ph) * 18) * dt;
          p.rot += p.vr * dt; p.fl += p.vf * dt;
          if (p.y > H + 20 || p.x > W + 30) { s.petals[i] = this.petal(false); continue; }
          c.save();
          c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(p.fl)));
          const g = c.createLinearGradient(0, -p.s, 0, p.s);
          g.addColorStop(0, p.col[0]); g.addColorStop(1, p.col[1]);
          c.globalAlpha = 0.92; c.fillStyle = g;
          const k = p.s;
          c.beginPath();
          c.moveTo(0, k);
          c.bezierCurveTo(k * 0.95, k * 0.45, k * 0.75, -k * 0.75, k * 0.18, -k);
          c.lineTo(0, -k * 0.78);                  // kleine Kerbe an der Spitze
          c.lineTo(-k * 0.18, -k);
          c.bezierCurveTo(-k * 0.75, -k * 0.75, -k * 0.95, k * 0.45, 0, k);
          c.fill();
          c.restore();
        }
      },
    },

    // ---------- Winterzauber: Schnee in drei Tiefen, Windböen, große Kristalle ----------
    winter: {
      init() {
        const n = Math.round((W * H) / 2600);
        return { flakes: Array.from({ length: n }, () => this.flake(true)) };
      },
      flake(any) {
        const z = Math.random();
        const crystal = z > 0.94;
        return { x: rnd(0, W), y: any ? rnd(0, H) : rnd(-30, -5), z, r: crystal ? rnd(4, 7) : 0.7 + z * 2.6, crystal, vy: 18 + z * 55, ph: rnd(0, TAU), sw: rnd(0.5, 1.5), rot: rnd(0, TAU), vr: rnd(-0.6, 0.6), a: 0.45 + z * 0.5 };
      },
      frame(c, s, dt, t) {
        const wind = Math.sin(t * 0.18) * 22 + Math.sin(t * 0.7) * 8;
        for (let i = 0; i < s.flakes.length; i++) {
          const f = s.flakes[i];
          f.y += f.vy * dt; f.x += (wind * (0.4 + f.z) + Math.sin(t * f.sw + f.ph) * 10) * dt; f.rot += f.vr * dt;
          if (f.y > H + 10) { s.flakes[i] = this.flake(false); continue; }
          if (f.x > W + 10) f.x -= W + 20; if (f.x < -10) f.x += W + 20;
          if (f.crystal) {
            c.save(); c.translate(f.x, f.y); c.rotate(f.rot);
            c.globalAlpha = 0.8; c.strokeStyle = '#eaf6ff'; c.lineWidth = 1; c.lineCap = 'round';
            c.beginPath();
            for (let k = 0; k < 6; k++) {
              const a = (k * TAU) / 6, ex = Math.cos(a) * f.r, ey = Math.sin(a) * f.r;
              c.moveTo(0, 0); c.lineTo(ex, ey);
              const bx = Math.cos(a) * f.r * 0.55, by = Math.sin(a) * f.r * 0.55;
              c.moveTo(bx, by); c.lineTo(bx + Math.cos(a + 0.8) * f.r * 0.3, by + Math.sin(a + 0.8) * f.r * 0.3);
              c.moveTo(bx, by); c.lineTo(bx + Math.cos(a - 0.8) * f.r * 0.3, by + Math.sin(a - 0.8) * f.r * 0.3);
            }
            c.stroke(); c.restore();
            drawGlow(c, glow('rgba(220,240,255,1)', 16), f.x, f.y, f.r * 1.6, 0.25);
          } else if (f.r > 2.2) {
            drawGlow(c, glow('rgba(240,248,255,1)', 16), f.x, f.y, f.r * 2.2, f.a);
          } else {
            c.globalAlpha = f.a; c.fillStyle = '#f2f8ff'; c.beginPath(); c.arc(f.x, f.y, f.r, 0, TAU); c.fill();
          }
        }
      },
    },

    // ---------- Glühwürmchen: schwirrende Lichter über wiegendem Gras ----------
    fireflies: {
      init() {
        const blades = [];
        for (let x = -4; x < W + 4; x += rnd(3, 6)) blades.push({ x, h: rnd(14, 46), ph: rnd(0, TAU), w: rnd(2, 4) });
        return {
          flies: Array.from({ length: Math.max(14, Math.round(W / 15)) }, () => ({ x: rnd(0, W), y: rnd(H * 0.15, H * 0.95), ang: rnd(0, TAU), sp: rnd(8, 22), ph: rnd(0, TAU), fr: rnd(0.6, 1.6), size: rnd(10, 18) })),
          blades,
        };
      },
      frame(c, s, dt, t) {
        c.globalCompositeOperation = 'lighter';
        for (const f of s.flies) {
          f.ang += (Math.sin(t * 0.7 + f.ph) * 1.4 + rnd(-0.6, 0.6)) * dt;
          f.x += Math.cos(f.ang) * f.sp * dt; f.y += Math.sin(f.ang) * f.sp * 0.7 * dt;
          if (f.x < -20) f.x = W + 20; if (f.x > W + 20) f.x = -20;
          if (f.y < H * 0.08) f.ang = rnd(0.4, 2.7);        // wieder nach unten
          if (f.y > H * 0.97) f.ang = -rnd(0.4, 2.7);       // wieder nach oben
          const pulse = Math.pow(Math.max(0, Math.sin(t * f.fr + f.ph)), 3);
          const a = 0.12 + 0.88 * pulse;
          drawGlow(c, glow('rgba(200,255,90,1)', 32), f.x, f.y, f.size * (0.85 + pulse * 0.6), a * 0.95);
          c.globalAlpha = a; c.fillStyle = '#f4ffb8'; c.beginPath(); c.arc(f.x, f.y, 1.4, 0, TAU); c.fill();
        }
        c.globalCompositeOperation = 'source-over';
        // Gras
        c.globalAlpha = 0.95; c.fillStyle = '#020a05';
        c.beginPath(); c.moveTo(-10, H);
        for (const b of s.blades) {
          const sway = Math.sin(t * 1.1 + b.ph) * b.h * 0.12;
          c.lineTo(b.x - b.w / 2, H); c.quadraticCurveTo(b.x + sway * 0.4, H - b.h * 0.6, b.x + sway, H - b.h); c.quadraticCurveTo(b.x + sway * 0.4 + b.w * 0.3, H - b.h * 0.5, b.x + b.w / 2, H);
        }
        c.lineTo(W + 10, H); c.closePath(); c.fill();
      },
    },

    // ---------- Lavalampe: glühende Blasen steigen und sinken ----------
    lava: {
      opacity: 0.9,
      init() {
        return { blobs: Array.from({ length: 8 }, (_, i) => ({ x: rnd(0.1, 0.9) * W, r: rnd(0.16, 0.3) * Math.min(W, 520), sp: rnd(0.05, 0.11), ph: rnd(0, TAU), dx: rnd(0.02, 0.08) * W, hue: i % 3 })) };
      },
      frame(c, s, dt, t) {
        const cols = [['255,190,90', '255,90,60'], ['255,120,70', '255,45,110'], ['255,160,60', '230,40,80']];
        c.globalCompositeOperation = 'lighter';
        for (const b of s.blobs) {
          const y = H * (0.5 + 0.62 * Math.sin(t * b.sp + b.ph));
          const x = b.x + Math.sin(t * b.sp * 1.7 + b.ph) * b.dx;
          const r = b.r * (0.9 + 0.12 * Math.sin(t * 0.6 + b.ph));
          const [a, z] = cols[b.hue];
          const g = c.createRadialGradient(x - r * 0.2, y - r * 0.25, r * 0.05, x, y, r);
          g.addColorStop(0, `rgba(${a},.75)`); g.addColorStop(0.55, `rgba(${z},.4)`); g.addColorStop(1, `rgba(${z},0)`);
          c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
        }
        c.globalCompositeOperation = 'source-over';
      },
    },

    // ---------- Gewitter: ziehende Wolken, Regen, Blitze mit Verästelung ----------
    storm: {
      init() {
        return {
          drops: Array.from({ length: Math.round((W * H) / 1700) }, () => ({ x: rnd(-40, W + 40), y: rnd(-H, H), len: rnd(10, 22), sp: rnd(650, 950), a: rnd(0.12, 0.32) })),
          clouds: Array.from({ length: 6 }, () => ({ x: rnd(-0.2, 1.2) * W, y: rnd(-0.05, 0.22) * H, r: rnd(0.35, 0.6) * W, sp: rnd(4, 10) })),
          next: rnd(2.5, 5), flash: 0, bolt: null, boltAge: 0,
        };
      },
      makeBolt(x0, y0, y1) {
        const main = [[x0, y0]]; const branches = [];
        let x = x0, y = y0;
        while (y < y1) {
          y += rnd(14, 30); x += rnd(-22, 22);
          main.push([x, y]);
          if (Math.random() < 0.18) {
            const br = [[x, y]]; let bx = x, by = y; const dir = Math.random() < 0.5 ? -1 : 1;
            for (let k = 0; k < rnd(3, 6); k++) { by += rnd(12, 24); bx += dir * rnd(6, 22); br.push([bx, by]); }
            branches.push(br);
          }
        }
        return { main, branches };
      },
      frame(c, s, dt, t) {
        // Wolken
        for (const cl of s.clouds) {
          cl.x += cl.sp * dt; if (cl.x - cl.r > W) cl.x = -cl.r;
          drawGlow(c, glow('rgba(70,82,104,1)', 64), cl.x, cl.y, cl.r, Math.min(1, 0.45 + s.flash * 0.5));
        }
        // Blitz
        s.next -= dt;
        if (s.next <= 0) {
          s.bolt = this.makeBolt(rnd(W * 0.15, W * 0.85), -10, rnd(H * 0.35, H * 0.7));
          s.boltAge = 0; s.flash = 1;
          s.next = rnd(4, 10);
        }
        if (s.bolt) {
          s.boltAge += dt;
          const vis = s.boltAge < 0.08 || (s.boltAge > 0.13 && s.boltAge < 0.24);
          if (vis) {
            const path = (pts) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts) c.lineTo(p[0], p[1]); c.stroke(); };
            c.lineCap = 'round'; c.lineJoin = 'round';
            c.globalAlpha = 0.35; c.strokeStyle = '#b9c9ff'; c.lineWidth = 7; path(s.bolt.main);
            c.globalAlpha = 1; c.strokeStyle = '#f4f7ff'; c.lineWidth = 2; path(s.bolt.main);
            c.lineWidth = 1; c.globalAlpha = 0.7; s.bolt.branches.forEach(path);
          }
          if (s.boltAge > 0.3) s.bolt = null;
        }
        if (s.flash > 0) {
          c.globalAlpha = s.flash * 0.22; c.fillStyle = '#c8d6ff'; c.fillRect(0, 0, W, H);
          s.flash = Math.max(0, s.flash - dt * (s.boltAge < 0.15 ? 2 : 4));
        }
        // Regen (ein einziger Pfad = schnell)
        const wx = -0.22;
        c.globalAlpha = 0.28; c.strokeStyle = '#b4c4dc'; c.lineWidth = 1;
        c.beginPath();
        for (const d of s.drops) {
          d.y += d.sp * dt; d.x += d.sp * wx * dt;
          if (d.y > H + 20) { d.y = rnd(-60, -10); d.x = rnd(0, W + 80); }
          c.moveTo(d.x, d.y); c.lineTo(d.x - d.len * wx, d.y - d.len);
        }
        c.stroke();
      },
    },

    // ---------- Abendrot: tief stehende Sonne, Wolken, ziehende Vogelschwärme ----------
    sunset: {
      init() {
        return {
          clouds: Array.from({ length: 5 }, () => ({ x: rnd(-0.3, 1) * W, y: rnd(0.08, 0.5) * H, w: rnd(0.4, 0.8) * W, h: rnd(14, 30), sp: rnd(3, 8), a: rnd(0.25, 0.5) })),
          birds: [], next: rnd(1, 3),
        };
      },
      frame(c, s, dt, t) {
        const sy = H * 0.66 + Math.sin(t * 0.1) * 6, R = Math.min(W * 0.2, 80);
        drawGlow(c, glow('rgba(255,200,120,1)', 64), W / 2, sy, R * 3.2, 0.55 + 0.08 * Math.sin(t * 0.8));
        const sg = c.createRadialGradient(W / 2, sy, 0, W / 2, sy, R);
        sg.addColorStop(0, '#fffbe6'); sg.addColorStop(0.7, '#ffe0a0'); sg.addColorStop(1, 'rgba(255,190,120,0)');
        c.globalAlpha = 0.9; c.fillStyle = sg; c.beginPath(); c.arc(W / 2, sy, R, 0, TAU); c.fill();
        for (const cl of s.clouds) {
          cl.x += cl.sp * dt; if (cl.x > W + 20) cl.x = -cl.w - 20;
          c.save(); c.translate(cl.x + cl.w / 2, cl.y); c.scale(cl.w / (cl.h * 2), 1);
          drawGlow(c, glow('rgba(255,236,236,1)', 48), 0, 0, cl.h, cl.a);
          c.restore();
        }
        // Vögel
        s.next -= dt;
        if (s.next <= 0) {
          const n = (rnd(3, 7)) | 0, y0 = rnd(H * 0.12, H * 0.45), dir = Math.random() < 0.7 ? 1 : -1, sp = rnd(30, 48);
          for (let i = 0; i < n; i++) s.birds.push({ x: dir > 0 ? -20 - i * rnd(12, 20) : W + 20 + i * rnd(12, 20), y: y0 + (i % 2 ? 1 : -1) * i * rnd(4, 8), vx: dir * sp * rnd(0.9, 1.1), s: rnd(4, 7), ph: rnd(0, TAU) });
          s.next = rnd(9, 16);
        }
        c.strokeStyle = '#4a2433'; c.lineWidth = 1.4; c.lineCap = 'round'; c.lineJoin = 'round';
        s.birds = s.birds.filter((b) => {
          b.x += b.vx * dt; b.y += Math.sin(t * 1.3 + b.ph) * 4 * dt;
          const flap = Math.sin(t * 7 + b.ph) * b.s * 0.6;
          c.globalAlpha = 0.55;
          c.beginPath(); c.moveTo(b.x - b.s, b.y - flap); c.quadraticCurveTo(b.x - b.s * 0.4, b.y - flap * 0.3, b.x, b.y); c.quadraticCurveTo(b.x + b.s * 0.4, b.y - flap * 0.3, b.x + b.s, b.y - flap); c.stroke();
          return b.x > -60 && b.x < W + 60;
        });
      },
    },

    // ---------- Goldstaub: aufsteigender Glitzer mit Funkeln ----------
    gold: {
      init() {
        return { dust: Array.from({ length: Math.round((W * H) / 3200) }, () => this.speck(true)), beam: rnd(0, TAU) };
      },
      speck(any) { return { x: rnd(0, W), y: any ? rnd(0, H) : H + rnd(2, 30), r: rnd(0.5, 2), sp: rnd(6, 20), ph: rnd(0, TAU), tw: rnd(1, 3), spark: 0 }; },
      frame(c, s, dt, t) {
        // langsam wandernder Lichtkegel
        const bx = W * (0.5 + 0.35 * Math.sin(t * 0.07 + s.beam));
        drawGlow(c, glow('rgba(255,210,130,1)', 64), bx, H * 0.15, W * 0.9, 0.08);
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < s.dust.length; i++) {
          const d = s.dust[i];
          d.y -= d.sp * dt; d.x += Math.sin(t * 0.6 + d.ph) * 6 * dt;
          if (d.y < -5) { s.dust[i] = this.speck(false); continue; }
          if (d.spark <= 0 && Math.random() < dt * 0.05) d.spark = 1;
          const a = 0.35 + 0.45 * Math.sin(t * d.tw + d.ph);
          c.globalAlpha = Math.max(0.1, a); c.fillStyle = '#ffd98a';
          c.beginPath(); c.arc(d.x, d.y, d.r, 0, TAU); c.fill();
          if (d.spark > 0) {
            const L = 9 * d.spark + 3;
            c.globalAlpha = d.spark; c.strokeStyle = '#fff1c9'; c.lineWidth = 1;
            c.beginPath(); c.moveTo(d.x - L, d.y); c.lineTo(d.x + L, d.y); c.moveTo(d.x, d.y - L); c.lineTo(d.x, d.y + L); c.stroke();
            drawGlow(c, glow('rgba(255,220,150,1)', 24), d.x, d.y, 8, d.spark * 0.8);
            d.spark -= dt * 1.6;
          }
        }
        c.globalCompositeOperation = 'source-over';
      },
    },

    // ======== Nur mit WhatsUp Pro ========
    // ---------- Polarlicht: wehende Lichtvorhänge über einer Bergkette ----------
    aurora: {
      init() {
        // senkrechter Farbstreifen, wird für jeden Vorhang-Abschnitt gestreckt (schneller als Verläufe)
        const strip = document.createElement('canvas');
        strip.width = 1; strip.height = 256;
        const g = strip.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
        gr.addColorStop(0, 'rgba(168,85,247,0)'); gr.addColorStop(0.3, 'rgba(168,85,247,.5)');
        gr.addColorStop(0.62, 'rgba(74,222,128,.9)'); gr.addColorStop(1, 'rgba(34,211,238,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 1, 256);
        return {
          strip,
          bands: [0, 1, 2].map((i) => ({ y: H * (0.12 + i * 0.1), len: H * rnd(0.22, 0.34), amp: rnd(18, 40), f1: rnd(0.004, 0.009), f2: rnd(0.011, 0.02), sp: rnd(0.25, 0.5) * (i % 2 ? -1 : 1), a: rnd(0.35, 0.6), ph: rnd(0, TAU) })),
          stars: Array.from({ length: Math.round((W * H) / 2600) }, () => ({ x: rnd(0, W), y: rnd(0, H * 0.8), r: rnd(0.5, 1.4), a: rnd(0.3, 0.9), ph: rnd(0, TAU), tw: rnd(0.8, 2.2) })),
          hills: Array.from({ length: 11 }, () => rnd(0.8, 0.9)),
        };
      },
      frame(c, s, dt, t) {
        c.fillStyle = '#fff';
        for (const p of s.stars) { c.globalAlpha = p.a * (0.55 + 0.45 * Math.sin(t * p.tw + p.ph)); c.fillRect(p.x, p.y, p.r, p.r); }
        c.globalCompositeOperation = 'lighter';
        const step = 4;
        for (const b of s.bands) {
          for (let x = -step; x < W + step; x += step) {
            const y = b.y + Math.sin(x * b.f1 + t * b.sp + b.ph) * b.amp + Math.sin(x * b.f2 - t * b.sp * 1.7) * b.amp * 0.4;
            const flick = 0.55 + 0.45 * Math.sin(x * 0.03 + t * 1.3 + b.ph) * Math.sin(x * 0.011 - t * 0.6);
            c.globalAlpha = b.a * Math.max(0.08, flick);
            c.drawImage(s.strip, x, y, step + 1, b.len * (0.75 + 0.25 * flick));
          }
        }
        c.globalCompositeOperation = 'source-over';
        // Bergkette
        c.globalAlpha = 1; c.fillStyle = '#020a10';
        c.beginPath(); c.moveTo(0, H);
        s.hills.forEach((h, i) => c.lineTo((i / (s.hills.length - 1)) * W, H * h));
        c.lineTo(W, H); c.closePath(); c.fill();
      },
    },

    // ---------- Code-Regen: Zeichen fallen in Spalten, die Spitze leuchtet ----------
    coderain: {
      opacity: 0.85,
      init() {
        const fs = 16;
        return { fs, chars: 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF<>{}=+*'.split(''), cols: Array.from({ length: Math.ceil(W / fs) }, (_, i) => this.col(i, fs, true)) };
      },
      col(i, fs, any) {
        const y = any ? rnd(-H * 0.5, H) : rnd(-H * 0.4, 0);
        return { x: i * fs + fs / 2, y, sp: rnd(70, 170), len: rnd(8, 24) | 0, g: [], row: Math.floor(y / fs) - (any ? 20 : 1), on: Math.random() < 0.75 };
      },
      frame(c, s, dt) {
        const fs = s.fs;
        c.font = `${fs}px "Cascadia Mono", Consolas, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
        for (let i = 0; i < s.cols.length; i++) {
          const k = s.cols[i];
          if (!k.on) { if (Math.random() < dt * 0.2) k.on = true; continue; }
          k.y += k.sp * dt;
          const row = Math.floor(k.y / fs);
          while (k.row < row) { k.row++; k.g.unshift(pick(s.chars)); if (k.g.length > k.len) k.g.pop(); }
          if ((row - k.len) * fs > H) { s.cols[i] = this.col(i, fs, false); continue; }
          for (let j = 0; j < k.g.length; j++) {
            const y = (row - j) * fs + fs / 2;
            if (y < -fs || y > H + fs) continue;
            if (j > 0 && Math.random() < dt * 0.6) k.g[j] = pick(s.chars); // Zeichen flackern
            c.globalAlpha = j === 0 ? 1 : 0.85 * (1 - j / k.len);
            c.fillStyle = j === 0 ? '#eaffea' : '#2bdc5b';
            c.fillText(k.g[j], k.x, y);
          }
        }
      },
    },

    // ---------- Vulkan: glühender Krater, aufsteigende Funken, ab und zu ein Ausbruch ----------
    volcano: {
      init() {
        return {
          embers: Array.from({ length: Math.round((W * H) / 5000) }, () => this.ember(true)),
          bursts: [], next: rnd(2, 5),
          ash: Array.from({ length: Math.round(W / 12) }, () => ({ x: rnd(0, W), y: rnd(0, H), sp: rnd(8, 20), dr: rnd(-6, 6), r: rnd(0.6, 1.6) })),
        };
      },
      ember(any) { return { x: rnd(0, W), y: any ? rnd(0, H) : H + rnd(0, 40), vx: rnd(-8, 8), vy: -rnd(25, 70), r: rnd(0.8, 2.4), life: rnd(4, 9), age: any ? rnd(0, 4) : 0, hue: pick(['255,120,40', '255,170,60', '255,80,30']) }; },
      frame(c, s, dt, t) {
        const cx = W * 0.5, top = H * 0.8;
        const pulse = 0.75 + 0.25 * Math.sin(t * 1.4);
        drawGlow(c, glow('rgba(255,90,30,1)', 64), cx, top, Math.min(W, 600) * 0.6, 0.35 * pulse);
        // Berg mit Lava-Rinnen
        c.globalAlpha = 1; c.fillStyle = '#120403';
        c.beginPath(); c.moveTo(cx - W * 0.75, H); c.lineTo(cx - W * 0.09, top); c.lineTo(cx + W * 0.09, top); c.lineTo(cx + W * 0.75, H); c.closePath(); c.fill();
        c.strokeStyle = `rgba(255,110,40,${(0.45 * pulse).toFixed(3)})`; c.lineWidth = 2;
        c.beginPath();
        c.moveTo(cx - W * 0.03, top); c.quadraticCurveTo(cx - W * 0.06, top + (H - top) * 0.5, cx - W * 0.16, H);
        c.moveTo(cx + W * 0.04, top); c.quadraticCurveTo(cx + W * 0.03, top + (H - top) * 0.6, cx + W * 0.11, H);
        c.stroke();
        // Ausbruch
        s.next -= dt;
        if (s.next <= 0) {
          for (let i = 0; i < 40; i++) {
            const a = rnd(-Math.PI * 0.85, -Math.PI * 0.15), v = rnd(120, 320);
            s.bursts.push({ x: cx + rnd(-W * 0.05, W * 0.05), y: top, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(1.2, 2.4), age: 0, r: rnd(1.2, 3) });
          }
          s.next = rnd(5, 11);
        }
        c.globalCompositeOperation = 'lighter';
        s.bursts = s.bursts.filter((p) => {
          p.age += dt;
          if (p.age > p.life) return false;
          p.vy += 180 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          drawGlow(c, glow('rgba(255,150,50,1)', 16), p.x, p.y, p.r * 4, 1 - p.age / p.life);
          return p.y < H + 10;
        });
        for (let i = 0; i < s.embers.length; i++) {
          const e = s.embers[i];
          e.age += dt; e.x += (e.vx + Math.sin(t + i) * 10) * dt; e.y += e.vy * dt;
          if (e.age > e.life || e.y < -10) { s.embers[i] = this.ember(false); continue; }
          drawGlow(c, glow(`rgba(${e.hue},1)`, 16), e.x, e.y, e.r * 4, Math.min(1, e.age) * (1 - e.age / e.life) * 0.9);
        }
        c.globalCompositeOperation = 'source-over';
        // Asche
        c.fillStyle = '#6b5b55'; c.globalAlpha = 0.35;
        for (const p of s.ash) { p.y += p.sp * dt; p.x += p.dr * dt; if (p.y > H) { p.y = -4; p.x = rnd(0, W); } c.fillRect(p.x, p.y, p.r, p.r); }
      },
    },
  };

  // ======================= Steuerung =======================
  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  }

  function draw(dt, t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    scene.frame(ctx, st, dt, t);
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    // ohne Fokus nur ~20 Bilder/s
    if (!document.hasFocus() && now - lastDraw < 50) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now; lastDraw = now;
    draw(dt, now / 1000);
  }

  function start() {
    cancelAnimationFrame(raf);
    size();
    st = scene.init.call(scene);
    canvas.style.opacity = scene.opacity || 1;
    if (reduce.matches) { draw(0, 0); return; }   // Standbild
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function set(id) {
    const next = SCENES[id] ? id : null;
    if (next === cur) return;
    cur = next;
    cancelAnimationFrame(raf);
    if (!next) {
      if (canvas) { canvas.remove(); canvas = null; ctx = null; }
      delete document.documentElement.dataset.fx;
      return;
    }
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'fxCanvas';
      canvas.setAttribute('aria-hidden', 'true');
      ctx = canvas.getContext('2d');
      document.body.prepend(canvas);
    }
    document.documentElement.dataset.fx = next;
    scene = SCENES[next];
    start();
  }

  let resizeT = 0;
  window.addEventListener('resize', () => { if (!cur) return; clearTimeout(resizeT); resizeT = setTimeout(start, 120); });
  reduce.addEventListener('change', () => { if (cur) start(); });

  // ======================= Vorschau in den Auswahl-Karten =======================
  // Dieselbe Szene, verkleinert. Standbild; läuft live, solange man drüberfährt
  // oder das Design gewählt ist (und die Karte sichtbar ist).
  const ZOOM = 0.6;
  const previews = new Map();   // Karte -> Zustand
  function withSize(p, fn) {
    const a = W, b = H;
    W = p.w / ZOOM; H = p.h / ZOOM;
    try { fn(); } finally { W = a; H = b; }
  }
  function pvDraw(p, dt) {
    const sc = SCENES[p.id];
    p.t += dt;
    withSize(p, () => {
      const c = p.ctx;
      c.setTransform(p.dpr * ZOOM, 0, 0, p.dpr * ZOOM, 0, 0);
      c.clearRect(0, 0, W, H);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      sc.frame(c, p.st, dt, p.t);
    });
  }
  function pvSize(p) {
    const w = p.card.clientWidth, h = p.card.clientHeight;
    if (!w || !h) return false;
    if (w === p.w && h === p.h && p.st) return true;
    const sc = SCENES[p.id];
    p.w = w; p.h = h; p.dpr = Math.min(window.devicePixelRatio || 1, 2);
    p.cv.width = Math.round(w * p.dpr); p.cv.height = Math.round(h * p.dpr);
    p.cv.style.opacity = sc.opacity || 1;
    withSize(p, () => { p.st = sc.init.call(sc); });
    p.t = 0;
    for (let i = 0; i < 70; i++) pvDraw(p, 1 / 30);   // kurz vorlaufen lassen, damit alles verteilt ist
    return true;
  }
  function pvRun(p) {
    const want = p.visible && !reduce.matches && (p.hover || p.card.classList.contains('active'));
    if (want && !p.raf) {
      p.last = performance.now();
      const step = (now) => {
        p.raf = requestAnimationFrame(step);
        const dt = Math.min(0.05, (now - p.last) / 1000); p.last = now;
        pvDraw(p, dt);
      };
      p.raf = requestAnimationFrame(step);
    } else if (!want && p.raf) { cancelAnimationFrame(p.raf); p.raf = 0; }
  }
  const pvIO = new IntersectionObserver((es) => es.forEach((e) => {
    const p = previews.get(e.target); if (!p) return;
    p.visible = e.isIntersecting;
    if (p.visible) pvSize(p);
    pvRun(p);
  }));
  const pvRO = new ResizeObserver((es) => es.forEach((e) => { const p = previews.get(e.target); if (p && p.visible) pvSize(p); }));
  const pvMO = new MutationObserver((ms) => ms.forEach((m) => { const p = previews.get(m.target); if (p) pvRun(p); }));

  function preview(card, id) {
    if (!SCENES[id] || previews.has(card)) return;
    const cv = document.createElement('canvas');
    cv.className = 'dz-canvas';
    cv.setAttribute('aria-hidden', 'true');
    card.prepend(cv);
    const p = { card, cv, ctx: cv.getContext('2d'), id, st: null, w: 0, h: 0, dpr: 1, t: 0, raf: 0, last: 0, hover: false, visible: false };
    previews.set(card, p);
    card.addEventListener('pointerenter', () => { p.hover = true; pvRun(p); });
    card.addEventListener('pointerleave', () => { p.hover = false; pvRun(p); });
    pvIO.observe(card); pvRO.observe(card);
    pvMO.observe(card, { attributes: true, attributeFilter: ['class'] });
  }

  window.ThemeFx = { set, preview, ids: Object.keys(SCENES) };
})();
