// Schutz für den Handy-Link von WhatsUp Studio: Nur wer das Passwort kennt, kommt hinein.
// Nach dem Anmelden bleibt das Gerät ein Jahr angemeldet (Cookie). Auf dem iPhone braucht die App auf dem
// Home-Bildschirm eine eigene Anmeldung (sie hat einen eigenen Speicher).
//
// Passwort setzen oder ändern (ändern meldet alle Geräte ab):
//   npx wrangler secret put STUDIO_PASSWORD --name whatsup-studio      (im Ordner relay/)
// Ohne Passwort ist Studio komplett gesperrt.
const COOKIE = 'studio_auth';
const YEAR = 365 * 24 * 3600;
// Ohne Anmeldung erreichbar: nur, was das Handy für Symbol und Hintergrund-Dienst braucht (nichts Geheimes)
const PUBLIC = new Set(['/sw.js', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/robots.txt']);
const enc = new TextEncoder();

// Anmelde-Cookie = HMAC mit dem Passwort als Schlüssel: nichts zu speichern, ein neues Passwort macht alte Cookies ungültig
async function tokenFor(password) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('whatsup-studio-v1'));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
// Vergleich in konstanter Zeit
function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const cookieOf = (req) => ((req.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})`)) || [])[1] || '';

const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
};

function page(message, status, locked) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const form = locked ? '' : `
    <form method="post" action="/__login">
      <input type="password" name="pw" placeholder="Passwort" autocomplete="current-password" autofocus required>
      <button type="submit">Öffnen</button>
    </form>`;
  return new Response(`<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Studio">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<title>WhatsUp Studio</title>
<style>
  :root { color-scheme: light dark; --bg: #ffffff; --fg: #111114; --muted: #6b6b76; --field: #f1f1f4; --accent: #8c1aff; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0e0e10; --fg: #f4f4f6; --muted: #9a9aa6; --field: #1d1d22; } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--fg);
    font: 16px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px 16px; }
  main { width: 100%; max-width: 320px; text-align: center; }
  img { width: 88px; height: 88px; border-radius: 22px; }
  h1 { font-size: 22px; margin: 14px 0 6px; }
  p { color: var(--muted); margin: 0 0 18px; }
  .err { color: #e5484d; }
  input, button { width: 100%; font: inherit; border-radius: 12px; border: 0; padding: 13px 14px; }
  input { background: var(--field); color: var(--fg); margin-bottom: 10px; outline: 2px solid transparent; }
  input:focus { outline-color: var(--accent); }
  button { background: var(--accent); color: #fff; font-weight: 600; cursor: pointer; }
</style></head>
<body><main>
  <img src="/apple-touch-icon.png" alt="">
  <h1>WhatsUp Studio</h1>
  <p class="${status === 401 && message ? 'err' : ''}">${esc(message || 'Test-Version – nur mit Passwort.')}</p>${form}
</main></body></html>`, { status, headers: HEADERS });
}

async function serveAsset(req, env) {
  const res = await env.ASSETS.fetch(req);
  const h = new Headers(res.headers);
  h.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (PUBLIC.has(url.pathname)) return serveAsset(req, env);
    const secret = typeof env.STUDIO_PASSWORD === 'string' ? env.STUDIO_PASSWORD : '';
    if (!secret) return page('Gesperrt: Es ist noch kein Passwort eingerichtet.', 503, true);
    const good = await tokenFor(secret);

    if (url.pathname === '/__login' && req.method === 'POST') {
      const form = await req.formData().catch(() => null);
      const pw = form ? String(form.get('pw') || '').slice(0, 200) : '';
      if (pw && same(await tokenFor(pw), good)) {
        return new Response(null, {
          status: 303,
          headers: { Location: '/', 'Cache-Control': 'no-store', 'Set-Cookie': `${COOKIE}=${good}; Path=/; Max-Age=${YEAR}; HttpOnly; Secure; SameSite=Lax` },
        });
      }
      await new Promise((r) => setTimeout(r, 1000)); // Raten bremsen
      return page('Falsches Passwort.', 401);
    }

    if (!same(cookieOf(req), good)) return page('', 401);
    if (url.pathname === '/__logout') {
      return new Response(null, { status: 303, headers: { Location: '/', 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
    }
    return serveAsset(req, env);
  },
};
