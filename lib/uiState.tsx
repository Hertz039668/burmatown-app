import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getPerfDurations, getPerfMarks } from './perf';

export interface ToastItem { id: string; message: string; type?: 'info' | 'success' | 'error'; ttl?: number }
interface UIStateContextValue {
  loading: boolean;
  setLoading: (v: boolean) => void;
  toasts: ToastItem[];
  pushToast: (msg: string, opts?: Partial<Omit<ToastItem,'id'|'message'>>) => void;
  dismissToast: (id: string) => void;
  toggleMetrics: () => void;
}
const UIStateContext = createContext<UIStateContextValue | undefined>(undefined);

function uid() { return Math.random().toString(36).slice(2,9); }

export const UIStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((message: string, opts?: Partial<Omit<ToastItem,'id'|'message'>>) => {
    const item: ToastItem = { id: uid(), message, type: opts?.type || 'info', ttl: opts?.ttl || 4000 };
    setToasts(t => [...t, item]);
    if (item.ttl) setTimeout(() => setToasts(t => t.filter(x => x.id !== item.id)), item.ttl);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), []);

  const [metricsVisible, setMetricsVisible] = useState(false);
  const toggleMetrics = useCallback(()=> setMetricsVisible(v=>!v), []);
  return (
    <UIStateContext.Provider value={{ loading, setLoading, toasts, pushToast, dismissToast, toggleMetrics }}>
      {children}
      {metricsVisible && <MetricsOverlay onClose={()=>setMetricsVisible(false)} />}
    </UIStateContext.Provider>
  );
};

export function useUIState() {
  const ctx = useContext(UIStateContext);
  if(!ctx) throw new Error('useUIState must be used within UIStateProvider');
  return ctx;
}

// Simple overlay & toast portal component
export const UIOverlays: React.FC = () => {
  const { loading, toasts, dismissToast, toggleMetrics } = useUIState();
  // keyboard shortcut: Ctrl+Alt+M
  useEffect(()=>{
    const handler = (e: KeyboardEvent) => { if((e.ctrlKey||e.metaKey) && e.altKey && e.key.toLowerCase()==='m'){ e.preventDefault(); toggleMetrics(); } };
    window.addEventListener('keydown', handler);
    return ()=> window.removeEventListener('keydown', handler);
  }, [toggleMetrics]);
  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="px-4 py-2 rounded-md bg-black text-white text-sm shadow-lg animate-pulse">Loading…</div>
        </div>
      )}
      <div className="fixed z-[101] bottom-4 right-4 space-y-2 max-w-xs w-72">
        {toasts.map(t => (
          <div key={t.id} className={`px-3 py-2 rounded-md shadow text-sm cursor-pointer transition hover:shadow-lg bg-white border flex items-start gap-2 ${t.type==='success' ? 'border-green-400' : t.type==='error' ? 'border-red-400' : 'border-black/20'}`} onClick={()=>dismissToast(t.id)}>
            <span className={`text-[10px] font-semibold uppercase tracking-wide mt-0.5 ${t.type==='success' ? 'text-green-600' : t.type==='error' ? 'text-red-600' : 'text-black/60'}`}>{t.type}</span>
            <span className="flex-1 leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </>
  );
};

// ---- Metrics Overlay ----
const MetricsOverlay: React.FC<{ onClose: ()=>void }> = ({ onClose }) => {
  const [fetchEvents, setFetchEvents] = useState<any[]>([]);
  const [marks, setMarks] = useState(getPerfMarks());
  const [durations, setDurations] = useState(getPerfDurations());
  useEffect(()=>{
    const ft = (e:any)=> setFetchEvents(ev=> [...ev.slice(-199), e.detail]);
    const mk = (e:any)=> { setMarks(getPerfMarks()); setDurations(getPerfDurations()); };
    window.addEventListener('bt_fetch_timing', ft as any);
    window.addEventListener('bt_perf_mark', mk as any);
    return ()=> { window.removeEventListener('bt_fetch_timing', ft as any); window.removeEventListener('bt_perf_mark', mk as any); };
  }, []);
  return (
    <div className="fixed inset-0 z-[120] pointer-events-none">
      <div className="absolute top-4 right-4 w-[380px] max-h-[85vh] flex flex-col rounded-lg shadow-lg border bg-white/95 backdrop-blur p-3 text-xs pointer-events-auto">
        <div className="flex items-center justify-between mb-1">
          <div className="font-semibold text-sm">Runtime Metrics</div>
          <button onClick={onClose} className="text-[10px] uppercase tracking-wide px-2 py-1 rounded bg-black text-white">Close</button>
        </div>
        <div className="space-y-2 overflow-y-auto pr-1">
          <section>
            <div className="font-medium mb-1">Perf Marks</div>
            <ul className="space-y-0.5">
              {marks.map(m => <li key={m.name+String(m.ts)} className="flex justify-between"><span>{m.name}</span><span className="tabular-nums ml-2">{m.ts.toFixed(1)}ms</span></li>)}
            </ul>
            <div className="mt-1 text-[10px] opacity-70">Durations: {Object.entries(durations).map(([k,v])=> `${k}:${v.toFixed(1)}ms`).join(' | ')}</div>
          </section>
          <section>
            <div className="font-medium mb-1">Fetch (last {fetchEvents.length})</div>
            <ul className="divide-y border rounded bg-white max-h-40 overflow-auto">
              {fetchEvents.slice().reverse().map((f,i)=> (
                <li key={i} className="px-2 py-1 flex justify-between gap-2">
                  <span className="truncate max-w-[60%]" title={f.url}>{f.method} {new URL(f.url, location.href).pathname}</span>
                  <span className="tabular-nums">{f.durationMs?.toFixed(0)}ms{f.status?` ${f.status}`:''}</span>
                </li>
              ))}
              {fetchEvents.length===0 && <li className="px-2 py-1 text-[10px] opacity-60">No fetch yet</li>}
            </ul>
          </section>
          <section>
            <div className="font-medium mb-1">Shortcuts</div>
            <div className="text-[10px] opacity-70">Toggle: Ctrl+Alt+M</div>
          </section>
        </div>
      </div>
    </div>
  );
};
