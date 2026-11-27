// Tests für den Punkte-Shop: Passt die Preisliste des Servers (relay: SHOP) zu den Rahmen, Bannern und Designs der App?
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

function shopList() {
  const m = read('relay/src/index.js').match(/const SHOP = (\{[\s\S]*?\});/);
  assert.ok(m, 'SHOP im Server gefunden');
  return vm.runInNewContext('(' + m[1] + ')');
}
function frames() {
  const window = {};
  vm.runInNewContext(read('src/frames.js'), { window });
  return { FRAMES: window.WHATSUP_FRAMES, BANNERS: window.WHATSUP_BANNERS };
}

test('Punkte-Shop: jeder Artikel existiert in der App und hat einen Preis', () => {
  const shop = shopList(), { FRAMES, BANNERS } = frames(), app = read('src/app.js');
  const entries = Object.entries(shop);
  assert.ok(entries.length > 0);
  for (const [id, price] of entries) {
    assert.ok(Number.isInteger(price) && price > 0, id);
    const [kind, key] = id.split(':');
    if (kind === 'frame') assert.ok(FRAMES[key] && FRAMES[key].locked, id);
    else if (kind === 'banner') assert.ok(BANNERS[key], id);
    else if (kind === 'design') assert.ok(app.includes(`['${key}', `) && new RegExp(`\\['${key}', '[^']+', 'pro'\\]`).test(app), id);
    else assert.fail('unbekannte Art: ' + id);
  }
});

test('Punkte-Shop: Pro-Sachen, Challenge- und Event-Belohnungen kann man nicht kaufen', () => {
  const shop = shopList(), { FRAMES, BANNERS } = frames();
  for (const id of Object.keys(shop)) {
    const [kind, key] = id.split(':');
    const item = kind === 'frame' ? FRAMES[key] : kind === 'banner' ? BANNERS[key] : {};
    assert.ok(kind !== 'design' && !item.pro && !item.challenge && !item.event, id);
  }
});
