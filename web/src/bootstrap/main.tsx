import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '../app/App';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import '../tailwind.css';

const syncVisualViewport = () => {
  const viewport = window.visualViewport;
  document.documentElement.style.setProperty(
    '--app-viewport-height',
    `${Math.round(viewport?.height || window.innerHeight)}px`,
  );
};
syncVisualViewport();
window.visualViewport?.addEventListener('resize', syncVisualViewport);
window.visualViewport?.addEventListener('scroll', syncVisualViewport);
window.addEventListener('orientationchange', syncVisualViewport);
document.addEventListener('focusin', (event) => {
  if (!window.matchMedia('(max-width: 800px)').matches) return;
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
  window.setTimeout(() => target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 180);
});

if (
  'serviceWorker' in navigator &&
  !['localhost', '127.0.0.1'].includes(window.location.hostname)
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
