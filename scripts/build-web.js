// Baut die Web-Version (iPhone/iPad/Browser) nach dist-web/.
// Nutzt dieselben Dateien aus src/ wie die Windows-App und ergänzt nur, was im Browser fehlt.
//   npm run build:web
//   node scripts/build-web.js --studio   -> Test-Version „WhatsUp Studio“ nach dist-web-studio/ (violettes Logo,
//                                           eigene Adresse, nicht für Suchmaschinen; siehe scripts/studio.js)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const STUDIO = process.argv.includes('--studio');
const out = path.join(root, STUDIO ? 'dist-web-studio' : 'dist-web');
const pkgVersion = require(path.join(root, 'package.json')).version;
// Studio: jede Test-Version bekommt eine eigene Nummer, damit Safari und der Service Worker sie sicher neu laden
const stamp = new Date().toISOString().replace(/\D/g, '').slice(2, 14); // JJMMTThhmmss (UTC)
const version = STUDIO ? `${pkgVersion}-studio.${stamp}` : pkgVersion;
const studioBuild = STUDIO ? (process.env.STUDIO_BUILD || stamp) : null;

const peerjs = path.join(root, 'node_modules', 'peerjs', 'dist', 'peerjs.min.js');
if (!fs.existsSync(peerjs)) {
  console.error('peerjs fehlt. Bitte zuerst "npm install" ausführen.');
  process.exit(1);
}

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, 'src'), out, { recursive: true });
fs.copyFileSync(peerjs, path.join(out, 'peerjs.min.js'));
fs.copyFileSync(path.join(root, 'web', 'web.css'), path.join(out, 'web.css'));
fs.copyFileSync(path.join(root, 'web', 'manifest.webmanifest'), path.join(out, 'manifest.webmanifest'));
// Musik für UpReels (CC BY 4.0, siehe web/music/CREDITS.md) – auch die Windows-App lädt sie von hier
fs.cpSync(path.join(root, 'web', 'music'), path.join(out, 'music'), { recursive: true });
const iconDir = STUDIO ? 'icons-studio' : 'icons';
for (const f of fs.readdirSync(path.join(root, 'web', iconDir))) {
  fs.copyFileSync(path.join(root, 'web', iconDir, f), path.join(out, f));
}
if (STUDIO) {
  // Studio: überall das violette Logo, eigener Name auf dem Home-Bildschirm
  fs.copyFileSync(path.join(root, 'src', 'assets', 'logo-studio.png'), path.join(out, 'assets', 'logo.png'));
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.webmanifest'), 'utf8'));
  Object.assign(manifest, { name: 'WhatsUp Studio', short_name: 'Studio', description: 'Test-Version von WhatsUp', theme_color: '#8c1aff' });
  fs.writeFileSync(path.join(out, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
}
const withVersion = (f) => fs.readFileSync(path.join(root, 'web', f), 'utf8').replaceAll('__VERSION__', version);
fs.writeFileSync(path.join(out, 'shim.js'), withVersion('shim.js'));
fs.writeFileSync(path.join(out, 'sw.js'), withVersion('sw.js'));

let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
const replace = (from, to) => {
  if (!html.includes(from)) throw new Error('Nicht gefunden in index.html: ' + from);
  html = html.replace(from, to);
};

replace('<meta charset="utf-8">', `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="${STUDIO ? 'Studio' : 'WhatsUp'}">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0e0e10" media="(prefers-color-scheme: dark)">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">
  <link rel="icon" type="image/png" href="icon-192.png">`);
replace('<link rel="stylesheet" href="style.css">', '<link rel="stylesheet" href="style.css">\n  <link rel="stylesheet" href="web.css">');
// Studio-Kennzeichen als eigene Datei: die Content-Security-Policy erlaubt nur Skripte aus eigenen Dateien
if (STUDIO) fs.writeFileSync(path.join(out, 'studio.js'), `window.WHATSUP_STUDIO = ${JSON.stringify({ build: studioBuild })};\n`);
replace('<script src="../node_modules/peerjs/dist/peerjs.min.js"></script>',
  (STUDIO ? '<script src="studio.js"></script>\n  ' : '') +
  '<script src="shim.js"></script>\n  <script src="peerjs.min.js"></script>');
replace('<div class="group" id="infoGroup">', '<div class="group" id="infoGroup">\n        <div class="setting"><span class="muted" id="webInfo"></span></div>');

if (STUDIO) {
  // Test-Version: nicht in Suchmaschinen, keine Infoseite und keine Sitemap
  replace('<title>WhatsUp</title>', '<title>WhatsUp Studio</title>\n  <meta name="robots" content="noindex, nofollow">');
  html = html.replace(/(href|src)="(?!https?:|data:|#)([^"?]+\.(?:css|js))"/g, `$1="$2?v=${version}"`);
  fs.writeFileSync(path.join(out, 'index.html'), html);
  fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  console.log(`WhatsUp Studio (Web) ${version} gebaut: ${path.relative(root, out)}/`);
  process.exit(0);
}

// ---- Für Suchmaschinen und Link-Vorschauen (Google, WhatsApp, Discord, LinkedIn …) ----
const SITE = 'https://jeremy-jud.github.io/whatsup/';
const DESC = 'WhatsUp: kostenlose Chat-App ohne Konto. Freunde per Code hinzufügen, Gruppenchats, Umfragen, Anrufe, UpReels mit Musik, Erfolge und Ranglisten – im Browser, auf dem iPhone und für Windows.';
replace('<title>WhatsUp</title>', `<title>WhatsUp – Chat-App ohne Konto (Web-Version)</title>
  <meta name="description" content="${DESC}">
  <meta name="author" content="Jeremy Jud">
  <link rel="canonical" href="${SITE}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="WhatsUp">
  <meta property="og:title" content="WhatsUp – Chat-App ohne Konto">
  <meta property="og:description" content="Freunde per Code hinzufügen und direkt chatten. Kostenlos im Browser, auf dem iPhone und für Windows.">
  <meta property="og:url" content="${SITE}">
  <meta property="og:image" content="${SITE}about/og.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${SITE}about/og.jpg">`);
// Text und Link für Suchmaschinen, auch ohne JavaScript lesbar (für Menschen unsichtbar, die App deckt ihn ab)
replace('<body>', `<body>
  <div class="seo-intro">
    <h1>WhatsUp – Chat-App ohne Konto</h1>
    <p>${DESC}</p>
    <p><a href="about/">Mehr über WhatsUp, Screenshots und Download für Windows</a> · Entwickelt von Jeremy Jud</p>
  </div>
  <noscript><p>WhatsUp braucht JavaScript. <a href="about/">Hier gibt es Infos und den Download für Windows.</a></p></noscript>`);

// Versionsnummer an alle eigenen Dateien hängen, damit Safari nach einem Update
// nicht neue index.html mit alter style.css/app.js aus dem Zwischenspeicher mischt
html = html.replace(/(href|src)="(?!https?:|data:|#)([^"?]+\.(?:css|js))"/g, `$1="$2?v=${version}"`);

fs.writeFileSync(path.join(out, 'index.html'), html);
fs.writeFileSync(path.join(out, '.nojekyll'), '');

// Infoseite (Beschreibung, Screenshots, Download) und Sitemap für die Google Search Console
fs.cpSync(path.join(root, 'web', 'about'), path.join(out, 'about'), { recursive: true });
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}about/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>
  <url><loc>${SITE}</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>
</urlset>
`);
// Bestätigungsdatei der Google Search Console (falls vorhanden: web/google*.html)
for (const f of fs.readdirSync(path.join(root, 'web')).filter((n) => /^google[0-9a-f]+\.html$/.test(n))) {
  fs.copyFileSync(path.join(root, 'web', f), path.join(out, f));
}
console.log(`Web-Version ${version} gebaut: ${path.relative(root, out)}/`);
