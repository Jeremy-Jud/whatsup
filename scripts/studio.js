// WhatsUp Studio: neue Versionen zuerst hier testen, bevor sie veröffentlicht werden.
// Studio ist dasselbe WhatsUp mit violettem Logo, eigenem Test-Konto und eigenen Daten – es läuft neben WhatsUp.
//
//   npm run studio        -> Windows-App bauen und auf diesem PC installieren + Web-Version für das Handy hochladen
//   npm run studio:win    -> nur Windows (dist-studio/, Installation nach %LOCALAPPDATA%\Programs\whatsup-studio)
//   npm run studio:web    -> nur Web (Cloudflare Worker „whatsup-studio“ mit statischen Dateien = Link fürs Handy)
//
// Es wird nichts auf GitHub veröffentlicht und nichts nach main gepusht.
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const what = process.argv[2] || 'all';
if (!['all', 'win', 'web'].includes(what)) { console.error('Aufruf: node scripts/studio.js [all|win|web]'); process.exit(1); }

const WORKER_NAME = 'whatsup-studio';
const INSTALL_DIR = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'whatsup-studio');
const EXE_NAME = 'WhatsUp Studio.exe';

// Kennzeichnung der Test-Version: wann und aus welchem Stand gebaut („+“ = mit noch nicht committeten Änderungen)
const git = (...a) => { try { return execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim(); } catch { return ''; } };
const sha = git('rev-parse', '--short', 'HEAD') || 'ohne Git';
const dirty = git('status', '--porcelain', '--untracked-files=no') ? '+' : '';
const when = new Date().toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
const studioBuild = `${when} · ${sha}${dirty}`;

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: false, ...opts });
  if (r.status !== 0) throw new Error(`${path.basename(cmd)} ${args.join(' ')} ist fehlgeschlagen (Code ${r.status})`);
}

async function buildWindows() {
  // Lehre aus v1.39.2: Mit node_modules als Verknüpfung (Junction) packt electron-builder die
  // Unter-Abhängigkeiten nicht ein und die App stürzt beim Start ab.
  if (fs.lstatSync(path.join(root, 'node_modules')).isSymbolicLink()) {
    throw new Error('node_modules ist eine Verknüpfung. Bitte zuerst "npm ci" ausführen (echte Installation).');
  }
  const builder = require('electron-builder');
  const base = pkg.build;
  const config = {
    ...base,
    appId: 'com.whatsup.studio',
    productName: 'WhatsUp Studio',
    directories: { output: 'dist-studio' },
    // landet in der package.json der App: main.js erkennt daran Studio
    extraMetadata: { name: 'whatsup-studio', productName: 'WhatsUp Studio', studio: true, studioBuild },
    win: { ...base.win, target: ['nsis'], icon: 'build/icon-studio.png' },
    nsis: { ...base.nsis, artifactName: 'WhatsUp-Studio-Setup.exe', shortcutName: 'WhatsUp Studio' },
    publish: null,
  };
  delete config.portable;
  fs.rmSync(path.join(root, 'dist-studio'), { recursive: true, force: true });
  console.log(`\nWhatsUp Studio (Windows) wird gebaut: ${pkg.version} · ${studioBuild}`);
  await builder.build({ targets: builder.Platform.WINDOWS.createTarget(['nsis'], builder.Arch.x64), config, publish: 'never' });

  // Prüfen, ob alle Abhängigkeiten im Paket sind (sonst Absturz beim Start)
  const asar = require('@electron/asar');
  const archive = path.join(root, 'dist-studio', 'win-unpacked', 'resources', 'app.asar');
  const files = new Set(asar.listPackage(archive).map((f) => f.replace(/\\/g, '/')));
  const updaterDeps = Object.keys(require(path.join(root, 'node_modules', 'electron-updater', 'package.json')).dependencies || {});
  const missing = updaterDeps.filter((d) => ![...files].some((f) => f.startsWith(`/node_modules/${d}/`)));
  if (missing.length) throw new Error('Im Paket fehlen Abhängigkeiten: ' + missing.join(', '));

  // Installieren: nur Studio beenden, WhatsUp bleibt unberührt
  spawnSync('taskkill', ['/IM', EXE_NAME, '/F'], { stdio: 'ignore' });
  console.log('WhatsUp Studio wird installiert …');
  run(path.join(root, 'dist-studio', 'WhatsUp-Studio-Setup.exe'), ['/S']);
  const exe = path.join(INSTALL_DIR, EXE_NAME);
  for (let i = 0; i < 60 && !fs.existsSync(exe); i++) await new Promise((r) => setTimeout(r, 500));
  if (!fs.existsSync(exe)) throw new Error('Installation nicht gefunden: ' + exe);
  require('child_process').spawn(exe, [], { detached: true, stdio: 'ignore' }).unref();
  console.log(`WhatsUp Studio ist installiert und gestartet (${exe}).`);
}

// Web-Version als Cloudflare Worker mit statischen Dateien (Cloudflare hat Pages in Workers überführt).
// Eigene Adresse unter workers.dev – getrennt von der echten Web-Version (eigene Daten im Browser).
function buildWeb() {
  const wrangler = path.join(root, 'relay', 'node_modules', 'wrangler', 'bin', 'wrangler.js');
  if (!fs.existsSync(wrangler)) throw new Error('wrangler fehlt. Bitte zuerst "npm ci --prefix relay" ausführen.');
  run(process.execPath, [path.join(root, 'scripts', 'build-web.js'), '--studio'], { env: { ...process.env, STUDIO_BUILD: studioBuild } });
  console.log('WhatsUp Studio (Web) wird hochgeladen …');
  // cwd = Projektordner (ohne wrangler-Konfiguration); relay/wrangler.toml gehört zum Briefkasten und bleibt unberührt
  const d = spawnSync(process.execPath, [wrangler, 'deploy', '--assets', 'dist-web-studio', '--name', WORKER_NAME,
    '--compatibility-date', '2026-11-01', '--message', `Studio ${studioBuild}`], { cwd: root, encoding: 'utf8' });
  process.stdout.write(d.stdout || ''); process.stderr.write(d.stderr || '');
  if (d.status !== 0) throw new Error('Hochladen zu Cloudflare ist fehlgeschlagen. Ist wrangler angemeldet? (npx wrangler login)');
  const url = ((d.stdout || '').match(/https:\/\/[a-z0-9.-]+\.workers\.dev/i) || [])[0];
  console.log(`\nLink fürs Handy: ${url ? url + '/' : '(Adresse siehe oben)'}`);
}

(async () => {
  try {
    if (what === 'all' || what === 'win') await buildWindows();
    if (what === 'all' || what === 'web') buildWeb();
    console.log(`\nWhatsUp Studio ${pkg.version} (${studioBuild}) ist bereit zum Testen.`);
  } catch (e) {
    console.error('\nFehler: ' + (e.message || e));
    process.exit(1);
  }
})();
