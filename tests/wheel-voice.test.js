// Tests für das Glücksrad und die Stimmeffekte: Prüfung eingehender Daten und faire Auflösung (SHA-256 Commit/Reveal).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
const grab = (re, what) => { const m = app.match(re); assert.ok(m, what + ' gefunden'); return m[0]; };

// wheelValid samt Konstanten aus app.js holen und für sich ausführen
function wheelValid() {
  const consts = grab(/const WHEEL_MAX = [^\n]*\n\s*const HEX32 = [^\n]*/, 'Glücksrad-Konstanten');
  const oneLine = grab(/const oneLine = [^\n]*/, 'oneLine');
  const fn = grab(/function wheelValid\(g\) \{[\s\S]*?\n {4}\}/, 'wheelValid');
  const f = vm.runInNewContext(`${consts}\n${oneLine}\n${fn}\nwheelValid`);
  return (g) => JSON.parse(JSON.stringify(f(g))); // Ergebnis aus dem anderen Kontext als normales Objekt
}
const C = 'a'.repeat(64);

test('Glücksrad: gültige Daten werden übernommen und bereinigt', () => {
  const v = wheelValid();
  const g = v({ k: 'wheel', q: '  Wer   zahlt? ', o: [' Anna ', '', 'Ben', 'x'.repeat(40)], c: C });
  assert.equal(g.q, 'Wer zahlt?');
  assert.deepEqual(g.o, ['Anna', 'Ben', 'x'.repeat(24)]);
  assert.equal(g.c, C);
  assert.equal(v({ o: ['a', 'b'], c: C }).q, 'Glücksrad');
});

test('Glücksrad: ungültige Daten werden abgelehnt', () => {
  const v = wheelValid();
  assert.equal(v({ o: ['nur eins'], c: C }), null);
  assert.equal(v({ o: ['a', 'b'], c: 'zz' }), null);
  assert.equal(v({ o: 'a,b', c: C }), null);
  assert.equal(v({ o: Array.from({ length: 30 }, (_, i) => 'F' + i), c: C }).o.length, 12);
});

test('Glücksrad: Ergebnis hängt von beiden Zufallszahlen ab und ist bei allen gleich', () => {
  // Gleiche Rechnung wie wheelSettle: Feld = erste 8 Hex-Zeichen von SHA-256(r|s) modulo Anzahl Felder
  assert.ok(app.includes("const h = await sha256(r + '|' + s);"));
  assert.ok(app.includes('i: parseInt(h.slice(0, 8), 16) % m.game.o.length'));
  const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
  const field = (r, s, n) => parseInt(sha(r + '|' + s).slice(0, 8), 16) % n;
  const r = crypto.randomBytes(16).toString('hex');
  const hits = new Set();
  for (let k = 0; k < 200; k++) hits.add(field(r, crypto.randomBytes(16).toString('hex'), 6));
  assert.equal(hits.size, 6, 'jede Zahl s kann jedes Feld treffen');
  const s = crypto.randomBytes(16).toString('hex');
  assert.equal(field(r, s, 6), field(r, s, 6));
});

test('Glücksrad: nur der Ersteller löst auf, wer erstellt hat, darf nicht drehen', () => {
  assert.ok(/if \(from !== m\.from \|\| !\(await wheelSettle/.test(app), 'Auflösung nur vom Ersteller');
  assert.ok(/if \(!HEX32\.test\(s\) \|\| !HEX32\.test\(r\) \|\| by === m\.from/.test(app), 'Ersteller zählt nicht als Dreher');
  assert.ok(/if \(\(await sha256\(r\)\) !== m\.game\.c\) return false;/.test(app), 'Geheimnis passt zum Fingerabdruck');
  assert.ok(app.includes("if (data.act === 'wheel') { minigames.wheelAct(chatId, from, data); return; }"));
});

test('Stimmeffekte: Liste, Prüfung beim Empfang und Leiste in der Aufnahme', () => {
  const list = vm.runInNewContext(grab(/\[\['', '🙂', 'Normal'\][^\n]*\]/, 'VOICE_FX'));
  assert.equal(list.map((f) => f[0]).join(','), ',helium,robot,monster');
  assert.ok(app.includes("const fx = VOICE_FX_IDS.includes(m.fx) ? m.fx : '';"), 'unbekannte Effekte werden verworfen');
  assert.ok(html.includes('id="recFx"'));
});
