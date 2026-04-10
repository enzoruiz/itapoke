export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const register = async () => {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (error) {
      console.error('Service worker registration failed', error);
    }
  };

  const scheduleRegister = () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        void register();
      }, { timeout: 1500 });
      return;
    }

    window.setTimeout(() => {
      void register();
    }, 0);
  };

  if (document.readyState === 'complete') {
    scheduleRegister();
    return;
  }

  window.addEventListener('load', scheduleRegister, { once: true });
}
