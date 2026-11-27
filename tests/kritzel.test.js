// Tests für die Spielregeln von Kritzelpost (games/logic.js) – ausführen mit: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const load = () => import(pathToFileURL(path.join(__dirname, '..', 'games', 'logic.js')).href);

test('Kritzelpost: jeder ist an jeder Kette genau einmal dran', async () => {
  const { chainOf } = await load();
  for (let n = 2; n <= 12; n++) {
    for (let r = 0; r < n; r++) {
      // In jeder Runde bearbeitet jeder Spieler eine andere Kette
      const chains = new Set();
      for (let i = 0; i < n; i++) chains.add(chainOf(i, r, n));
      assert.equal(chains.size, n, `n=${n} r=${r}`);
    }
    for (let c = 0; c < n; c++) {
      // Jede Kette geht bei jedem Spieler genau einmal vorbei
      const players = new Set();
      for (let r = 0; r < n; r++) for (let i = 0; i < n; i++) if (chainOf(i, r, n) === c) players.add(i);
      assert.equal(players.size, n);
    }
  }
});

test('Kritzelpost: niemand bekommt etwas aus der eigenen Kette', async () => {
  const { chainOf } = await load();
  for (let n = 2; n <= 12; n++) {
    for (let i = 0; i < n; i++) {
      assert.equal(chainOf(i, 0, n), i); // Runde 0: eigener Anfangssatz
      for (let r = 1; r < n; r++) assert.notEqual(chainOf(i, r, n), i, `n=${n} i=${i} r=${r}`);
    }
  }
});

test('Kritzelpost: Rundenarten und Zeiten', async () => {
  const { kindOf, secondsFor, TIMERS } = await load();
  assert.deepEqual([0, 1, 2, 3, 4].map(kindOf), ['write', 'draw', 'describe', 'draw', 'describe']);
  assert.equal(secondsFor(0, 'normal'), TIMERS.normal.write);
  assert.equal(secondsFor(1, 'kurz'), TIMERS.kurz.draw);
  assert.equal(secondsFor(2, 'gibtsnicht'), TIMERS.normal.write);
});

test('Kritzelpost: Mischen behält alle Spieler', async () => {
  const { shuffle } = await load();
  const a = ['A', 'B', 'C', 'D', 'E'];
  const s = shuffle(a);
  assert.deepEqual([...s].sort(), a);
  assert.deepEqual(a, ['A', 'B', 'C', 'D', 'E']); // Original unverändert
});
