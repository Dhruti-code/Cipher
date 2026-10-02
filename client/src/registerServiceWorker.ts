/**
 * Service Worker Registration for PWA Installability
 */

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        if (import.meta.env.DEV) {
          console.log('[PWA] Service Worker registered successfully:', registration.scope);
        }

        // Listen for new service worker updates
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                if (import.meta.env.DEV) {
                  console.log('[PWA] New content is available; please reload.');
                }
              } else {
                if (import.meta.env.DEV) {
                  console.log('[PWA] Content is cached for offline use.');
                }
              }
            }
          });
        });
      })
      .catch((error) => {
        console.warn('[PWA] Service Worker registration failed:', error);
      });
  });
}
