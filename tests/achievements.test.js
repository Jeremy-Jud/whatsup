// Tests für die Erfolge (src/achievements.js) und WhatsUp Pro über 10'000 Nachrichten – ausführen mit: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
function loadAch() {
  const window = {};
  vm.runInNewContext(read('src/achievements.js'), { window });
  return window.CHATBOX_ACHIEVEMENTS;
}

test('Erfolge: IDs sind eindeutig und passen zum Server (ACH_ID_RE)', () => {
  const ach = loadAch();
  const ids = ach.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  ids.forEach((id) => assert.match(id, /^[a-z0-9_]{1,24}$/));
  ach.forEach((a) => assert.ok(a.goal > 0 && a.icon && a.title && a.desc && a.stat, a.id));
});

test("WhatsUp Pro: Erfolg für 10'000 gesendete Nachrichten", () => {
  const pro = loadAch().find((a) => a.id === 'msg10000');
  assert.ok(pro);
  assert.equal(pro.stat, 'sent');
  assert.equal(pro.goal, 10000);
});

test('WhatsUp Pro: App und Server meinen denselben Erfolg', () => {
  const idIn = (f) => (read(f).match(/const PRO_ACH = '([a-z0-9_]+)'/) || [])[1];
  assert.equal(idIn('src/app.js'), 'msg10000');
  assert.equal(idIn('relay/src/index.js'), 'msg10000');
});

test('Komplettist braucht alle anderen Erfolge', () => {
  const ach = loadAch();
  assert.equal(ach.find((a) => a.id === 'all').goal, ach.length - 1);
});
