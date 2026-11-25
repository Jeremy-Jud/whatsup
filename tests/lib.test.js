// Tests für src/lib.js – ausführen mit: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../src/lib.js');

const KEY_A = { sign: { x: 'ax1', y: 'ay1' }, enc: { x: 'ax2', y: 'ay2' } };
const KEY_B = { sign: { x: 'bx1', y: 'by1' }, enc: { x: 'bx2', y: 'by2' } };

test('Suche: groß/klein, Umlaute/Akzente und mehrere Wörter', () => {
  assert.equal(lib.matchText('Treffen im Café um 5', 'cafe'), true);
  assert.equal(lib.matchText('Über den Wolken', 'uber'), true);
  assert.equal(lib.matchText('Wir sehen uns MORGEN', 'morgen sehen'), true);
  assert.equal(lib.matchText('Wir sehen uns morgen', 'morgen heute'), false);
  assert.equal(lib.matchText('irgendwas', '   '), false);
  assert.equal(lib.matchText(null, 'a'), false);
});

test('Dateinamen werden bereinigt', () => {
  assert.equal(lib.safeFileName('..\\..\\Windows\\evil.exe'), '_.._Windows_evil.exe');
  assert.equal(lib.safeFileName('a/b:c*?.txt'), 'a_b_c__.txt');
  assert.equal(lib.safeFileName('   '), 'Datei');
  assert.equal(lib.safeFileName('CON.txt'), '_CON.txt');
  const long = lib.safeFileName('x'.repeat(300) + '.pdf');
  assert.equal(long.length, 120);
  assert.ok(long.endsWith('.pdf'));
});

test('Gefährliche Dateien werden erkannt', () => {
  assert.equal(lib.isRiskyFile('setup.EXE'), true);
  assert.equal(lib.isRiskyFile('script.ps1'), true);
  assert.equal(lib.isRiskyFile('bericht.pdf'), false);
  assert.equal(lib.isRiskyFile('ohne-endung'), false);
  assert.equal(lib.fileIcon('a.pdf'), '📕');
  assert.equal(lib.fileIcon('a.unbekannt'), '📄');
});

test('Daten-URLs werden neutral und die Größe stimmt', () => {
  const data = Buffer.from('Hallo Welt!').toString('base64');
  const url = lib.toFileDataUrl('data:text/html;base64,' + data);
  assert.equal(url, lib.FILE_PREFIX + data);
  assert.equal(lib.dataUrlBytes(url), 11);
  assert.equal(lib.toFileDataUrl('kein data-url'), null);
});

test('Verschwindende Nachrichten: nur erlaubte Zeiten, Ablauf', () => {
  assert.equal(lib.validTimer(86400), 86400);
  assert.equal(lib.validTimer('604800'), 604800);
  assert.equal(lib.validTimer(0), 0);
  assert.equal(lib.validTimer(5), null);
  assert.equal(lib.validTimer('abc'), null);
  const now = Date.now();
  assert.equal(lib.isExpired({ ts: now - 86401000, exp: 86400 }, now), true);
  assert.equal(lib.isExpired({ ts: now - 1000, exp: 86400 }, now), false);
  assert.equal(lib.isExpired({ ts: now - 1e12 }, now), false);
  assert.equal(lib.timerLabel(604800), '7 Tage');
  assert.equal(lib.timerLabel(0), 'Aus');
});

test('Sicherheitsnummer: gleich auf beiden Seiten, 60 Ziffern, ändert sich mit dem Schlüssel', async () => {
  const ab = await lib.safetyNumber('AAAAAA', KEY_A, 'BBBBBB', KEY_B);
  const ba = await lib.safetyNumber('BBBBBB', KEY_B, 'AAAAAA', KEY_A);
  assert.equal(ab, ba);
  assert.match(ab, /^\d{60}$/);
  assert.equal(lib.groupDigits(ab).length, 12);
  const other = await lib.safetyNumber('AAAAAA', KEY_A, 'BBBBBB', { ...KEY_B, sign: { x: 'neu', y: 'by1' } });
  assert.notEqual(ab, other);
  assert.equal(await lib.safetyNumber('AAAAAA', KEY_A, 'BBBBBB', null), null);
});

test('Speicher-Verschlüsselung: hin und zurück, falscher Schlüssel scheitert', async () => {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const value = [{ id: '1', text: 'Geheim 🤫', ts: 123 }];
  const sealed = await lib.sealValue(key, value);
  assert.equal(lib.isSealed(sealed), true);
  assert.equal(lib.isSealed(value), false);
  assert.ok(!Buffer.from(sealed.ct).toString().includes('Geheim'));
  assert.deepEqual(await lib.openValue(key, sealed), value);
  const wrong = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  await assert.rejects(lib.openValue(wrong, sealed));
});

test('Backup: mit Passwort verschlüsselt, falsches Passwort und falsches Format erkannt', async () => {
  const payload = { v: 1, code: 'ABCDEF', chats: { 'u:XYZXYZ': [{ id: 'm1', text: 'Hi' }] } };
  const file = await lib.encryptBackup(payload, 'richtig-123');
  assert.ok(!file.includes('Hi'));
  assert.deepEqual(await lib.decryptBackup(file, 'richtig-123'), payload);
  await assert.rejects(lib.decryptBackup(file, 'falsch'), /password/);
  await assert.rejects(lib.decryptBackup('{"app":"etwas"}', 'x'), /format/);
  await assert.rejects(lib.decryptBackup('kein json', 'x'), /format/);
});

test('Base64 auch für große Daten', () => {
  const big = new Uint8Array(200000).map((_, i) => i % 256);
  assert.deepEqual(lib.unb64(lib.b64(big)), big);
});

test('Heartbeat: Online nur mit frischem Lebenszeichen (neue Versionen)', () => {
  const now = 100000;
  assert.equal(lib.connAlive(null, now), false);
  assert.equal(lib.connAlive({ open: false, hb: true, rx: now }, now), false);
  // Ältere Version ohne Heartbeat: offen = online
  assert.equal(lib.connAlive({ open: true, hb: false, rx: 0 }, now), true);
  assert.equal(lib.connAlive({ open: true, hb: true, rx: now - 1000 }, now), true);
  assert.equal(lib.connAlive({ open: true, hb: true, rx: now - lib.STALE_MS - 1 }, now), false);
});

test('Heartbeat: Verbindung erst nach unbeantwortetem Ping als tot', () => {
  const now = 100000, old = now - lib.STALE_MS - 1;
  assert.equal(lib.connDead({ open: false }, now), true);
  assert.equal(lib.connDead({ open: true, hb: false, rx: 0 }, now), false);
  assert.equal(lib.connDead({ open: true, hb: true, rx: now }, now), false);
  // Still, aber noch kein Ping gesendet (z. B. gerade aus dem Hintergrund zurück): erst nachfragen
  assert.equal(lib.connDead({ open: true, hb: true, rx: old }, now), false);
  assert.equal(lib.connDead({ open: true, hb: true, rx: old, ping: now - 1000 }, now), false);
  assert.equal(lib.connDead({ open: true, hb: true, rx: old, ping: now - lib.PROBE_MS }, now), true);
});

test('Rückkehr in den Vordergrund: Signal-Server neu verbinden', () => {
  assert.equal(lib.needsSignalReconnect(0, false), true);
  assert.equal(lib.needsSignalReconnect(2000, true), false);
  assert.equal(lib.needsSignalReconnect(60000, true), true);
});

test('withTimeout: hängende Promise blockiert nicht', async () => {
  assert.equal(await lib.withTimeout(new Promise(() => {}), 20, 'zu'), 'zu');
  assert.equal(await lib.withTimeout(Promise.resolve(7), 1000, 'zu'), 7);
});
