// Phase C: Client-side observability utilities.
// Provides instrumented fetch timing events and global error/rejection hooks.

export interface FetchTimingEventDetail {
  url: string;
  method: string;
  status?: number;
  ok?: boolean;
  durationMs: number;
  size?: number;
  error?: string;
  startedAt: number;
  endedAt: number;
}

// Dispatch helper (failsafe)
function dispatch(name: string, detail: any) {
  try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
}

// Instrumented fetch wrapper
export async function instrumentedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const startedAt = performance.now();
  const url = typeof input === 'string' ? input : (input as any).url || '';
  const method = (init?.method || 'GET').toUpperCase();
  try {
    const res = await fetch(input, init);
    const endedAt = performance.now();
    const clone = res.clone();
    let size: number | undefined;
    try { const buf = await clone.arrayBuffer(); size = buf.byteLength; } catch {}
    dispatch('bt_fetch_timing', {
      url, method, status: res.status, ok: res.ok, durationMs: endedAt - startedAt, size, startedAt, endedAt
    } satisfies FetchTimingEventDetail);
    return res;
  } catch (e: any) {
    const endedAt = performance.now();
    dispatch('bt_fetch_timing', { url, method, durationMs: endedAt - startedAt, error: e?.message||String(e), startedAt, endedAt } as FetchTimingEventDetail);
    throw e;
  }
}

// Optional: global installation (opt-in to avoid double wrapping). Called once from app root.
export function installGlobalUnhandledHandlers() {
  if(typeof window === 'undefined') return;
  if((window as any).__btUnhandledInstalled) return;
  (window as any).__btUnhandledInstalled = true;
  window.addEventListener('error', (ev) => {
    dispatch('bt_error', { message: ev.message, filename: (ev as any).filename, lineno: (ev as any).lineno, colno: (ev as any).colno });
  });
  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    dispatch('bt_unhandled_rejection', { reason: (ev.reason && (ev.reason.message || String(ev.reason))) || 'unknown' });
  });
}

// Lightweight in-memory metrics aggregator (can be queried for debugging / dev overlay)
interface MetricAccumulator { count: number; total: number; min: number; max: number; }
const metrics: Record<string, MetricAccumulator> = {};
export function recordFetchTiming(detail: FetchTimingEventDetail) {
  const key = detail.method + ' ' + (new URL(detail.url, window.location.href)).pathname;
  const m = metrics[key] || (metrics[key] = { count:0, total:0, min: Number.POSITIVE_INFINITY, max:0 });
  m.count++; m.total += detail.durationMs; m.min = Math.min(m.min, detail.durationMs); m.max = Math.max(m.max, detail.durationMs);
}
export function getMetricsSnapshot() {
  const out: Record<string, { count:number; avg:number; p95:number; min:number; max:number }> = {};
  for(const [k,m] of Object.entries(metrics)) {
    out[k] = { count: m.count, avg: m.total / m.count, p95: m.max, min: m.min, max: m.max };
  }
  return out;
}

// Auto-hook timing events into aggregator
if(typeof window !== 'undefined') {
  window.addEventListener('bt_fetch_timing', (e: any) => { if(e?.detail?.durationMs != null) recordFetchTiming(e.detail); });
}
