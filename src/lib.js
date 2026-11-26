/* WhatsUp – reine Hilfsfunktionen ohne Zugriff auf Oberfläche, Netzwerk oder Speicher.
 * Läuft im Browser (window.WHATSUP_LIB) und in Node.js (require), damit sie getestet werden können:
 *   npm test
 */
(function (root, factory) {
  const lib = factory(root.crypto);
  if (typeof module === 'object' && module.exports) module.exports = lib;
  else root.WHATSUP_LIB = lib;
})(typeof self !== 'undefined' ? self : globalThis, (crypto) => {
  'use strict';

  const te = new TextEncoder();
  const td = new TextDecoder();

  // ---------- Base64 (auch für große Daten, ohne Stack-Überlauf) ----------
  function b64(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function unb64(s) {
    const bin = atob(String(s));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // ---------- Suche ----------
  // Groß/klein und Akzente egal: „Über“ findet „uber“, „Café“ findet „cafe“
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function matchText(text, query) {
    const q = norm(query).trim();
    if (!q) return false;
    const t = norm(text);
    return q.split(/\s+/).every((w) => t.includes(w));
  }

  // ---------- Dateien ----------
  const FILE_PREFIX = 'data:application/octet-stream;base64,';
  // Keine Pfade, keine verbotenen Windows-Zeichen, nicht zu lang, Endung bleibt erhalten
  function safeFileName(name) {
    let n = String(name || '').replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '_').replace(/^[\s.]+|[\s.]+$/g, '').replace(/\s+/g, ' ');
    if (!n) n = 'Datei';
    if (/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(n)) n = '_' + n;
    if (n.length > 120) {
      const dot = n.lastIndexOf('.');
      const ext = dot > 0 && n.length - dot <= 12 ? n.slice(dot) : '';
      n = n.slice(0, 120 - ext.length) + ext;
    }
    return n;
  }
  const extOf = (name) => { const m = /\.([a-z0-9]{1,10})$/i.exec(String(name || '')); return m ? m[1].toLowerCase() : ''; };
  // Dateien, die beim Öffnen Programme ausführen können: vor dem Speichern warnen
  const RISKY = new Set(['exe', 'msi', 'msix', 'appx', 'bat', 'cmd', 'com', 'scr', 'pif', 'cpl', 'dll', 'ps1', 'psm1', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh', 'hta', 'jar', 'lnk', 'reg', 'inf', 'url', 'iso', 'img', 'vhd', 'vhdx', 'msc', 'sh', 'app', 'dmg', 'pkg', 'apk', 'docm', 'xlsm', 'pptm']);
  const isRiskyFile = (name) => RISKY.has(extOf(name));
  function fileIcon(name) {
    const e = extOf(name);
    if (['pdf'].includes(e)) return '📕';
    if (['doc', 'docx', 'odt', 'rtf', 'txt', 'md'].includes(e)) return '📝';
    if (['xls', 'xlsx', 'ods', 'csv'].includes(e)) return '📊';
    if (['ppt', 'pptx', 'odp', 'key'].includes(e)) return '📽️';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(e)) return '🗜️';
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(e)) return '🎵';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(e)) return '🎬';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'heic'].includes(e)) return '🖼️';
    if (RISKY.has(e)) return '⚙️';
    return '📄';
  }
  // Beliebige Daten-URL in eine neutrale umwandeln (wird nie als Bild/HTML o. Ä. geöffnet)
  function toFileDataUrl(dataUrl) {
    const i = String(dataUrl).indexOf(';base64,');
    if (!String(dataUrl).startsWith('data:') || i < 0) return null;
    return FILE_PREFIX + String(dataUrl).slice(i + 8);
  }
  // Ungefähre Größe der Datei aus der Länge der Base64-Daten
  const dataUrlBytes = (d) => { const s = String(d); const i = s.indexOf(','); const n = s.length - i - 1; return Math.max(0, Math.floor(n * 3 / 4) - (s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0)); };

  // ---------- Verschwindende Nachrichten ----------
  const TIMER_OPTS = [0, 24 * 3600, 7 * 24 * 3600, 90 * 24 * 3600];
  const validTimer = (s) => { const n = Number(s); return TIMER_OPTS.includes(n) ? n : null; };
  const timerLabel = (s) => (s === 24 * 3600 ? '24 Stunden' : s === 7 * 24 * 3600 ? '7 Tage' : s === 90 * 24 * 3600 ? '90 Tage' : 'Aus');
  const timerShort = (s) => (s === 24 * 3600 ? '24 h' : s === 7 * 24 * 3600 ? '7 T' : s === 90 * 24 * 3600 ? '90 T' : '');
  const isExpired = (m, now) => !!(m && m.exp && m.ts && m.ts + m.exp * 1000 <= now);

  // ---------- Sicherheitsnummer (wie bei Signal) ----------
  // Beide Geräte berechnen aus beiden öffentlichen Schlüsseln dieselben 60 Ziffern.
  // Stimmen sie überein, sitzt niemand zwischen euch.
  async function fingerprint(code, keys) {
    const input = te.encode(`whatsup-fp-v1|${code}|${keys.sign.x}.${keys.sign.y}|${keys.enc.x}.${keys.enc.y}`);
    let h = new Uint8Array(await crypto.subtle.digest('SHA-256', input));
    for (let i = 0; i < 1024; i++) {
      const buf = new Uint8Array(h.length + input.length);
      buf.set(h); buf.set(input, h.length);
      h = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
    }
    let digits = '';
    for (let i = 0; i < 30; i += 5) {
      const n = h[i] * 2 ** 32 + h[i + 1] * 2 ** 24 + h[i + 2] * 2 ** 16 + h[i + 3] * 2 ** 8 + h[i + 4];
      digits += String(n % 100000).padStart(5, '0');
    }
    return digits;
  }
  async function safetyNumber(codeA, keysA, codeB, keysB) {
    if (!keysA || !keysB || !keysA.sign || !keysA.enc || !keysB.sign || !keysB.enc) return null;
    const a = await fingerprint(codeA, keysA), b = await fingerprint(codeB, keysB);
    return codeA < codeB ? a + b : b + a;
  }
  const groupDigits = (s) => (String(s).match(/.{1,5}/g) || []);

  // ---------- Verschlüsselter Speicher (Chats und Bilder auf dem Gerät) ----------
  const isSealed = (v) => !!(v && typeof v === 'object' && v.__enc === 1 && v.iv && v.ct);
  async function sealValue(key, value) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(value)));
    return { __enc: 1, iv, ct: new Uint8Array(ct) };
  }
  async function openValue(key, sealed) {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: sealed.iv }, key, sealed.ct);
    return JSON.parse(td.decode(pt));
  }

  // ---------- Backup-Datei (mit Passwort verschlüsselt) ----------
  const BACKUP_ITER = 310000;
  async function passwordKey(password, salt, iter) {
    const base = await crypto.subtle.importKey('raw', te.encode(String(password)), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encryptBackup(payload, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await passwordKey(password, salt, BACKUP_ITER);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(payload)));
    return JSON.stringify({ app: 'whatsup-backup', v: 1, kdf: 'PBKDF2-SHA256', iter: BACKUP_ITER, salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(ct)) });
  }
  // Fehler: 'format' (keine WhatsUp-Backupdatei) oder 'password' (falsches Passwort / beschädigt)
  async function decryptBackup(text, password) {
    let f;
    try { f = JSON.parse(text); } catch { throw new Error('format'); }
    if (!f || f.app !== 'whatsup-backup' || f.v !== 1 || typeof f.data !== 'string') throw new Error('format');
    const iter = Number(f.iter);
    if (!Number.isInteger(iter) || iter < 100000 || iter > 5000000) throw new Error('format');
    const key = await passwordKey(password, unb64(f.salt), iter);
    let pt;
    try { pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(f.iv) }, key, unb64(f.data)); }
    catch { throw new Error('password'); }
    return JSON.parse(td.decode(pt));
  }

  // ---------- Verbindungs-Lebenszeichen (Heartbeat) ----------
  // Eine Chat-Verbindung kann „offen“ wirken, obwohl sie tot ist (z. B. iPhone im Hintergrund,
  // Netzwechsel). Gegenstellen, die Pings beantworten (hb), gelten nur als online, solange in den
  // letzten staleMs etwas von ihnen kam. Ältere Versionen ohne Heartbeat: wie bisher nur „offen“.
  // c = { open, hb, rx (letzter Empfang), ping (erster unbeantworteter Ping) }
  const HB_MS = 8000;      // so oft wird gepingt
  const STALE_MS = 25000;  // so lange ohne Lebenszeichen = nicht mehr online
  const PROBE_MS = 5000;   // so lange hat ein Ping Zeit für die Antwort, bevor die Verbindung ersetzt wird
  function connAlive(c, now, staleMs = STALE_MS) {
    if (!c || !c.open) return false;
    if (!c.hb) return true;
    return now - (Number(c.rx) || 0) <= staleMs;
  }
  // Tot = geschlossen, oder Heartbeat-fähig, zu lange still und ein Ping seit probeMs unbeantwortet
  function connDead(c, now, staleMs = STALE_MS, probeMs = PROBE_MS) {
    if (!c || !c.open) return true;
    if (!c.hb || connAlive(c, now, staleMs)) return false;
    return !!c.ping && now - c.ping >= probeMs;
  }
  // Nach so langer Zeit im Hintergrund ist die Verbindung zum Signal-Server oft schon still gestorben
  // (iOS friert die Seite ein, der WebSocket wirkt danach noch offen, kommt aber nie mehr an)
  const WAKE_RECONNECT_MS = 10000;
  const needsSignalReconnect = (hiddenMs, socketOpen) => !socketOpen || hiddenMs >= WAKE_RECONNECT_MS;

  // Promise mit Zeitlimit: hängt etwas (z. B. ein Abruf, der im Hintergrund eingefroren wurde),
  // geht es nach ms mit fallback weiter, statt alles Folgende zu blockieren
  function withTimeout(promise, ms, fallback) {
    let t;
    return Promise.race([
      Promise.resolve(promise).finally(() => clearTimeout(t)),
      new Promise((resolve) => { t = setTimeout(() => resolve(fallback), ms); }),
    ]);
  }

  return {
    HB_MS, STALE_MS, PROBE_MS, connAlive, connDead, needsSignalReconnect, withTimeout,
    b64, unb64, matchText, norm,
    FILE_PREFIX, safeFileName, extOf, isRiskyFile, fileIcon, toFileDataUrl, dataUrlBytes,
    TIMER_OPTS, validTimer, timerLabel, timerShort, isExpired,
    safetyNumber, groupDigits,
    isSealed, sealValue, openValue,
    encryptBackup, decryptBackup,
  };
});
