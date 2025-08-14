import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { markAppStart, markFirstRender } from './lib/perf'
const BurmaTown = React.lazy(()=> import('./app/BurmaTown.tsx'))
import { BrowserRouter, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

// Scroll + hash manager
function ScrollManager() {
  const location = useLocation();
  useEffect(() => {
    // Scroll to top on path change (ignore hash-only changes)
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (location.hash) {
      // Delay to allow DOM paint
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    }
  }, [location.pathname, location.hash]);
  return null;
}
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import { UIStateProvider, UIOverlays } from './lib/uiState'
import { I18nProvider, useI18n } from './lib/i18n'
import { installGlobalUnhandledHandlers } from './lib/observability'

installGlobalUnhandledHandlers();
markAppStart();
function AppRoot() {
  const { t, lang, setLang } = useI18n();
  if(typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    requestIdleCallback?.(()=> navigator.serviceWorker.register('/sw.js').catch(()=>{}));
  }
  return (
    <>
      <BrowserRouter>
        <ScrollManager />
        <nav aria-label="Primary" className="sr-only" />
        <div className="fixed top-2 right-2 z-50 flex gap-2 text-xs">
          <button onClick={()=> setLang(lang==='en'?'mm':'en')} className="px-2 py-1 bg-black/70 text-white rounded">
            {lang.toUpperCase()}
          </button>
        </div>
        <main id="app-main" role="main" className="min-h-screen focus:outline-none">
          <Suspense fallback={<div className="p-6 text-sm opacity-70" aria-live="polite">{t('app.loading')}</div>}>
            <BurmaTown />
          </Suspense>
        </main>
        <UIOverlays />
      </BrowserRouter>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <UIStateProvider>
          <AppRoot />
        </UIStateProvider>
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>
)

requestAnimationFrame(()=> markFirstRender());
