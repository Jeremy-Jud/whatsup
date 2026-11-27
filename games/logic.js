// Kritzelpost – Spielregeln ohne Server-Kram (auch von den Tests genutzt).
//
// Jeder Spieler beginnt eine eigene „Kette“ mit einem Satz. Danach wandern die Ketten reihum:
// Runde 1 zeichnen, Runde 2 beschreiben, Runde 3 zeichnen … bis jeder an jeder Kette genau einmal dran war.
// Spieler i bearbeitet in Runde r die Kette (i - r) mod n. Damit sieht niemand je wieder seine eigene Kette,
// und jeder bekommt immer etwas, das ein anderer gerade gemacht hat.

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;
export const GRACE_MS = 3000; // nach Ablauf der Zeit: kurz warten, bis die automatisch abgeschickten Beiträge da sind

// Sekunden pro Runde
export const TIMERS = {
  kurz: { write: 40, draw: 60 },
  normal: { write: 60, draw: 100 },
  lang: { write: 90, draw: 160 },
};

export const kindOf = (round) => (round === 0 ? 'write' : round % 2 ? 'draw' : 'describe');
export const chainOf = (player, round, n) => (((player - round) % n) + n) % n;
export const secondsFor = (round, timer) => {
  const t = TIMERS[timer] || TIMERS.normal;
  return kindOf(round) === 'draw' ? t.draw : t.write;
};

export function shuffle(list, rnd = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
