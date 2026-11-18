// Tests für den Fragenkatalog des Millionen-Quiz – ausführen mit: npm test
const test = require('node:test');
const assert = require('node:assert');
const Q = require('../src/quiz-questions.js');

test('fünf Schwierigkeitsstufen mit genug Fragen für mehrere Runden', () => {
  assert.strictEqual(Q.length, 5);
  for (const tier of Q) assert.ok(tier.length >= 30, `nur ${tier.length} Fragen in einer Stufe`);
});

test('jede Frage hat vier verschiedene, nicht leere Antworten', () => {
  for (const q of Q.flat()) {
    assert.strictEqual(q.length, 5, q[0]);
    assert.ok(q.every((s) => typeof s === 'string' && s.trim()), q[0]);
    assert.strictEqual(new Set(q.slice(1).map((s) => s.toLowerCase())).size, 4, q[0]);
  }
});

test('keine Frage kommt doppelt vor', () => {
  const all = Q.flat().map((q) => q[0]);
  const dupes = all.filter((q, i) => all.indexOf(q) !== i);
  assert.deepStrictEqual(dupes, []);
});
