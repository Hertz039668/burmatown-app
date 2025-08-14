// Phase D: Performance measurement helpers
// Lightweight utilities to record key client perf milestones and expose via events.

interface PerfMark { name: string; ts: number; data?: any }
const marks: PerfMark[] = [];
function add(name: string, data?: any) {
  const ts = performance.now();
  marks.push({ name, ts, data });
  try { window.dispatchEvent(new CustomEvent('bt_perf_mark', { detail: { name, ts, data } })); } catch {}
}

export function markAppStart() { add('app_start'); }
export function markFirstRender() { add('first_render'); }
export function markHydrated() { add('hydrated'); }
export function markCustom(name: string, data?: any) { add(name, data); }
export function getPerfMarks() { return [...marks]; }

// Optional: expose aggregated durations between marks
export function getPerfDurations() {
  const out: Record<string, number> = {};
  const byName: Record<string, PerfMark> = {};
  marks.forEach(m=> { byName[m.name]=m; });
  if(byName.app_start && byName.first_render) out['app_start->first_render'] = byName.first_render.ts - byName.app_start.ts;
  if(byName.first_render && byName.hydrated) out['first_render->hydrated'] = byName.hydrated.ts - byName.first_render.ts;
  if(byName.app_start && byName.hydrated) out['app_start->hydrated'] = byName.hydrated.ts - byName.app_start.ts;
  return out;
}
