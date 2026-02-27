import { App } from '@capacitor/app';

export function initCapacitor(): void {
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });

  App.addListener('appUrlOpen', ({ url }) => {
    const parsed = new URL(url);
    if (parsed.hostname === 'aux.alvarotc.com') {
      window.location.href = parsed.pathname + parsed.search;
    }
  });
}
