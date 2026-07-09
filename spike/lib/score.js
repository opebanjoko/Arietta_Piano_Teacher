/**
 * Scores emitted NoteEvents against ground-truth strikes (SR-VER-01 gate math).
 *
 * events: [{ pitch, timestamp }], truth: [{ midi, atMs }]
 * Gate (PLAN.md Phase 0 exit): detection rate >= 95%, false events <= 1/10 min.
 */
export function score(events, truth, { durationMs, matchWindowMs = 500 } = {}) {
  const matched = new Set();
  const latencies = [];
  let falseEvents = 0;

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  for (const e of sorted) {
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < truth.length; i++) {
      if (matched.has(i) || truth[i].midi !== e.pitch) continue;
      const dist = Math.abs(e.timestamp - truth[i].atMs);
      if (dist <= matchWindowMs && dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    if (best >= 0) {
      matched.add(best);
      latencies.push(e.timestamp - truth[best].atMs);
    } else {
      falseEvents++;
    }
  }

  latencies.sort((a, b) => a - b);
  const latency = latencies.length
    ? {
        mean: latencies.reduce((s, l) => s + l, 0) / latencies.length,
        p95: latencies[Math.min(latencies.length - 1, Math.ceil(0.95 * latencies.length) - 1)],
        max: latencies[latencies.length - 1],
      }
    : { mean: null, p95: null, max: null };

  const total = truth.length;
  const detected = matched.size;
  const detectionRate = total === 0 ? 1 : detected / total;
  const falsePer10Min = durationMs > 0 ? (falseEvents * 600000) / durationMs : 0;

  return {
    total,
    detected,
    detectionRate,
    falseEvents,
    falsePer10Min,
    latency,
    pass: detectionRate >= 0.95 && falsePer10Min <= 1,
  };
}
