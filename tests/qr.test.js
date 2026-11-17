// QR-Codes erzeugen und mit dem mitgelieferten Scanner (jsQR) wieder lesen
const test = require('node:test');
const assert = require('node:assert');
const QR = require('../src/qr.js');
const jsQR = require('../src/vendor/jsQR.js');

function decode(q, scale = 4, border = 4) {
  const n = (q.size + border * 2) * scale;
  const px = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const v = q.get(Math.floor(x / scale) - border, Math.floor(y / scale) - border) ? 0 : 255;
      const i = (y * n + x) * 4;
      px[i] = px[i + 1] = px[i + 2] = v; px[i + 3] = 255;
    }
  }
  const r = jsQR(px, n, n);
  return r && r.data;
}

test('Freundes-Link als QR-Code ist lesbar', () => {
  const url = 'https://jeremy-jud.github.io/whatsup/?add=K7M2QX';
  const q = QR.encode(url, 'M');
  assert.strictEqual(q.size, q.version * 4 + 17);
  assert.strictEqual(decode(q), url);
});

test('Alle Fehlerkorrektur-Stufen, Umlaute und lange Texte', () => {
  for (const text of ['A', 'Grüße ✓', 'x'.repeat(150), 'y'.repeat(700)]) {
    for (const level of ['L', 'M', 'Q', 'H']) assert.strictEqual(decode(QR.encode(text, level)), text, `${level}: ${text.slice(0, 10)}`);
  }
});

test('SVG hat weißen Rand und schwarze Module', () => {
  const svg = QR.toSvg('WhatsUp');
  assert.match(svg, /^<svg [^>]*viewBox="0 0 29 29"/); // Version 1 (21) + 2 × 4 Rand
  assert.match(svg, /fill="#000"/);
});

test('Zu langer Text wirft einen Fehler', () => {
  assert.throws(() => QR.encode('z'.repeat(3000), 'H'));
});
