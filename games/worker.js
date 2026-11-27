// WhatsUp-Spieleserver (Cloudflare Worker + Durable Object): Kritzelpost für Gruppen.
//
// Jedes Spiel ist ein eigener Raum (Durable Object „GameRoom“) mit Live-Verbindungen (WebSocket).
// Der Server steuert Runden und Timer und verteilt die Beiträge. Inhalte sind Ende-zu-Ende verschlüsselt:
// Den Schlüssel kennen nur die Gruppenmitglieder (er steckt in der verschlüsselten Gruppen-Nachricht).
// Der Server sieht nur, wer mitspielt und wer wann dran ist – und gibt die Urheber erst am Ende heraus.
//
// Wer mitspielt, beweist seinen WhatsUp-Code mit einer Signatur (öffentlicher Schlüssel vom Briefkasten-Server)
// und das Beitrittsgeheimnis aus der Gruppen-Nachricht (der Server kennt nur dessen Hash).
//
//   POST /v1/kp/new            Raum anlegen  { code, ts, sig, joinHash, timer }  ->  { room }
//   GET  /v1/kp/<room>/ws      Live-Verbindung (WebSocket)
import { MIN_PLAYERS, MAX_PLAYERS, GRACE_MS, TIMERS, kindOf, chainOf, secondsFor, shuffle } from './logic.js';

const CODE_RE = /^[A-Z0-9]{6}$/;
const ROOM_RE = /^[0-9a-f]{64}$/;
const HASH_RE = /^[0-9a-f]{64}$/;
const CLOCK_SKEW = 10 * 60 * 1000;
const MAX_TEXT = 4000;            // verschlüsselter Satz (Base64)
const MAX_IMG = 900 * 1024;       // verschlüsselte Zeichnung (Base64)
const LOBBY_MS = 24 * 3600 * 1000; // so lange darf eine Lobby offen sein
const KEEP_MS = 7 * 24 * 3600 * 1000; // so lange bleiben die Ergebnisse abrufbar
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
const te = new TextEncoder();
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const fromB64u = (s) => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return fromB64(s); };
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const freshTs = (ts) => Number.isFinite(ts) && Math.abs(Date.now() - ts) < CLOCK_SKEW;

// Öffentlicher Signaturschlüssel eines Codes (vom Briefkasten-Server, kurz zwischengespeichert)
async function signKeyOf(env, code, cache) {
  const hit = cache && cache.get(code);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.key;
  const r = await fetch(`${env.RELAY_URL}/v1/keys/${code}`).catch(() => null);
  if (!r || !r.ok) return null;
  const k = (await r.json().catch(() => ({}))).sign;
  if (!k || typeof k.x !== 'string' || typeof k.y !== 'string') return null;
  if (cache) cache.set(code, { key: k, at: Date.now() });
  return k;
}
async function signedBy(env, code, text, sig, cache) {
  if (!CODE_RE.test(code) || typeof sig !== 'string' || sig.length > 200) return false;
  try {
    const k = await signKeyOf(env, code, cache);
    if (!k) return false;
    const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: k.x, y: k.y, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, fromB64u(sig), te.encode(text));
  } catch { return false; }
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const p = new URL(req.url).pathname.split('/').filter(Boolean);
    if (p[0] !== 'v1' || p[1] !== 'kp') return json({ error: 'not found' }, 404);
    if (p[2] === 'health') return json({ ok: true });

    if (p[2] === 'new' && req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      const code = String(b.code || '').toUpperCase(), ts = Number(b.ts);
      const timer = Object.hasOwn(TIMERS, b.timer) ? b.timer : 'normal';
      if (!CODE_RE.test(code) || !freshTs(ts) || !HASH_RE.test(String(b.joinHash || ''))) return json({ error: 'bad request' }, 400);
      if (!(await signedBy(env, code, `kpnew|${code}|${ts}|${b.joinHash}|${timer}`, b.sig))) return json({ error: 'forbidden' }, 403);
      const id = env.GAMES.newUniqueId();
      const r = await env.GAMES.get(id).fetch('https://room/init', { method: 'POST', body: JSON.stringify({ creator: code, joinHash: b.joinHash, timer }) });
      if (!r.ok) return json({ error: 'init failed' }, 500);
      return json({ room: id.toString() });
    }

    if (ROOM_RE.test(p[2] || '') && p[3] === 'ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'websocket expected' }, 426);
      let id;
      try { id = env.GAMES.idFromString(p[2]); } catch { return json({ error: 'not found' }, 404); }
      return env.GAMES.get(id).fetch(req);
    }
    return json({ error: 'not found' }, 404);
  },
};

export class GameRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.m = null;          // Spielstand (wird nach dem Ruhezustand aus dem Speicher geladen)
    this.keys = new Map();  // Signaturschlüssel-Cache
  }
  async meta() {
    if (!this.m) this.m = (await this.ctx.storage.get('meta')) || null;
    return this.m;
  }
  async save() { await this.ctx.storage.put('meta', this.m); }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/init' && req.method === 'POST') {
      if (await this.meta()) return new Response('exists', { status: 409 });
      const b = await req.json();
      this.m = { creator: b.creator, joinHash: b.joinHash, timer: b.timer, phase: 'lobby', lobby: [b.creator], order: [], round: 0, deadline: 0, done: {}, created: Date.now(), expires: Date.now() + LOBBY_MS };
      await this.save();
      await this.ctx.storage.setAlarm(this.m.expires);
      return new Response('ok');
    }
    if (req.headers.get('Upgrade') === 'websocket') {
      if (!(await this.meta())) return new Response('not found', { status: 404 });
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    return new Response('not found', { status: 404 });
  }

  send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch {} }
  codeOf(ws) { try { const a = ws.deserializeAttachment(); return a && a.code; } catch { return null; } }
  sockets() { return this.ctx.getWebSockets().filter((ws) => this.codeOf(ws)); }

  async webSocketMessage(ws, raw) {
    let d;
    try { d = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)); } catch { return; }
    if (!d || typeof d !== 'object') return;
    const m = await this.meta();
    if (!m) { this.send(ws, { t: 'gone' }); ws.close(1000, 'gone'); return; }
    if (d.t === 'ping') { this.send(ws, { t: 'pong', now: Date.now() }); return; }
    if (d.t === 'hello') { await this.hello(ws, d); return; }
    const code = this.codeOf(ws);
    if (!code) return; // erst anmelden
    if (d.t === 'join') await this.join(code);
    else if (d.t === 'leave') await this.leave(code);
    else if (d.t === 'start') await this.start(code);
    else if (d.t === 'cancel') await this.cancel(code);
    else if (d.t === 'submit') await this.submit(ws, code, d);
  }
  async webSocketClose() {}
  async webSocketError() {}

  async hello(ws, d) {
    const m = this.m, code = String(d.code || '').toUpperCase(), ts = Number(d.ts);
    const deny = (e) => { this.send(ws, { t: 'error', e }); ws.close(1008, e); };
    if (!CODE_RE.test(code) || !freshTs(ts) || typeof d.join !== 'string' || d.join.length > 100) return deny('auth');
    let h;
    try { h = hex(await crypto.subtle.digest('SHA-256', fromB64(d.join))); } catch { return deny('auth'); }
    if (h !== m.joinHash) return deny('auth');
    if (!(await signedBy(this.env, code, `kp|${code}|${this.ctx.id.toString()}|${ts}`, d.sig, this.keys))) return deny('auth');
    ws.serializeAttachment({ code });
    this.send(ws, this.stateFor(code));
    if (m.phase === 'play') await this.sendTask(ws, code);
    if (m.phase === 'done') await this.sendResults(ws);
  }

  stateFor(code) {
    const m = this.m;
    const s = {
      t: 'state', phase: m.phase, creator: m.creator, timer: m.timer, now: Date.now(),
      players: m.phase === 'lobby' || m.phase === 'closed' ? m.lobby : m.order,
      round: m.round, rounds: m.order.length, deadline: m.deadline,
    };
    if (m.phase === 'play') {
      const done = m.done[m.round] || [];
      s.kind = kindOf(m.round);
      s.submitted = done.length;
      s.mine = done.includes(code);
      s.playing = m.order.includes(code);
    }
    return s;
  }
  broadcast() { for (const ws of this.sockets()) this.send(ws, this.stateFor(this.codeOf(ws))); }

  // Aufgabe dieser Runde: was der Vorgänger in der Kette gemacht hat (ohne Urheber)
  async sendTask(ws, code) {
    const m = this.m, i = m.order.indexOf(code);
    if (m.phase !== 'play' || i < 0) return;
    const n = m.order.length, chain = chainOf(i, m.round, n);
    let prompt = null;
    if (m.round > 0) {
      const it = await this.ctx.storage.get(`i:${chain}:${m.round - 1}`);
      prompt = it ? { k: it.k, d: it.d || '' } : { k: 'none', d: '' };
    }
    this.send(ws, { t: 'task', round: m.round, kind: kindOf(m.round), prompt });
  }
  async broadcastTasks() { for (const ws of this.sockets()) await this.sendTask(ws, this.codeOf(ws)); }

  async join(code) {
    const m = this.m;
    if (m.phase !== 'lobby' || m.lobby.includes(code) || m.lobby.length >= MAX_PLAYERS) return;
    m.lobby.push(code);
    await this.save();
    this.broadcast();
  }
  async leave(code) {
    const m = this.m;
    if (m.phase !== 'lobby' || code === m.creator || !m.lobby.includes(code)) return;
    m.lobby = m.lobby.filter((c) => c !== code);
    await this.save();
    this.broadcast();
  }
  async cancel(code) {
    const m = this.m;
    if (m.phase !== 'lobby' || code !== m.creator) return;
    m.phase = 'closed';
    m.expires = Date.now() + 3600 * 1000;
    await this.save();
    await this.ctx.storage.setAlarm(m.expires);
    this.broadcast();
  }
  async start(code) {
    const m = this.m;
    if (m.phase !== 'lobby' || code !== m.creator || m.lobby.length < MIN_PLAYERS) return;
    m.order = shuffle(m.lobby);
    m.phase = 'play';
    m.round = 0;
    m.done = {};
    m.deadline = Date.now() + secondsFor(0, m.timer) * 1000;
    await this.save();
    await this.ctx.storage.setAlarm(m.deadline + GRACE_MS);
    this.broadcast();
    await this.broadcastTasks();
  }

  async submit(ws, code, d) {
    const m = this.m;
    const round = Number(d.round), i = m.order.indexOf(code);
    if (m.phase !== 'play' || round !== m.round || i < 0) return;
    const done = (m.done[round] = m.done[round] || []);
    if (done.includes(code)) return;
    const kind = kindOf(round), k = kind === 'draw' ? 'img' : 'text';
    const data = typeof d.d === 'string' ? d.d : '';
    if (d.k !== k || data.length > (k === 'img' ? MAX_IMG : MAX_TEXT)) { this.send(ws, { t: 'error', e: 'zu gross' }); return; }
    const chain = chainOf(i, round, m.order.length);
    await this.ctx.storage.put(`i:${chain}:${round}`, { by: code, k, d: data, at: Date.now(), ...(data ? {} : { missing: true }) });
    done.push(code);
    if (done.length >= m.order.length) await this.advance();
    else { await this.save(); this.broadcast(); }
  }

  // Runde beenden: Fehlende Beiträge als leer eintragen, dann nächste Runde oder Ende
  async advance() {
    const m = this.m, n = m.order.length, done = m.done[m.round] || [];
    const puts = {};
    m.order.forEach((code, i) => {
      if (done.includes(code)) return;
      const kind = kindOf(m.round);
      puts[`i:${chainOf(i, m.round, n)}:${m.round}`] = { by: code, k: kind === 'draw' ? 'img' : 'text', d: '', missing: true, at: Date.now() };
    });
    if (Object.keys(puts).length) await this.ctx.storage.put(puts);
    m.round++;
    if (m.round >= n) {
      m.phase = 'done';
      m.deadline = 0;
      m.expires = Date.now() + KEEP_MS;
      await this.save();
      await this.ctx.storage.setAlarm(m.expires);
      this.broadcast();
      for (const ws of this.sockets()) await this.sendResults(ws);
      return;
    }
    m.deadline = Date.now() + secondsFor(m.round, m.timer) * 1000;
    await this.save();
    await this.ctx.storage.setAlarm(m.deadline + GRACE_MS);
    this.broadcast();
    await this.broadcastTasks();
  }

  // Ergebnis: alle Ketten mit Urhebern, ein Beitrag pro Nachricht (Zeichnungen sind gross)
  async sendResults(ws) {
    const m = this.m, n = m.order.length;
    for (let c = 0; c < n; c++) {
      const keys = [];
      for (let r = 0; r < n; r++) keys.push(`i:${c}:${r}`);
      const items = await this.ctx.storage.get(keys);
      for (let r = 0; r < n; r++) {
        const it = items.get(`i:${c}:${r}`) || { by: null, k: kindOf(r) === 'draw' ? 'img' : 'text', d: '', missing: true };
        this.send(ws, { t: 'item', c, r, by: it.by, k: it.k, d: it.d || '', missing: !!it.missing });
      }
    }
    this.send(ws, { t: 'results', n, order: m.order });
  }

  async alarm() {
    const m = await this.meta();
    if (!m) return;
    const now = Date.now();
    if (m.phase === 'play') {
      if (now >= m.deadline + GRACE_MS - 100) await this.advance();
      else await this.ctx.storage.setAlarm(m.deadline + GRACE_MS);
      return;
    }
    if (now >= (m.expires || 0)) {
      for (const ws of this.ctx.getWebSockets()) { try { ws.close(1000, 'gone'); } catch {} }
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
      this.m = null;
    } else await this.ctx.storage.setAlarm(m.expires);
  }
}
